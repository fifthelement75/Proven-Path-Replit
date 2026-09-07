import { Router } from "express";
import { db, invitationsTable, employeesTable, companiesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { requireAdmin, signToken } from "../middlewares/auth";
import { sendInvitationEmail, getInviteLink } from "../lib/email";
import { logger } from "../lib/logger";
import { assertEmployeeSeat, requireTeamEntitlement } from "../lib/entitlements";
import { requireTeamPlan } from "../middlewares/requireActivePlan";

const router = Router();

const VALID_ROLES = ["admin", "manager", "employee"] as const;
type InviteRole = (typeof VALID_ROLES)[number];

const INVITE_TTL_DAYS = 7;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function effectiveStatus(inv: { status: string; expiresAt: Date | null }): string {
  if (inv.status === "pending" && inv.expiresAt && inv.expiresAt < new Date()) {
    return "expired";
  }
  return inv.status;
}

// ---- Admin: create an invitation -------------------------------------------
router.post("/invitations", requireAdmin, requireTeamPlan, async (req, res): Promise<void> => {
  const { companyId, employeeId, userId } = req.auth!;

  const email = String(req.body?.email || "").trim().toLowerCase();
  const userRole = String(req.body?.userRole || "employee").trim() as InviteRole;

  if (!email || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: "A valid email address is required" });
    return;
  }
  if (!VALID_ROLES.includes(userRole)) {
    res.status(400).json({ error: "Role must be admin, manager, or employee" });
    return;
  }

  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, companyId)).limit(1);
  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  if (company.email.toLowerCase() === email) {
    res.status(409).json({ error: "That email already owns this organization account" });
    return;
  }

  const existingEmp = await db
    .select({ id: employeesTable.id })
    .from(employeesTable)
    .where(and(eq(employeesTable.companyId, companyId), sql`lower(${employeesTable.email}) = ${email}`))
    .limit(1);
  if (existingEmp.length > 0) {
    res.status(409).json({ error: "Someone with that email is already a member of your organization" });
    return;
  }

  // Replace any prior pending invitation for the same email in this company.
  await db
    .delete(invitationsTable)
    .where(and(
      eq(invitationsTable.companyId, companyId),
      sql`lower(${invitationsTable.email}) = ${email}`,
      eq(invitationsTable.status, "pending"),
    ));

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  const [invitation] = await db
    .insert(invitationsTable)
    .values({
      companyId,
      email,
      userRole,
      token,
      status: "pending",
      invitedByUserId: userId,
      expiresAt,
    })
    .returning();

  let inviterName: string | null = null;
  if (employeeId) {
    const [inviter] = await db.select({ name: employeesTable.name }).from(employeesTable).where(eq(employeesTable.id, employeeId)).limit(1);
    inviterName = inviter?.name ?? null;
  }

  let emailSent = false;
  let emailError: string | undefined;
  try {
    await sendInvitationEmail({
      toEmail: email,
      companyName: company.name,
      inviterName,
      role: userRole,
      inviteLink: getInviteLink(token),
      expiresAt,
    });
    emailSent = true;
  } catch (err) {
    emailError = err instanceof Error ? err.message : String(err);
    logger.error({ err, email }, "Failed to send invitation email");
  }

  res.status(201).json({
    id: invitation.id,
    email: invitation.email,
    userRole: invitation.userRole,
    status: invitation.status,
    expiresAt: invitation.expiresAt?.toISOString() ?? null,
    createdAt: invitation.createdAt.toISOString(),
    inviteLink: getInviteLink(token),
    emailSent,
    emailError,
  });
});

// ---- Admin: list invitations -----------------------------------------------
router.get("/invitations", requireAdmin, requireTeamPlan, async (req, res): Promise<void> => {
  const { companyId } = req.auth!;
  const rows = await db
    .select()
    .from(invitationsTable)
    .where(eq(invitationsTable.companyId, companyId));

  res.json(
    rows
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(({ token: _t, ...inv }) => ({
        id: inv.id,
        email: inv.email,
        userRole: inv.userRole,
        status: effectiveStatus(inv),
        expiresAt: inv.expiresAt?.toISOString() ?? null,
        acceptedAt: inv.acceptedAt?.toISOString() ?? null,
        createdAt: inv.createdAt.toISOString(),
      })),
  );
});

// ---- Admin: revoke a pending invitation ------------------------------------
router.delete("/invitations/:id", requireAdmin, requireTeamPlan, async (req, res): Promise<void> => {
  const { companyId } = req.auth!;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid invitation id" });
    return;
  }
  const [inv] = await db
    .select()
    .from(invitationsTable)
    .where(and(eq(invitationsTable.id, id), eq(invitationsTable.companyId, companyId)))
    .limit(1);
  if (!inv) {
    res.status(404).json({ error: "Invitation not found" });
    return;
  }
  if (inv.status === "accepted") {
    res.status(409).json({ error: "This invitation has already been accepted" });
    return;
  }
  await db.delete(invitationsTable).where(eq(invitationsTable.id, id));
  res.json({ success: true });
});

