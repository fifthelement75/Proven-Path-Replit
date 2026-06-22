import { Resend } from "resend";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { logger } from "./logger";

interface ResendConnectionSettings {
  settings: {
    api_key: string;
    from_email: string;
  };
}

interface ConnectorsResponse {
  items?: ResendConnectionSettings[];
}

const RESEND_DEFAULT_SENDER = "ProvenPath <info@provenpath.app>";

const RESEND_VERIFIED_DOMAINS = new Set([
  "resend.dev",
  "provenpath.app",
]);

function pickFromAddress(connectorFromEmail: string | undefined): string {
  const envOverride = process.env.RESEND_FROM_EMAIL?.trim();
  if (envOverride) return envOverride;

  const candidate = connectorFromEmail?.trim();
  if (candidate) {
    const match = candidate.match(/<([^>]+)>|([^\s<>]+@[^\s<>]+)/);
    const addr = (match?.[1] || match?.[2] || candidate).toLowerCase();
    const domain = addr.split("@")[1];
    if (domain && RESEND_VERIFIED_DOMAINS.has(domain)) {
      return candidate;
    }
  }

  return RESEND_DEFAULT_SENDER;
}

async function getCredentials(): Promise<{ apiKey: string; fromEmail: string }> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error("X-Replit-Token not found for repl/depl");
  }

  const response = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=resend",
    {
      headers: {
        Accept: "application/json",
        "X-Replit-Token": xReplitToken,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Connectors API returned ${response.status}`);
  }

  const data = (await response.json()) as ConnectorsResponse;
  const conn = data.items?.[0];

  if (!conn?.settings?.api_key) {
    throw new Error("Resend not connected");
  }

  return {
    apiKey: conn.settings.api_key,
    fromEmail: pickFromAddress(conn.settings.from_email),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const CONTACT_INBOX_FALLBACK = "peter.kattan@gmail.com";
const CONTACT_INBOX = process.env.CONTACT_INBOX_EMAIL?.trim() || CONTACT_INBOX_FALLBACK;
if (!process.env.CONTACT_INBOX_EMAIL) {
  logger.warn(
    { fallback: CONTACT_INBOX_FALLBACK },
    "CONTACT_INBOX_EMAIL is not set — Book-a-Demo leads will be routed to the fallback inbox.",
  );
}

export async function sendContactDemoEmail({
  firstName,
  lastName,
  email,
  company,
  teamSize,
  message,
}: {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  teamSize: string;
  message: string;
}): Promise<void> {
  const { apiKey, fromEmail } = await getCredentials();
  const client = new Resend(apiKey);

  const fullName = `${firstName} ${lastName}`.trim();
  const safeFullName = escapeHtml(fullName);
  const safeEmail = escapeHtml(email);
  const safeCompany = escapeHtml(company);
  const safeTeamSize = escapeHtml(teamSize || "Not provided");
  const safeMessage = escapeHtml(message || "(no message)").replace(/\n/g, "<br />");

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111827;">
  <h2 style="margin:0 0 8px;font-size:20px;">New Demo Request</h2>
  <p style="margin:0 0 16px;color:#374151;">Someone just submitted the Proven Path "Book a Demo" form.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
    <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600;width:140px;">Name</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${safeFullName}</td></tr>
    <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600;">Work email</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;"><a href="mailto:${safeEmail}" style="color:#2563eb;">${safeEmail}</a></td></tr>
    <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600;">Company</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${safeCompany}</td></tr>
    <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600;">Team size</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${safeTeamSize}</td></tr>
  </table>
  <h3 style="margin:24px 0 8px;font-size:15px;color:#111827;">What they're trying to solve</h3>
  <div style="padding:12px 16px;background:#f9fafb;border-left:3px solid #2563eb;border-radius:4px;color:#374151;line-height:1.5;">${safeMessage}</div>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
  <p style="margin:0;color:#9ca3af;font-size:12px;">Reply directly to this email to reach ${safeFullName} at ${safeEmail}.</p>
</body>
</html>`;

  const text = `New Demo Request — Proven Path

Name: ${fullName}
Work email: ${email}
Company: ${company}
Team size: ${teamSize || "Not provided"}

What they're trying to solve:
${message || "(no message)"}

Reply directly to this email to reach ${fullName} at ${email}.`;

  const result = await client.emails.send({
    from: fromEmail,
    to: CONTACT_INBOX,
    replyTo: email,
    subject: `Demo request from ${fullName} (${company})`,
    html,
    text,
  });

  if (result.error) {
    const msg = result.error.message || "";
    if (/domain is not verified/i.test(msg)) {
      throw new Error(
        "Email could not be sent because the configured sender domain is not verified with Resend."
      );
    }
    throw new Error(`Resend error: ${msg}`);
  }
}

export async function sendPeerReviewEmail({
  peerEmail,
  peerName,
  employeeName,
  reviewLink,
  expiresAt,
}: {
  peerEmail: string;
  peerName: string | null;
  employeeName: string;
  reviewLink: string;
  expiresAt: Date | null;
}): Promise<void> {
  const { apiKey, fromEmail } = await getCredentials();
  const client = new Resend(apiKey);

  const safePeerName = peerName ? escapeHtml(peerName) : null;
  const safeEmployeeName = escapeHtml(employeeName);
  const safeReviewLink = escapeHtml(reviewLink);

  const greeting = safePeerName ? `Hi ${safePeerName},` : "Hi,";
  const expiryNote = expiresAt
    ? `<p style="color:#6b7280;font-size:13px;">This link expires on ${escapeHtml(expiresAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }))}.</p>`
    : "";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111827;">
  <h2 style="margin:0 0 8px;font-size:20px;">Peer Review Request</h2>
  <p style="margin:0 0 16px;color:#374151;">${greeting}</p>
  <p style="margin:0 0 16px;color:#374151;">
    You've been asked to provide a peer review for <strong>${safeEmployeeName}</strong>.
    Your feedback is confidential and helps support their career development.
  </p>
  <p style="margin:0 0 24px;color:#374151;">
    Please click the button below to complete the short review form — it should take about 5 minutes.
  </p>
  <a href="${safeReviewLink}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;font-size:15px;">
    Complete Peer Review
  </a>
  <p style="margin:24px 0 4px;color:#6b7280;font-size:13px;">Or copy this link into your browser:</p>
  <p style="margin:0 0 16px;font-size:12px;color:#6b7280;word-break:break-all;">${safeReviewLink}</p>
  ${expiryNote}
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
  <p style="margin:0;color:#9ca3af;font-size:12px;">You received this email because someone requested a peer review. If you believe this was sent in error, you can safely ignore it.</p>
</body>
</html>`;

  const plainGreeting = peerName ? `Hi ${peerName},` : "Hi,";
  const expiryText = expiresAt
    ? `\n\nThis link expires on ${expiresAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.`
    : "";
  const text = `${plainGreeting}\n\nYou've been asked to provide a peer review for ${employeeName}.\n\nYour feedback is confidential and helps support their career development. Please complete the short review form here:\n\n${reviewLink}${expiryText}`;

  const result = await client.emails.send({
    from: fromEmail,
    to: peerEmail,
    subject: `Peer Review Request for ${employeeName}`,
    html,
    text,
  });

  if (result.error) {
    const msg = result.error.message || "";
    if (/domain is not verified/i.test(msg)) {
      throw new Error(
        "Email could not be sent because the configured sender domain is not verified with Resend. " +
          "Verify a domain at https://resend.com/domains and set RESEND_FROM_EMAIL to an address on it, " +
          "or share the link manually below."
      );
    }
    throw new Error(`Resend error: ${msg}`);
  }
}

export function getPeerReviewLink(token: string): string {
  const base =
    process.env.APP_PUBLIC_URL ||
    (process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : null);
  if (!base) {
    throw new Error(
      "Cannot construct review link: set APP_PUBLIC_URL environment variable"
    );
  }
  return `${base.replace(/\/$/, "")}/peer-review/${token}`;
}

export function getInviteLink(token: string): string {
  const base =
    process.env.APP_PUBLIC_URL ||
    (process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : null);
  if (!base) {
    throw new Error(
      "Cannot construct invite link: set APP_PUBLIC_URL environment variable"
    );
  }
  return `${base.replace(/\/$/, "")}/accept-invite/${token}`;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  manager: "Manager",
  employee: "Employee",
};

export async function sendInvitationEmail({
  toEmail,
  companyName,
  inviterName,
  role,
  inviteLink,
  expiresAt,
}: {
  toEmail: string;
  companyName: string;
  inviterName: string | null;
  role: string;
  inviteLink: string;
  expiresAt: Date | null;
}): Promise<void> {
  const { apiKey, fromEmail } = await getCredentials();
  const client = new Resend(apiKey);

  const safeCompany = escapeHtml(companyName);
  const safeInviter = inviterName ? escapeHtml(inviterName) : safeCompany;
  const safeRole = escapeHtml(ROLE_LABELS[role] ?? role);
  const safeLink = escapeHtml(inviteLink);
  const expiryNote = expiresAt
    ? `<p style="color:#6b7280;font-size:13px;">This invitation expires on ${escapeHtml(expiresAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }))}.</p>`
    : "";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111827;">
  <h2 style="margin:0 0 8px;font-size:20px;">You're invited to ${safeCompany} on Proven Path</h2>
  <p style="margin:0 0 16px;color:#374151;">Hi,</p>
  <p style="margin:0 0 16px;color:#374151;">
    ${safeInviter} has invited you to join <strong>${safeCompany}</strong> on Proven Path as a <strong>${safeRole}</strong>.
  </p>
  <p style="margin:0 0 24px;color:#374151;">
    Click the button below to set up your account and get started.
  </p>
  <a href="${safeLink}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;font-size:15px;">
    Accept Invitation
  </a>
  <p style="margin:24px 0 4px;color:#6b7280;font-size:13px;">Or copy this link into your browser:</p>
  <p style="margin:0 0 16px;font-size:12px;color:#6b7280;word-break:break-all;">${safeLink}</p>
  ${expiryNote}
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
  <p style="margin:0;color:#9ca3af;font-size:12px;">You received this email because someone invited you to Proven Path. If you weren't expecting this, you can safely ignore it.</p>
</body>
</html>`;

  const text = `Hi,\n\n${inviterName || companyName} has invited you to join ${companyName} on Proven Path as a ${ROLE_LABELS[role] ?? role}.\n\nAccept your invitation and set up your account here:\n${inviteLink}${expiresAt ? `\n\nThis invitation expires on ${expiresAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.` : ""}`;

  const result = await client.emails.send({
    from: fromEmail,
    to: toEmail,
    subject: `You're invited to join ${companyName} on Proven Path`,
    html,
    text,
  });

  if (result.error) {
    const msg = result.error.message || "";
    if (/domain is not verified/i.test(msg)) {
      throw new Error(
        "Email could not be sent because the configured sender domain is not verified with Resend. " +
          "Verify a domain at https://resend.com/domains and set RESEND_FROM_EMAIL to an address on it, " +
          "or share the invite link manually below."
      );
    }
    throw new Error(`Resend error: ${msg}`);
  }
}

