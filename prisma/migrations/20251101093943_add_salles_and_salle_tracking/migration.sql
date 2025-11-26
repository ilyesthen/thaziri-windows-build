-- AlterTable
ALTER TABLE "User" ADD COLUMN "current_salle_id" INTEGER;

-- AlterTable
ALTER TABLE "assistant_sessions" ADD COLUMN "salle_id" INTEGER;

-- CreateTable
CREATE TABLE "salles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "salles_name_key" ON "salles"("name");

-- CreateIndex
CREATE INDEX "assistant_sessions_salle_id_idx" ON "assistant_sessions"("salle_id");
