-- Align DB with schema when older DBs were created before these columns existed.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "npnNumber" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cardImageUrl" TEXT;
