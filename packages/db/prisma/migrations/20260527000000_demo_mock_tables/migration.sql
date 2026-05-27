-- CreateTable
CREATE TABLE "MockEmail" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "toEmail" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL DEFAULT 'no-reply@sangam.local',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT,
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockUpload" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "kind" TEXT NOT NULL,
    "ownerRef" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storage" TEXT NOT NULL DEFAULT 'mock',
    "url" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockUpload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MockEmail_tenantId_createdAt_idx" ON "MockEmail"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "MockEmail_toEmail_createdAt_idx" ON "MockEmail"("toEmail", "createdAt");

-- CreateIndex
CREATE INDEX "MockUpload_tenantId_kind_createdAt_idx" ON "MockUpload"("tenantId", "kind", "createdAt");
