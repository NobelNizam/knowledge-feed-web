-- Phase 2.10 — composite indexes for hot read paths
-- Feed/personalized: WHERE domain IN (...) ORDER BY createdAt DESC
-- Trending:         WHERE createdAt >= 7d ORDER BY engagementScore DESC
-- Comment/View counts: WHERE cardId = ?
-- View lookups:     WHERE userId = ?

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_knowledge_cards_domain_created" ON "knowledge_cards"("domain", "created_at" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_knowledge_cards_created_engagement" ON "knowledge_cards"("created_at", "engagement_score" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_views_card_id" ON "views"("card_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_views_user_id" ON "views"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_comments_card_id" ON "comments"("card_id");
