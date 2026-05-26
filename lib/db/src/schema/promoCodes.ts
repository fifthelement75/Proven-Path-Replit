import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const promoCodesTable = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  maxUses: integer("max_uses"),
  timesUsed: integer("times_used").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const promoCodeRedemptionsTable = pgTable("promo_code_redemptions", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  promoCodeId: integer("promo_code_id").notNull(),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PromoCode = typeof promoCodesTable.$inferSelect;
export type PromoCodeRedemption = typeof promoCodeRedemptionsTable.$inferSelect;
