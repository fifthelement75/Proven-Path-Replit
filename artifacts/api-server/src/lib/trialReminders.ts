import { db, companiesTable } from "@workspace/db";
import { and, isNull, lte, gte, isNotNull, eq, or } from "drizzle-orm";
import { sendTrialReminderEmail } from "./email";
import { logger } from "./logger";

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // hourly

export async function checkAndSendTrialReminders(): Promise<void> {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const candidates = await db
    .select()
    .from(companiesTable)
    .where(
      and(
        isNull(companiesTable.trialReminderSentAt),
        isNotNull(companiesTable.trialEndsAt),
        gte(companiesTable.trialEndsAt, now),
        lte(companiesTable.trialEndsAt, in24h),
        or(eq(companiesTable.plan, "trial"), isNull(companiesTable.stripeSubscriptionId)),
      ),
    );

  for (const company of candidates) {
    try {
      await sendTrialReminderEmail({
        toEmail: company.email,
        companyName: company.name,
        trialEndsAt: company.trialEndsAt!,
      });
      await db
        .update(companiesTable)
        .set({ trialReminderSentAt: new Date() })
        .where(eq(companiesTable.id, company.id));
      logger.info({ companyId: company.id }, "Sent trial reminder email");
    } catch (err) {
      logger.error({ err, companyId: company.id }, "Failed to send trial reminder email");
    }
  }
}

let started = false;
export function startTrialReminderScheduler(): void {
  if (started) return;
  started = true;
  // Run shortly after startup, then on interval.
  setTimeout(() => {
    checkAndSendTrialReminders().catch((err) => logger.error({ err }, "Trial reminder check failed"));
  }, 30_000);
  setInterval(() => {
    checkAndSendTrialReminders().catch((err) => logger.error({ err }, "Trial reminder check failed"));
  }, CHECK_INTERVAL_MS);
}
