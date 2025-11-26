-- CreateTable
CREATE TABLE "comptes_rendus" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code_compte" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "titre_echodp" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "comptes_rendus_code_compte_key" ON "comptes_rendus"("code_compte");

-- CreateIndex
CREATE INDEX "comptes_rendus_code_compte_idx" ON "comptes_rendus"("code_compte");
