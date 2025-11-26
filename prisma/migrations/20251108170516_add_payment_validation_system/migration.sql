-- CreateTable
CREATE TABLE "payment_validations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patient_code" INTEGER NOT NULL,
    "patient_name" TEXT NOT NULL,
    "visit_date" TEXT NOT NULL,
    "visit_id" INTEGER,
    "total_amount" INTEGER NOT NULL,
    "selected_acts" TEXT NOT NULL,
    "validated_by" TEXT NOT NULL,
    "validated_by_user_id" INTEGER NOT NULL,
    "validated_by_role" TEXT NOT NULL,
    "validated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "payment_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "payment_id" INTEGER NOT NULL,
    "action_type" TEXT NOT NULL,
    "action_by" TEXT NOT NULL,
    "action_by_user_id" INTEGER NOT NULL,
    "action_by_role" TEXT NOT NULL,
    "action_details" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "payment_validations_patient_code_idx" ON "payment_validations"("patient_code");

-- CreateIndex
CREATE INDEX "payment_validations_visit_date_idx" ON "payment_validations"("visit_date");

-- CreateIndex
CREATE INDEX "payment_validations_validated_by_user_id_idx" ON "payment_validations"("validated_by_user_id");

-- CreateIndex
CREATE INDEX "payment_validations_validated_at_idx" ON "payment_validations"("validated_at");

-- CreateIndex
CREATE INDEX "payment_logs_payment_id_idx" ON "payment_logs"("payment_id");

-- CreateIndex
CREATE INDEX "payment_logs_action_by_user_id_idx" ON "payment_logs"("action_by_user_id");

-- CreateIndex
CREATE INDEX "payment_logs_timestamp_idx" ON "payment_logs"("timestamp");
