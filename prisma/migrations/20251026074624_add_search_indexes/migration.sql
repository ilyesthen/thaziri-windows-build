-- CreateIndex
-- Add indexes on frequently searched columns for better performance
CREATE INDEX IF NOT EXISTS "Patient_firstName_idx" ON "Patient"("firstName");
CREATE INDEX IF NOT EXISTS "Patient_lastName_idx" ON "Patient"("lastName");
CREATE INDEX IF NOT EXISTS "Patient_fullName_idx" ON "Patient"("fullName");
CREATE INDEX IF NOT EXISTS "Patient_code_idx" ON "Patient"("code");
CREATE INDEX IF NOT EXISTS "Patient_phone_idx" ON "Patient"("phone");

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS "Patient_lastName_firstName_idx" ON "Patient"("lastName", "firstName");