export function getSelfReflectionLink(token: string): string {
  const base =
    process.env.APP_PUBLIC_URL ||
    (process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : null);
  if (!base) {
    throw new Error(
      "Cannot construct self-reflection link: set APP_PUBLIC_URL environment variable"
    );
  }
  return `${base.replace(/\/$/, "")}/self-reflection/${token}`;
}

export async function sendSelfReflectionEmail({
  employeeEmail,
  employeeName,
  managerName,
  message,
  reflectionLink,
  expiresAt,
}: {
  employeeEmail: string;
  employeeName: string;
  managerName: string | null;
  message: string | null;
  reflectionLink: string;
  expiresAt: Date | null;
}): Promise<void> {
  const { apiKey, fromEmail } = await getCredentials();
  const client = new Resend(apiKey);

  const safeEmployeeName = escapeHtml(employeeName);
  const safeManagerName = escapeHtml(managerName || "Your manager");
  const safeMessage = message ? escapeHtml(message).replace(/\n/g, "<br />") : "";
  const safeLink = escapeHtml(reflectionLink);
  const greeting = `Hi ${safeEmployeeName.split(" ")[0] || "there"},`;
  const expiryNote = expiresAt
    ? `<p style="margin:0 0 8px;color:#6b7280;font-size:13px;">This link expires on <strong>${escapeHtml(expiresAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }))}</strong>.</p>`
    : "";
  const messageBlock = safeMessage
    ? `<div style="margin:16px 0;padding:12px 16px;background:#f3f4f6;border-left:3px solid #2563eb;border-radius:4px;color:#374151;font-size:14px;"><strong>${safeManagerName} says:</strong><br />${safeMessage}</div>`
    : "";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111827;">
  <h2 style="margin:0 0 8px;font-size:20px;">Self-Reflection Request</h2>
  <p style="margin:0 0 16px;color:#374151;">${greeting}</p>
  <p style="margin:0 0 16px;color:#374151;">
    ${safeManagerName} has invited you to complete a short self-reflection on Proven Path. Your responses help shape your development plan and your own career growth.
  </p>
  ${messageBlock}
  <p style="margin:0 0 24px;color:#374151;">
    Please click the button below to complete the form — it should take about 10 minutes.
  </p>
  <a href="${safeLink}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;font-size:15px;">
    Complete Self-Reflection
  </a>
  <p style="margin:24px 0 4px;color:#6b7280;font-size:13px;">Or copy this link into your browser:</p>
  <p style="margin:0 0 16px;font-size:12px;color:#6b7280;word-break:break-all;">${safeLink}</p>
  ${expiryNote}
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
  <p style="margin:0;color:#9ca3af;font-size:12px;">You received this email because your manager invited you to complete a self-reflection. If you believe this was sent in error, you can safely ignore it.</p>
</body>
</html>`;

  const text = `${greeting}\n\n${managerName || "Your manager"} has invited you to complete a self-reflection on Proven Path.\n\n${message ? `Note from your manager:\n${message}\n\n` : ""}Complete the form here:\n${reflectionLink}${expiresAt ? `\n\nThis link expires on ${expiresAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.` : ""}`;

  const result = await client.emails.send({
    from: fromEmail,
    to: employeeEmail,
    subject: `Self-reflection request from ${managerName || "your manager"}`,
    html,
    text,
  });

  if (result.error) {
    const msg = result.error.message || "";
    if (/domain is not verified/i.test(msg)) {
      throw new Error(
        "Email could not be sent because the configured sender domain is not verified with Resend. " +
          "Verify a domain at https://resend.com/domains and set RESEND_FROM_EMAIL to an address on it, " +
          "or share the link manually below."
      );
    }
    throw new Error(`Resend error: ${msg}`);
  }
}

const LOGO_FILENAME = "ProvenPath_Logo_1777766610872.png";

function loadLogoBase64(): string | null {
  const candidates = [
    path.resolve(process.cwd(), "..", "..", "attached_assets", LOGO_FILENAME),
    path.resolve(process.cwd(), "attached_assets", LOGO_FILENAME),
    path.resolve("/home/runner/workspace/attached_assets", LOGO_FILENAME),
  ];
  for (const p of candidates) {
    try {
      if (existsSync(p)) {
        const buf = readFileSync(p);
        return buf.toString("base64");
      }
    } catch {
      // continue
    }
  }
  return null;
}

function marketingFooterHtml(): string {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
    <tr><td style="padding:24px 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-family:Inter,Arial,sans-serif;font-size:13px;color:#6b7280;line-height:1.6;vertical-align:top;width:60%;">
            <div style="font-weight:600;color:#111827;margin-bottom:6px;">Proven Path</div>
            Performance intelligence for modern HR teams.
          </td>
          <td style="font-family:Inter,Arial,sans-serif;font-size:13px;color:#6b7280;line-height:1.6;vertical-align:top;text-align:right;">
            <a href="https://provenpath.app/marketing/" style="color:#2563eb;text-decoration:none;margin-right:12px;">Product</a>
            <a href="https://provenpath.app/marketing/pricing" style="color:#2563eb;text-decoration:none;margin-right:12px;">Pricing</a>
            <a href="https://provenpath.app/marketing/contact" style="color:#2563eb;text-decoration:none;">Contact</a>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding-top:16px;border-top:1px solid #e5e7eb;font-family:Inter,Arial,sans-serif;font-size:12px;color:#9ca3af;">
            © 2026 Proven Path. All rights reserved. &nbsp;·&nbsp;
            <a href="mailto:info@provenpath.app" style="color:#9ca3af;">info@provenpath.app</a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>`;
}

