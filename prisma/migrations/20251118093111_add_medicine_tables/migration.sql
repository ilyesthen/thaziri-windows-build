-- CreateTable
CREATE TABLE "medicines" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "libprep" TEXT NOT NULL,
    "nbpres" INTEGER NOT NULL DEFAULT 0,
    "actual_count" INTEGER NOT NULL DEFAULT 0,
    "nature" TEXT NOT NULL DEFAULT 'O',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "quantities" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "qtite" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ordonnances" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date_ord" TEXT,
    "patient_code" INTEGER NOT NULL,
    "age" INTEGER,
    "seq" INTEGER,
    "strait" TEXT,
    "strait1" TEXT,
    "strait2" TEXT,
    "strait3" TEXT,
    "medecin" TEXT,
    "seqpat" TEXT,
    "actex" TEXT,
    "actex1" TEXT,
    "actex2" TEXT,
    "addressed_by" TEXT,
    "titre_cr" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "medicines_code_key" ON "medicines"("code");

-- CreateIndex
CREATE INDEX "medicines_code_idx" ON "medicines"("code");

-- CreateIndex
CREATE INDEX "medicines_actual_count_idx" ON "medicines"("actual_count");

-- CreateIndex
CREATE INDEX "ordonnances_patient_code_idx" ON "ordonnances"("patient_code");

-- CreateIndex
CREATE INDEX "ordonnances_medecin_idx" ON "ordonnances"("medecin");

-- CreateIndex
CREATE INDEX "ordonnances_date_ord_idx" ON "ordonnances"("date_ord");
