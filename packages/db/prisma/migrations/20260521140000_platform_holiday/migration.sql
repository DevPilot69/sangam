-- CreateTable
CREATE TABLE "PlatformHoliday" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformHoliday_date_key" ON "PlatformHoliday"("date");

-- CreateIndex
CREATE INDEX "PlatformHoliday_date_idx" ON "PlatformHoliday"("date");
