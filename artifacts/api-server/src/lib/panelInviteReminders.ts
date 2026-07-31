import { db, panelInvitesTable, candidateProfilesTable } from "@workspace/db";
import { and, isNull, lte, gte, eq } from "drizzle-orm";
import { sendPanelInviteEmail, getPanelAssessmentLink } from "./email";
import { logger } from "./logger";

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // hourly

// Test-only hook, invoked after an invite is claimed and before dispatch
// revalidation. Lets tests deterministically interleave resend/completion.
let beforeDispatchHook: ((inviteId: number) => Promise<void>) | undefined;
export function __setBeforeDispatchHookForTests(hook: typeof beforeDispatchHook): void {
  beforeDispatchHook = hook;
}
const REMINDER_WINDOW_MS = 2 * 24 * 60 * 60 * 1000; // remind when < 2 days remain

export async function checkAndSendPanelInviteReminders(): Promise<void> {
  const now = new Date();
  const cutoff = new Date(now.getTime() + REMINDER_WINDOW_MS);

  const invites = await db.select().from(panelInvitesTable)
    .where(and(
      eq(panelInvitesTable.status, "pending"),
      isNull(panelInvitesTable.reminderSentAt),
      gte(panelInvitesTable.expiresAt, now),
      lte(panelInvitesTable.expiresAt, cutoff),
    ));

  for (const invite of invites) {
    try {
      // Atomically claim the reminder before sending: only one worker wins, and a
      // concurrently completed or resent (expiry-refreshed) invite is skipped.
      const [claimed] = await db.update(panelInvitesTable)
        .set({ reminderSentAt: new Date() })
        .where(and(
          eq(panelInvitesTable.id, invite.id),
          eq(panelInvitesTable.status, "pending"),
          isNull(panelInvitesTable.reminderSentAt),
          gte(panelInvitesTable.expiresAt, now),
          lte(panelInvitesTable.expiresAt, cutoff),
        ))
        .returning();
      if (!claimed) continue;

      const [candidate] = await db.select({ name: candidateProfilesTable.name })
        .from(candidateProfilesTable)
        .where(eq(candidateProfilesTable.id, claimed.candidateId)).limit(1);

      // Test-only injection point to deterministically exercise the claim→dispatch race.
      if (beforeDispatchHook) await beforeDispatchHook(claimed.id);

      // Revalidate immediately before dispatch. The expiry timestamp acts as a
      // generation token: a resend refreshes it (and clears reminderSentAt), a
      // completion changes status — either invalidates this in-flight claim.
      // Residual window: a completion that lands between this check and the
      // email provider call can still receive one reminder; that is harmless
      // (no state is corrupted, and the claim stays consumed).
      const [current] = await db.select({
        status: panelInvitesTable.status,
        reminderSentAt: panelInvitesTable.reminderSentAt,
        expiresAt: panelInvitesTable.expiresAt,
      })
        .from(panelInvitesTable)
        .where(eq(panelInvitesTable.id, claimed.id)).limit(1);
      const claimStillValid =
        current &&
        current.status === "pending" &&
        current.reminderSentAt !== null &&
        current.expiresAt?.getTime() === claimed.expiresAt?.getTime();
      if (!claimStillValid) {
        logger.info({ inviteId: claimed.id }, "Invite completed or resent before reminder dispatch; skipping");
        continue;
      }

      try {
        await sendPanelInviteEmail({
          toEmail: claimed.email,
          candidateName: candidate?.name ?? "a candidate",
          roleLabel: claimed.role,
          interviewDate: claimed.interviewDate,
          inviterName: null,
          assessmentLink: getPanelAssessmentLink(claimed.token),
          expiresAt: claimed.expiresAt,
          isReminder: true,
        });
        logger.info({ inviteId: claimed.id }, "Sent panel invite reminder email");
      } catch (err) {
        // Release the claim so the next hourly run retries the email.
        await db.update(panelInvitesTable)
          .set({ reminderSentAt: null })
          .where(eq(panelInvitesTable.id, claimed.id));
        throw err;
      }
    } catch (err) {
      logger.error({ err, inviteId: invite.id }, "Failed to send panel invite reminder email");
    }
  }
}

let started = false;
export function startPanelInviteReminderScheduler(): void {
  if (started) return;
  started = true;
  setTimeout(() => {
    checkAndSendPanelInviteReminders().catch((err) => logger.error({ err }, "Panel invite reminder check failed"));
  }, 45_000);
  setInterval(() => {
    checkAndSendPanelInviteReminders().catch((err) => logger.error({ err }, "Panel invite reminder check failed"));
  }, CHECK_INTERVAL_MS);
}
