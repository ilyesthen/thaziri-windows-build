-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_patient_queue" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patient_code" INTEGER NOT NULL,
    "patient_name" TEXT NOT NULL,
    "from_user_id" INTEGER NOT NULL,
    "from_user_name" TEXT NOT NULL,
    "from_user_role" TEXT NOT NULL,
    "to_user_id" INTEGER,
    "to_user_name" TEXT,
    "to_user_role" TEXT,
    "room_id" INTEGER,
    "room_name" TEXT,
    "action_type" TEXT,
    "action_label" TEXT,
    "is_urgent" BOOLEAN NOT NULL DEFAULT false,
    "visit_id" INTEGER,
    "sent_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seen_at" DATETIME,
    "completed_at" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "is_checked" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_patient_queue" ("action_label", "action_type", "completed_at", "from_user_id", "from_user_name", "from_user_role", "id", "is_urgent", "patient_code", "patient_name", "room_id", "room_name", "seen_at", "sent_at", "status", "to_user_id", "to_user_name", "to_user_role", "visit_id") SELECT "action_label", "action_type", "completed_at", "from_user_id", "from_user_name", "from_user_role", "id", "is_urgent", "patient_code", "patient_name", "room_id", "room_name", "seen_at", "sent_at", "status", "to_user_id", "to_user_name", "to_user_role", "visit_id" FROM "patient_queue";
DROP TABLE "patient_queue";
ALTER TABLE "new_patient_queue" RENAME TO "patient_queue";
CREATE INDEX "patient_queue_to_user_id_status_idx" ON "patient_queue"("to_user_id", "status");
CREATE INDEX "patient_queue_from_user_id_idx" ON "patient_queue"("from_user_id");
CREATE INDEX "patient_queue_patient_code_idx" ON "patient_queue"("patient_code");
CREATE INDEX "patient_queue_sent_at_idx" ON "patient_queue"("sent_at");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
