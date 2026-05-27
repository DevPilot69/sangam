-- CreateEnum
CREATE TYPE "EmployeeOnboardingDocumentType" AS ENUM ('PAN_CARD', 'AADHAAR', 'ADDRESS_PROOF', 'BANK_PROOF', 'PHOTOGRAPH', 'OFFER_LETTER', 'EXPERIENCE_CERTIFICATE', 'EDUCATION_CERTIFICATE', 'OTHER');

-- CreateTable
CREATE TABLE "EmployeeOnboardingDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "documentType" "EmployeeOnboardingDocumentType" NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "storedFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeOnboardingDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmployeeOnboardingDocument_tenantId_employeeId_idx" ON "EmployeeOnboardingDocument"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "EmployeeOnboardingDocument_employeeId_idx" ON "EmployeeOnboardingDocument"("employeeId");

-- AddForeignKey
ALTER TABLE "EmployeeOnboardingDocument" ADD CONSTRAINT "EmployeeOnboardingDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeOnboardingDocument" ADD CONSTRAINT "EmployeeOnboardingDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
