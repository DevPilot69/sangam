-- CreateEnum
CREATE TYPE "TenantPaymentStatus" AS ENUM ('PAID', 'UNPAID', 'OVERDUE', 'WAIVED');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "periodYear" INTEGER,
ADD COLUMN "periodMonth" INTEGER,
ADD COLUMN "paidAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Invoice_subscriptionId_createdAt_idx" ON "Invoice"("subscriptionId", "createdAt");

-- CreateTable
CREATE TABLE "TenantBillingOps" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "monthlyFeeInr" DECIMAL(14,2) NOT NULL,
    "monthlyServerCostInr" DECIMAL(14,2) NOT NULL,
    "paymentStatus" "TenantPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "lastPaidAt" TIMESTAMP(3),
    "billingNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantBillingOps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantBillingOps_tenantId_key" ON "TenantBillingOps"("tenantId");

-- AddForeignKey
ALTER TABLE "TenantBillingOps" ADD CONSTRAINT "TenantBillingOps_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
