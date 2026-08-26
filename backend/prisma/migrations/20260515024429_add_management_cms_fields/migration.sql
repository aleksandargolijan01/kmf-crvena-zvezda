/*
  Warnings:

  - You are about to drop the column `bio` on the `BoardMember` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `BoardMember` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `BoardMember` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `BoardMember` table. All the data in the column will be lost.
  - You are about to drop the column `sortOrder` on the `BoardMember` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `BoardMember` table. All the data in the column will be lost.
  - You are about to drop the column `bio` on the `ManagementMember` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `ManagementMember` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `ManagementMember` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `ManagementMember` table. All the data in the column will be lost.
  - You are about to drop the column `sortOrder` on the `ManagementMember` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `ManagementMember` table. All the data in the column will be lost.
  - Added the required column `fullName` to the `BoardMember` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fullName` to the `ManagementMember` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role_sr` to the `ManagementMember` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "BoardMember_isActive_sortOrder_idx";

-- DropIndex
DROP INDEX "ManagementMember_isActive_sortOrder_idx";

-- AlterTable
ALTER TABLE "BoardMember" DROP COLUMN "bio",
DROP COLUMN "firstName",
DROP COLUMN "isActive",
DROP COLUMN "lastName",
DROP COLUMN "sortOrder",
DROP COLUMN "title",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "bio_en" TEXT,
ADD COLUMN     "bio_ru" TEXT,
ADD COLUMN     "bio_sr" TEXT,
ADD COLUMN     "fullName" TEXT NOT NULL,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "role_en" TEXT,
ADD COLUMN     "role_ru" TEXT,
ADD COLUMN     "role_sr" TEXT NOT NULL DEFAULT 'Члан управног одбора';

-- AlterTable
ALTER TABLE "ManagementMember" DROP COLUMN "bio",
DROP COLUMN "firstName",
DROP COLUMN "isActive",
DROP COLUMN "lastName",
DROP COLUMN "sortOrder",
DROP COLUMN "title",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "bio_en" TEXT,
ADD COLUMN     "bio_ru" TEXT,
ADD COLUMN     "bio_sr" TEXT,
ADD COLUMN     "fullName" TEXT NOT NULL,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "role_en" TEXT,
ADD COLUMN     "role_ru" TEXT,
ADD COLUMN     "role_sr" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "BoardMember_active_order_idx" ON "BoardMember"("active", "order");

-- CreateIndex
CREATE INDEX "ManagementMember_active_order_idx" ON "ManagementMember"("active", "order");
