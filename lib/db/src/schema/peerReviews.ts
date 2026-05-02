import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { peerReviewRequestsTable } from "./peerReviewRequests";
import { employeesTable } from "./employees";
import { companiesTable } from "./companies";

export const peerReviewsTable = pgTable("peer_reviews", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => peerReviewRequestsTable.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "cascade" }),
  companyId: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  peerEmail: text("peer_email").notNull(),

  personalPlanningScore: text("personal_planning_score"),
  personalPlanningComment: text("personal_planning_comment"),

  trackPlanningScore: text("track_planning_score"),
  trackPlanningComment: text("track_planning_comment"),

  solutionDrivenScore: text("solution_driven_score"),
  solutionDrivenComment: text("solution_driven_comment"),

  teamLeadershipScore: text("team_leadership_score"),
  teamLeadershipComment: text("team_leadership_comment"),

  persuasionScore: text("persuasion_score"),
  persuasionComment: text("persuasion_comment"),

  crossFunctionalScore: text("cross_functional_score"),
  crossFunctionalComment: text("cross_functional_comment"),

  businessAlignmentScore: text("business_alignment_score"),
  businessAlignmentComment: text("business_alignment_comment"),

  customerCentricScore: text("customer_centric_score"),
  customerCentricComment: text("customer_centric_comment"),

  dataInformedScore: text("data_informed_score"),
  dataInformedComment: text("data_informed_comment"),

  promotionRecommendation: text("promotion_recommendation"),
  strengths: text("strengths"),
  areasToImprove: text("areas_to_improve"),

  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PeerReview = typeof peerReviewsTable.$inferSelect;
