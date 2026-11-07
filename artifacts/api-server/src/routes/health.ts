import { Router, type IRouter } from "express";
import { GetCustomerCredentialReadinessResponse, HealthCheckResponse } from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";
import { connectEnvironment } from "../lib/pipedreamConnect";
import { getCustomerCredentialReadiness } from "../lib/customerCredentialRotation";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/healthz/customer-credential-encryption", requireAdmin, async (req, res): Promise<void> => {
  res.set("Cache-Control", "no-store");
  try {
    const report = await getCustomerCredentialReadiness({
      environment: connectEnvironment(),
      companyId: req.auth!.companyId,
    });
    res.json(GetCustomerCredentialReadinessResponse.parse(report));
  } catch {
    logger.error(
      { category: "customer_credential_readiness_unavailable" },
      "Customer credential encryption readiness report is unavailable",
    );
    res.status(503).json({ error: "Credential readiness report is unavailable." });
  }
});

export default router;
