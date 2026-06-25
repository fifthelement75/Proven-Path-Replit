import crypto from "crypto";
import { eq, and, sql } from "drizzle-orm";
import { db, invitationsTable, employeesTable, companiesTable } from "@workspace/db";
import { sendInvitationEmail, getInviteLink } from "./email";
import { logger } from "./logger";

export const INVITE_TTL_DAYS = 7;

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Persists a pending invitation for the given email, replacing any prior pending
 * invitation for the same email in the company. Returns the token + expiry so the
 * caller can deliver the email AFTER the surrounding transaction commits.
 */
export async function createInvitationRecord(
  tx: DbClient,
  opts: { companyId: number; email: string; userRole: string; invitedByUserId: number },
): Promise<{ token: string; expiresAt: Date }> {
  const email = opts.email.trim().toLowerCase();

  await tx
    .delete(invitationsTable)
    .where(and(
      eq(invitationsTable.companyId, opts.companyId),
      sql`lower(${invitationsTable.email}) = ${email}`,
      eq(invitationsTable.status, "pending"),
    ));

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  await tx.insert(invitationsTable).values({
    companyId: opts.companyId,
    email,
    userRole: opts.userRole,
    token,
    status: "pending",
    invitedByUserId: opts.invitedByUserId,
    expiresAt,
  });

  return { token, expiresAt };
}

/**
 * Delivers an invitation email. Looks up the inviter and company names for the
 * message body. Returns whether the email was delivered; never throws.
 */
export async function deliverInvitationEmail(opts: {
  companyId: number;
  email: string;
  userRole: string;
  token: string;
  expiresAt: Date;
  inviterEmployeeId?: number | null;
}): Promise<{ emailSent: boolean }> {
  const email = opts.email.trim().toLowerCase();

  let inviterName: string | null = null;
  if (opts.inviterEmployeeId) {
    const [inviter] = await db
      .select({ name: employeesTable.name })
      .from(employeesTable)
      .where(eq(employeesTable.id, opts.inviterEmployeeId))
      .limit(1);
    inviterName = inviter?.name ?? null;
  }

  const [company] = await db
    .select({ name: companiesTable.name })
    .from(companiesTable)
    .where(eq(companiesTable.id, opts.companyId))
    .limit(1);

  try {
    await sendInvitationEmail({
      toEmail: email,
      companyName: company?.name ?? "",
      inviterName,
      role: opts.userRole,
      inviteLink: getInviteLink(opts.token),
      expiresAt: opts.expiresAt,
    });
    return { emailSent: true };
  } catch (err) {
    logger.error({ err, email }, "Failed to send invitation email");
    return { emailSent: false };
  }
}