export async function sendTrialReminderEmail({
  toEmail,
  companyName,
  trialEndsAt,
}: {
  toEmail: string;
  companyName: string;
  trialEndsAt: Date;
}): Promise<void> {
  const { apiKey, fromEmail } = await getCredentials();
  const client = new Resend(apiKey);

  const safeCompany = escapeHtml(companyName);
  const endDate = trialEndsAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const billingUrl = `https://${(process.env.REPLIT_DOMAINS || "provenpath.app").split(",")[0]}/billing`;
  const logoBase64 = loadLogoBase64();
  const logoHtml = logoBase64
    ? `<img src="cid:provenpath-logo" alt="Proven Path" height="44" style="display:block;height:44px;width:auto;" />`
    : `<div style="font-family:Inter,Arial,sans-serif;font-size:22px;font-weight:700;color:#2563eb;">Proven Path</div>`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Inter,Arial,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
    <tr><td style="padding:32px 32px 0;">${logoHtml}</td></tr>
    <tr><td style="padding:24px 32px 0;">
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">Your Proven Path trial ends tomorrow</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
        Hi there,
      </p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
        This is a friendly reminder that <strong>${safeCompany}</strong>'s 7-day free trial of Proven Path ends on
        <strong>${escapeHtml(endDate)}</strong>. To keep access to features beyond the free tier — including AI development plans,
        candidate scoring, peer reviews, and self-reflections — please subscribe before your trial ends.
      </p>
      <p style="margin:24px 0;text-align:center;">
        <a href="${billingUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">
          Subscribe now
        </a>
      </p>
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Or copy this link into your browser:</p>
      <p style="margin:0 0 16px;font-size:12px;color:#6b7280;word-break:break-all;">${billingUrl}</p>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;">
        After your trial ends, your data stays safe — you'll just need an active subscription to use Pro features again.
      </p>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#374151;">
        Questions? Just reply to this email.
      </p>
    </td></tr>
    <tr><td>${marketingFooterHtml()}</td></tr>
  </table>
</body>
</html>`;

  const text = `Hi,\n\nThis is a friendly reminder that ${companyName}'s 7-day free trial of Proven Path ends on ${endDate}.\n\nTo keep access to Pro features, subscribe here:\n${billingUrl}\n\nQuestions? Just reply to this email.\n\n— The Proven Path team`;

  const result = await client.emails.send({
    from: fromEmail,
    to: toEmail,
    subject: `Your Proven Path trial ends tomorrow`,
    html,
    text,
    ...(logoBase64
      ? {
          attachments: [
            {
              filename: "provenpath-logo.png",
              content: logoBase64,
              content_id: "provenpath-logo",
            } as any,
          ],
        }
      : {}),
  });

  if (result.error) {
    throw new Error(`Resend error: ${result.error.message || "unknown"}`);
  }
}
