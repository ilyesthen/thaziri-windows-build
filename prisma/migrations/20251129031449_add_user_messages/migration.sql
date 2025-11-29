/*
  Warnings:

  - You are about to drop the `UserMessage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "UserMessage";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "user_messages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "from_user_id" INTEGER NOT NULL,
    "from_user_name" TEXT NOT NULL,
    "from_user_role" TEXT NOT NULL,
    "to_user_id" INTEGER NOT NULL,
    "to_user_name" TEXT NOT NULL,
    "to_user_role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "audio_data" TEXT,
    "is_voice_message" BOOLEAN NOT NULL DEFAULT false,
    "patient_code" INTEGER,
    "patient_name" TEXT,
    "visit_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sent_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seen_at" DATETIME,
    "is_urgent" BOOLEAN NOT NULL DEFAULT false
);

-- CreateIndex
CREATE INDEX "user_messages_to_user_id_status_idx" ON "user_messages"("to_user_id", "status");

-- CreateIndex
CREATE INDEX "user_messages_from_user_id_idx" ON "user_messages"("from_user_id");

-- CreateIndex
CREATE INDEX "user_messages_sent_at_idx" ON "user_messages"("sent_at");
