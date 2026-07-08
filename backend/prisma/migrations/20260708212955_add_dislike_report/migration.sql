-- AlterTable: add dislike_count to knowledge_cards
ALTER TABLE "knowledge_cards" ADD COLUMN "dislike_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable: dislikes
CREATE TABLE "dislikes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dislikes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique user+card
CREATE UNIQUE INDEX "dislikes_user_id_card_id_key" ON "dislikes"("user_id", "card_id");

-- AddForeignKey
ALTER TABLE "dislikes" ADD CONSTRAINT "dislikes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dislikes" ADD CONSTRAINT "dislikes_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "knowledge_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: reports
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "reasons" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reports_user_id_card_id_key" ON "reports"("user_id", "card_id");
CREATE INDEX "reports_created_at_idx" ON "reports"("created_at");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "knowledge_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
