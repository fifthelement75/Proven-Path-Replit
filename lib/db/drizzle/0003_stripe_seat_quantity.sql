ALTER TABLE "companies"
ADD COLUMN IF NOT EXISTS "stripe_seat_quantity" integer;