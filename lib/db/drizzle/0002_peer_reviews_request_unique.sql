-- One review per peer-review request: backs the atomic claim in the submit route.
-- Idempotent and safe against any baseline.
CREATE UNIQUE INDEX IF NOT EXISTS "peer_reviews_request_id_unique" ON "peer_reviews" ("request_id");
