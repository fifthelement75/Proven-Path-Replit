import express, { type Express } from "express";
import cors from "cors";
import path from "node:path";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { processStripeWebhook } from "./lib/stripeWebhook";

const app: Express = express();
// Public requests arrive through one trusted Replit ingress proxy.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());

// Stripe webhook MUST be registered with raw body BEFORE express.json()
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      res.status(400).json({ error: "Missing signature" });
      return;
    }
    const sig = Array.isArray(signature) ? signature[0] : signature;
    try {
      await processStripeWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (err: any) {
      logger.error({ err: err?.message || err }, "Stripe webhook processing failed");
      res.status(400).json({ error: err?.message || "webhook error" });
    }
  },
);

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Serve the platform logo for use in transactional emails.
const repoRoot = path.resolve(process.cwd(), "..", "..");
app.use(
  "/api/assets",
  express.static(path.join(repoRoot, "attached_assets"), { maxAge: "7d" }),
);

app.use("/api", router);

export default app;
