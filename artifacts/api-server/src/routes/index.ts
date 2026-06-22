import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import companiesRouter from "./companies";
import employeesRouter from "./employees";
import reviewsRouter from "./reviews";
import feedbackRouter from "./feedback";
import devplanRouter from "./devplan";
import shareRouter from "./share";
import peerReviewsRouter from "./peerReviews";
import selfReflectionRouter from "./selfReflection";
import notificationsRouter from "./notifications";
import candidatesRouter from "./candidates";
import contactRouter from "./contact";
import stripeRouter from "./stripe";
import promoRouter from "./promo";
import integrationsRouter from "./integrations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(companiesRouter);
router.use(employeesRouter);
router.use(reviewsRouter);
router.use(feedbackRouter);
router.use(devplanRouter);
router.use(shareRouter);
router.use(peerReviewsRouter);
router.use(selfReflectionRouter);
router.use(notificationsRouter);
router.use(candidatesRouter);
router.use(contactRouter);
router.use(stripeRouter);
router.use(promoRouter);
router.use(integrationsRouter);

export default router;
