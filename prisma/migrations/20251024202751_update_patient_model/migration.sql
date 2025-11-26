-- CreateTable
CREATE TABLE "Patient" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "recordNumber" INTEGER,
    "departmentCode" INTEGER,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "age" INTEGER,
    "dateOfBirth" DATETIME,
    "address" TEXT,
    "phone" TEXT,
    "code" TEXT,
    "usefulInfo" TEXT,
    "photo1" TEXT,
    "generalHistory" TEXT,
    "ophthalmoHistory" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "originalCreatedDate" TEXT
);

-- CreateIndex
CREATE INDEX "Patient_lastName_firstName_idx" ON "Patient"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "Patient_code_idx" ON "Patient"("code");
