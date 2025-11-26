/*
  Warnings:

  - You are about to drop the `MessageTemplate` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "Patient_phone_idx";

-- DropIndex
DROP INDEX "Patient_fullName_idx";

-- DropIndex
DROP INDEX "Patient_lastName_idx";

-- DropIndex
DROP INDEX "Patient_firstName_idx";

-- AlterTable
ALTER TABLE "User" ADD COLUMN "defaultPercentage" INTEGER;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "MessageTemplate";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "assistant_sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "assistant_name" TEXT NOT NULL,
    "percentage" INTEGER NOT NULL DEFAULT 0,
    "login_timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logout_timestamp" DATETIME
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_audit_log" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER,
    "user_role" TEXT,
    "session_name" TEXT,
    "action_type" TEXT,
    "details" TEXT
);
INSERT INTO "new_audit_log" ("action_type", "details", "id", "session_name", "timestamp", "user_id", "user_role") SELECT "action_type", "details", "id", "session_name", coalesce("timestamp", CURRENT_TIMESTAMP) AS "timestamp", "user_id", "user_role" FROM "audit_log";
DROP TABLE "audit_log";
ALTER TABLE "new_audit_log" RENAME TO "audit_log";
CREATE INDEX "audit_log_user_id_idx" ON "audit_log"("user_id");
CREATE INDEX "audit_log_timestamp_idx" ON "audit_log"("timestamp");
CREATE INDEX "audit_log_action_type_idx" ON "audit_log"("action_type");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "assistant_sessions_user_id_idx" ON "assistant_sessions"("user_id");

-- CreateIndex
CREATE INDEX "assistant_sessions_assistant_name_idx" ON "assistant_sessions"("assistant_name");
