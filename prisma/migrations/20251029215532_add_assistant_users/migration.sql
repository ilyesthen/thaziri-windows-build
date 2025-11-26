-- AlterTable
ALTER TABLE "assistant_sessions" ADD COLUMN "assistant_user_id" INTEGER;

-- CreateTable
CREATE TABLE "assistant_users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "full_name" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "percentage" INTEGER NOT NULL DEFAULT 0,
    "role" TEXT NOT NULL DEFAULT 'assistant',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "assistant_users_first_name_last_name_idx" ON "assistant_users"("first_name", "last_name");

-- CreateIndex
CREATE INDEX "assistant_users_full_name_idx" ON "assistant_users"("full_name");

-- CreateIndex
CREATE INDEX "assistant_sessions_assistant_user_id_idx" ON "assistant_sessions"("assistant_user_id");
