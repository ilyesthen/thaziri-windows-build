-- CreateTable
CREATE TABLE "honoraires" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "patient_code" INTEGER NOT NULL,
    "acte_pratique" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "medecin" TEXT NOT NULL,
    "mt_assistant" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "honoraires_date_idx" ON "honoraires"("date");

-- CreateIndex
CREATE INDEX "honoraires_medecin_idx" ON "honoraires"("medecin");

-- CreateIndex
CREATE INDEX "honoraires_patient_code_idx" ON "honoraires"("patient_code");
