-- AlterTable
ALTER TABLE "salles" ADD COLUMN "active_session_name" TEXT;
ALTER TABLE "salles" ADD COLUMN "active_user_id" INTEGER;
ALTER TABLE "salles" ADD COLUMN "active_user_name" TEXT;
ALTER TABLE "salles" ADD COLUMN "active_user_role" TEXT;
ALTER TABLE "salles" ADD COLUMN "locked_at" DATETIME;
