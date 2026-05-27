-- AlterTable
ALTER TABLE "PayrollRun" ADD COLUMN "excludedEmployeeIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "PayrollRun" ADD COLUMN "ackWarnings" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PayrollRun" ADD COLUMN "ackWarningsReason" TEXT;
