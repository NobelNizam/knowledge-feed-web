-- Drop unique constraint to allow multiple reports per user per card
ALTER TABLE "reports" DROP CONSTRAINT IF EXISTS "reports_user_id_card_id_key";
