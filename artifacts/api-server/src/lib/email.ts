import { Resend } from "resend";

interface ResendConnectionSettings {
  settings: {
    api_key: string;
    from_email: string;
  };
}

interface ConnectorsResponse {
  items?: ResendConnectionSettings[];
}

const RESEND_DEFAULT_SENDER = "ProvenPath <onboarding@resend.dev>";

const RESEND_VERIFIED_DOMAINS = new Set([
  "resend.dev",
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
