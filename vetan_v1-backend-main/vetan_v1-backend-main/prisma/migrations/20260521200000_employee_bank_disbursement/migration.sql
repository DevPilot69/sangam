-- CreateEnum
CREATE TYPE "SalaryPaymentMethod" AS ENUM ('NEFT', 'RTGS', 'IMPS', 'CHEQUE', 'CASH');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "bankName" TEXT;
ALTER TABLE "Employee" ADD COLUMN "salaryPaymentMethod" "SalaryPaymentMethod" NOT NULL DEFAULT 'NEFT';

-- AlterTable
ALTER TABLE "PayrollRun" ADD COLUMN "disbursementPaymentMethod" "SalaryPaymentMethod" NOT NULL DEFAULT 'NEFT';
