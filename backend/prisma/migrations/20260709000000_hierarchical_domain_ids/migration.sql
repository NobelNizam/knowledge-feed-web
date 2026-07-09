-- Drop old FKs: self-referential domain hierarchy + hashtag->domain
ALTER TABLE "domains" DROP CONSTRAINT IF EXISTS "domains_parent_domain_id_fkey";
ALTER TABLE "hashtags" DROP CONSTRAINT IF EXISTS "hashtags_domain_id_fkey";

-- Alter domains.parent_domain_id: int → varchar, nullable, unique
ALTER TABLE "domains" ALTER COLUMN "parent_domain_id" TYPE VARCHAR(10);
ALTER TABLE "domains" ALTER COLUMN "parent_domain_id" DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "domains_parent_domain_id_key" ON "domains"("parent_domain_id");

-- Rename + retype hashtags.domain_id -> hashtags.parent_domain_id (varchar)
ALTER TABLE "hashtags" RENAME COLUMN "domain_id" TO "parent_domain_id";
ALTER TABLE "hashtags" ALTER COLUMN "parent_domain_id" TYPE VARCHAR(10);
