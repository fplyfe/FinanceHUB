-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MEMBER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'MEMBER',
ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0;


-- Usuários existentes (criados no deploy) viram administradores
UPDATE "User" SET "role" = 'ADMIN';
