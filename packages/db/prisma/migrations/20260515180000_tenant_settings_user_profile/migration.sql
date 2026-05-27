-- Tenant workspace JSON settings + admin profile fields on User
ALTER TABLE "Tenant" ADD COLUMN "settings" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "phoneAlt" TEXT;
ALTER TABLE "User" ADD COLUMN "aadhar" TEXT;
ALTER TABLE "User" ADD COLUMN "pan" TEXT;
