-- CreateEnum
CREATE TYPE "TenantLegalDocumentType" AS ENUM ('CERTIFICATE_OF_INCORPORATION', 'MEMORANDUM_ARTICLES', 'GST_REGISTRATION', 'PAN_ENTITY', 'SHOPS_AND_ESTABLISHMENTS', 'MSME_UDYAM', 'LABOUR_LICENSE', 'OTHER');

-- CreateTable
CREATE TABLE "TenantLegalDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentType" "TenantLegalDocumentType" NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "storedFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantLegalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantLegalDocument_tenantId_idx" ON "TenantLegalDocument"("tenantId");

-- AddForeignKey
ALTER TABLE "TenantLegalDocument" ADD CONSTRAINT "TenantLegalDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
