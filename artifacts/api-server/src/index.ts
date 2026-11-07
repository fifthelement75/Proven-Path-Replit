import app from "./app";
import { logger } from "./lib/logger";
import { startTrialReminderScheduler } from "./lib/trialReminders";
import { startPanelInviteReminderScheduler } from "./lib/panelInviteReminders";
import { ensurePanelInviteSchema } from "./lib/ensurePanelInviteSchema";
import { ensureBillingSchema } from "./lib/ensureBillingSchema";
import { ensureCustomerCredentialSchema } from "./lib/ensureCustomerCredentialSchema";
import { ensureIntegrationSyncSchema } from "./lib/ensureIntegrationSyncSchema";
import { startIntegrationSyncScheduler } from "./lib/integrationSync";
import { getCustomerCredentialReadiness, logCustomerCredentialReadiness } from "./lib/customerCredentialRotation";
import { connectEnvironment } from "./lib/pipedreamConnect";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function initStripe(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.warn("DATABASE_URL not set, skipping Stripe initialization");
    return;
  }
  try {
    const { runMigrations } = await import("stripe-replit-sync");
    const { getStripeSync } = await import("./lib/stripeClient");
    await runMigrations({ databaseUrl });
    const stripeSync = await getStripeSync();
    const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
    if (domain) {
      try {
        await stripeSync.findOrCreateManagedWebhook(`https://${domain}/api/stripe/webhook`);
      } catch (err) {
        logger.warn({ err }, "Failed to register managed Stripe webhook");
      }
    }
    stripeSync.syncBackfill().catch((err: unknown) => {
      logger.warn({ err }, "Stripe syncBackfill failed");
    });
    logger.info("Stripe initialized");
  } catch (err) {
    logger.warn({ err }, "Stripe initialization failed (continuing without Stripe)");
  }
}

async function reportCustomerCredentialReadiness(): Promise<void> {
  try {
    const report = await getCustomerCredentialReadiness({ environment: connectEnvironment() });
    logCustomerCredentialReadiness(report);
  } catch {
    // Keep startup available; report only a safe category, never exception details.
    logger.error(
      { category: "customer_credential_readiness_check_failed" },
      "Customer credential encryption readiness check failed",
    );
  }
}

async function main(): Promise<void> {
  // Guarantee the schema exists before accepting any API traffic.
  try {
    await ensurePanelInviteSchema();
    await ensureBillingSchema();
    await ensureCustomerCredentialSchema();
    await ensureIntegrationSyncSchema();
  } catch (err) {
    logger.error({ err }, "Failed to ensure required startup schema");
    process.exit(1);
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
    void reportCustomerCredentialReadiness();
    initStripe().catch((e) => logger.error({ err: e }, "initStripe failed"));
    startTrialReminderScheduler();
    startPanelInviteReminderScheduler();
    startIntegrationSyncScheduler();
  });
}

main().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
