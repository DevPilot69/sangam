-- AlterTable
ALTER TABLE "AttendanceRecord" ADD COLUMN     "checkIn" TIMESTAMP(3),
ADD COLUMN     "checkOut" TIMESTAMP(3),
ADD COLUMN     "remarks" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN     "detail" JSONB;
