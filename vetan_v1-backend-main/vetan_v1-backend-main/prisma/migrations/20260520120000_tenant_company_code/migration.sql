-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "companyCode" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "loginUsername" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_companyCode_key" ON "Tenant"("companyCode");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_loginUsername_key" ON "User"("tenantId", "loginUsername");