// ---- Public: fetch invitation details by token -----------------------------
router.get("/invitations/accept/:token", async (req, res): Promise<void> => {
  const { token } = req.params;
  const [inv] = await db.select().from(invitationsTable).where(eq(invitationsTable.token, token)).limit(1);
  if (!inv) {
    res.status(404).json({ error: "This invitation link is invalid" });
    return;
  }
  if (inv.status === "accepted") {
    res.status(409).json({ error: "This invitation has already been accepted. Please log in instead." });
    return;
  }
  if (inv.status !== "pending") {
    res.status(410).json({ error: "This invitation is no longer active" });
    return;
  }
  if (inv.expiresAt && inv.expiresAt < new Date()) {
    res.status(410).json({ error: "This invitation has expired. Please ask an admin to send a new one." });
    return;
  }
  const [company] = await db.select({ name: companiesTable.name }).from(companiesTable).where(eq(companiesTable.id, inv.companyId)).limit(1);

  res.json({
    email: inv.email,
    userRole: inv.userRole,
    companyName: company?.name ?? "",
    expiresAt: inv.expiresAt?.toISOString() ?? null,
  });
});

// ---- Public: accept invitation (create member + log in) --------------------
router.post("/invitations/accept/:token", async (req, res): Promise<void> => {
  const { token } = req.params;
  const name = String(req.body?.name || "").trim();
  const password = String(req.body?.password || "");

  if (!name) {
    res.status(400).json({ error: "Your name is required" });
    return;
  }
  if (!password || password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const [inv] = await db.select().from(invitationsTable).where(eq(invitationsTable.token, token)).limit(1);
  if (!inv) {
    res.status(404).json({ error: "This invitation link is invalid" });
    return;
  }
  if (inv.status === "accepted") {
    res.status(409).json({ error: "This invitation has already been accepted. Please log in instead." });
    return;
  }
  if (inv.status !== "pending") {
    res.status(410).json({ error: "This invitation is no longer active" });
    return;
  }
  if (inv.expiresAt && inv.expiresAt < new Date()) {
    res.status(410).json({ error: "This invitation has expired. Please ask an admin to send a new one." });
    return;
  }

  // Guard against a member having been created with this email in the meantime.
  const existingEmp = await db
    .select({ id: employeesTable.id })
    .from(employeesTable)
    .where(and(eq(employeesTable.companyId, inv.companyId), sql`lower(${employeesTable.email}) = ${inv.email.toLowerCase()}`))
    .limit(1);
  if (existingEmp.length > 0) {
    res.status(409).json({ error: "An account with this email already exists. Please log in instead." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const today = new Date().toISOString().slice(0, 10);
  let emp: typeof employeesTable.$inferSelect;
  try {
    [emp] = await db.transaction(async (tx) => {
      const team = await requireTeamEntitlement(tx, inv.companyId);
      if (team !== "ok") {
        const error = new Error("This invitation requires an active Team plan.");
        (error as Error & { code?: string }).code = "team_plan_required";
        throw error;
      }
      const claimed = await tx.update(invitationsTable).set({ status: "accepted", acceptedAt: new Date() })
        .where(and(eq(invitationsTable.id, inv.id), eq(invitationsTable.status, "pending")))
        .returning({ id: invitationsTable.id });
      if (!claimed.length) {
        const error = new Error("This invitation has already been accepted. Please log in instead.");
        (error as Error & { code?: string }).code = "invite_claimed";
        throw error;
      }
      // Team invitations currently cannot consume a Professional seat, but the
      // check remains here to keep this creation boundary safe if plans change.
      await assertEmployeeSeat(tx, inv.companyId);
      return tx.insert(employeesTable).values({
        companyId: inv.companyId, name, email: inv.email, passwordHash,
        userRole: inv.userRole, role: "Team Member", department: "General",
        level: "Mid", startDate: today,
      }).returning();
    });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "team_plan_required" || code === "professional_seat_limit" || code === "team_seat_limit" || code === "invalid_seat_quantity" || code === "active_plan_required") {
      res.status(403).json({ error: (err as Error).message, code });
      return;
    }
    if (code === "invite_claimed") {
      res.status(409).json({ error: (err as Error).message });
      return;
    }
    throw err;
  }

  const [company] = await db.select({ name: companiesTable.name }).from(companiesTable).where(eq(companiesTable.id, inv.companyId)).limit(1);

  const authToken = signToken({
    companyId: emp.companyId,
    userId: emp.id,
    email: emp.email,
    role: emp.userRole,
    employeeId: emp.id,
  });

  res.status(201).json({
    token: authToken,
    user: {
      id: emp.id,
      email: emp.email,
      companyId: emp.companyId,
      companyName: company?.name ?? "",
      role: emp.userRole,
      employeeId: emp.id,
    },
  });
});

export default router;
