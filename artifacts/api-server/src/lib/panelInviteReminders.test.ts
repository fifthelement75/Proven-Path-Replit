import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import crypto from "crypto";
import {
  db,
  companiesTable,
  candidateProfilesTable,
  panelInvitesTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

vi.mock("./email", () => ({
  sendPanelInviteEmail: vi.fn(),
  getPanelAssessmentLink: (token: string) => `https://example.test/panel-assessment/${token}`,
}));

import { sendPanelInviteEmail } from "./email";
import {
  checkAndSendPanelInviteReminders,
  __setBeforeDispatchHookForTests,
} from "./panelInviteReminders";

const mockedSend = vi.mocked(sendPanelInviteEmail);

let companyId: number;
let candidateId: number;
const createdInviteIds: number[] = [];

async function createInvite(overrides: Partial<typeof panelInvitesTable.$inferInsert> = {}) {
  const [invite] = await db.insert(panelInvitesTable).values({
    companyId,
    candidateId,
    invitedByUserId: 999999,
    email: `reminder-test-${crypto.randomBytes(4).toString("hex")}@example.com`,
    role: "software_engineer",
    level: "senior",
    interviewDate: "2026-07-30",
    token: crypto.randomBytes(32).toString("hex"),
    status: "pending",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // inside 2-day reminder window
    ...overrides,
  }).returning();
  createdInviteIds.push(invite.id);
  return invite;
}

beforeAll(async () => {
  const [company] = await db.insert(companiesTable).values({
    name: `__test_reminder_co_${Date.now()}`,
    email: `__test_reminder_co_${Date.now()}@example.com`,
    passwordHash: "test-hash",
  } as typeof companiesTable.$inferInsert).returning();
  companyId = company.id;

  const [candidate] = await db.insert(candidateProfilesTable).values({
    companyId,
    name: "Reminder Test Candidate",
    roleApplyingFor: "software_engineer",
  } as typeof candidateProfilesTable.$inferInsert).returning();
  candidateId = candidate.id;
});

afterAll(async () => {
  if (createdInviteIds.length) {
    await db.delete(panelInvitesTable).where(inArray(panelInvitesTable.id, createdInviteIds));
  }
  await db.delete(candidateProfilesTable).where(eq(candidateProfilesTable.id, candidateId));
  await db.delete(companiesTable).where(eq(companiesTable.id, companyId));
});

beforeEach(async () => {
  mockedSend.mockReset();
  __setBeforeDispatchHookForTests(undefined);
  // Isolate each test: clear invites created by previous tests in this file.
  if (createdInviteIds.length) {
    await db.delete(panelInvitesTable).where(inArray(panelInvitesTable.id, createdInviteIds));
    createdInviteIds.length = 0;
  }
});

describe("checkAndSendPanelInviteReminders", () => {
  it("sends a reminder for a pending invite expiring within 2 days and marks it sent", async () => {
    const invite = await createInvite();
    mockedSend.mockResolvedValueOnce(undefined);

    await checkAndSendPanelInviteReminders();

    expect(mockedSend).toHaveBeenCalledTimes(1);
    expect(mockedSend).toHaveBeenCalledWith(expect.objectContaining({
      toEmail: invite.email,
      isReminder: true,
      candidateName: "Reminder Test Candidate",
    }));
    const [after] = await db.select().from(panelInvitesTable).where(eq(panelInvitesTable.id, invite.id));
    expect(after.reminderSentAt).not.toBeNull();
  });

  it("sends only one reminder across repeated runs", async () => {
    await createInvite();
    mockedSend.mockResolvedValue(undefined);

    await checkAndSendPanelInviteReminders();
    await checkAndSendPanelInviteReminders();

    expect(mockedSend).toHaveBeenCalledTimes(1);
  });

  it("releases the claim when the email fails so the next run retries", async () => {
    const invite = await createInvite();
    mockedSend.mockRejectedValueOnce(new Error("smtp down"));

    await checkAndSendPanelInviteReminders();
    let [after] = await db.select().from(panelInvitesTable).where(eq(panelInvitesTable.id, invite.id));
    expect(after.reminderSentAt).toBeNull(); // claim released for retry

    mockedSend.mockResolvedValueOnce(undefined);
    await checkAndSendPanelInviteReminders();
    expect(mockedSend).toHaveBeenCalledTimes(2);
    [after] = await db.select().from(panelInvitesTable).where(eq(panelInvitesTable.id, invite.id));
    expect(after.reminderSentAt).not.toBeNull();
  });

  it("does not retry a reminder for an invite completed during a failed send", async () => {
    const invite = await createInvite();
    // Simulate the panelist completing the assessment while the email send is in flight and failing.
    mockedSend.mockImplementationOnce(async () => {
      await db.update(panelInvitesTable).set({ status: "completed" })
        .where(eq(panelInvitesTable.id, invite.id));
      throw new Error("send interrupted");
    });

    await checkAndSendPanelInviteReminders();
    expect(mockedSend).toHaveBeenCalledTimes(1);

    // Claim was released, but the next run must skip it because it is completed.
    await checkAndSendPanelInviteReminders();
    expect(mockedSend).toHaveBeenCalledTimes(1);
  });

  it("does not dispatch when a resend lands between claim and send (generation check)", async () => {
    const invite = await createInvite();
    __setBeforeDispatchHookForTests(async (inviteId) => {
      // Simulate the resend endpoint racing in after the claim: fresh expiry,
      // reminder flag cleared.
      await db.update(panelInvitesTable)
        .set({ expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), reminderSentAt: null })
        .where(eq(panelInvitesTable.id, inviteId));
    });

    await checkAndSendPanelInviteReminders();
    expect(mockedSend).not.toHaveBeenCalled();

    // The resent invite is eligible again once it re-enters the window.
    const [after] = await db.select().from(panelInvitesTable).where(eq(panelInvitesTable.id, invite.id));
    expect(after.reminderSentAt).toBeNull();
  });

  it("does not dispatch when completion lands between claim and send", async () => {
    const invite = await createInvite();
    __setBeforeDispatchHookForTests(async (inviteId) => {
      await db.update(panelInvitesTable)
        .set({ status: "completed" })
        .where(eq(panelInvitesTable.id, inviteId));
    });

    await checkAndSendPanelInviteReminders();
    expect(mockedSend).not.toHaveBeenCalled();

    const [after] = await db.select().from(panelInvitesTable).where(eq(panelInvitesTable.id, invite.id));
    expect(after.status).toBe("completed");
  });

  it("skips completed, expired, and far-future invites", async () => {
    await createInvite({ status: "completed" });
    await createInvite({ expiresAt: new Date(Date.now() - 60 * 60 * 1000) }); // already expired
    await createInvite({ expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) }); // > 2 days out

    await checkAndSendPanelInviteReminders();

    expect(mockedSend).not.toHaveBeenCalled();
  });
});
