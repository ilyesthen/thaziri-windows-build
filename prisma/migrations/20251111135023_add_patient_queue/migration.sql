-- CreateTable
CREATE TABLE "patient_queue" (
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
    "status" TEXT NOT NULL DEFAULT 'pending'
);

-- CreateIndex
CREATE INDEX "patient_queue_to_user_id_status_idx" ON "patient_queue"("to_user_id", "status");

-- CreateIndex
CREATE INDEX "patient_queue_from_user_id_idx" ON "patient_queue"("from_user_id");

-- CreateIndex
CREATE INDEX "patient_queue_patient_code_idx" ON "patient_queue"("patient_code");

-- CreateIndex
CREATE INDEX "patient_queue_sent_at_idx" ON "patient_queue"("sent_at");
