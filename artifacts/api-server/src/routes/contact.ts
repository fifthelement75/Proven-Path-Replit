import { Router, type IRouter } from "express";
import { sendContactDemoEmail } from "../lib/email";
import { logger } from "../lib/logger";
import { checkContactRequestQuota } from "../lib/contactRateLimit";

const router: IRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/contact", async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as Record<string, unknown>;

  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const company = typeof body.company === "string" ? body.company.trim() : "";
  const teamSize = typeof body.teamSize === "string" ? body.teamSize.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!firstName || !lastName) {
    res.status(400).json({ error: "First and last name are required." });
    return;
  }
  if (!email || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: "A valid work email is required." });
    return;
  }
  if (!company) {
    res.status(400).json({ error: "Company name is required." });
    return;
  }
  if (firstName.length > 80 || lastName.length > 80 || email.length > 200 || company.length > 200 || teamSize.length > 80 || message.length > 4000) {
    res.status(400).json({ error: "One of the fields is too long." });
    return;
  }

  let quota: { allowed: boolean; retryAfterSeconds: number };
  try {
    quota = await checkContactRequestQuota(req.ip || req.socket.remoteAddress || "unknown");
  } catch {
    // Fail closed so a store outage cannot silently remove the outbound-email cap.
    logger.error("Contact request rate limit unavailable");
    res.status(503).json({ error: "Contact requests are temporarily unavailable. Please try again later." });
    return;
  }
  if (!quota.allowed) {
    res.setHeader("Retry-After", String(quota.retryAfterSeconds));
    res.status(429).json({ error: "Please wait before submitting another request." });
    return;
  }

  try {
    await sendContactDemoEmail({ firstName, lastName, email, company, teamSize, message });
    res.json({ success: true });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    logger.error({ err: errorMessage }, "Contact demo email failed");
    res.status(500).json({ error: "We couldn't send your request right now. Please try again or email us directly." });
  }
});

export default router;
