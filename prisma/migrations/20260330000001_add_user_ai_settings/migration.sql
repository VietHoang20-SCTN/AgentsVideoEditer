-- AlterTable: add AI provider settings to User
ALTER TABLE "User" ADD COLUMN "aiApiKey" TEXT;
ALTER TABLE "User" ADD COLUMN "aiBaseUrl" TEXT;
