/*
  Warnings:

  - You are about to drop the column `bio` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `number` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `sortOrder` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `bio` on the `U19Player` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `U19Player` table. All the data in the column will be lost.
  - You are about to drop the column `number` on the `U19Player` table. All the data in the column will be lost.
  - You are about to drop the column `sortOrder` on the `U19Player` table. All the data in the column will be lost.
  - Added the required column `fullName` to the `Player` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fullName` to the `U19Player` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Player_isActive_sortOrder_idx";

-- DropIndex
DROP INDEX "U19Player_isActive_sortOrder_idx";

-- AlterTable
ALTER TABLE "Player" DROP COLUMN "bio",
DROP COLUMN "isActive",
DROP COLUMN "number",
DROP COLUMN "sortOrder",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "bio_en" TEXT,
ADD COLUMN     "bio_ru" TEXT,
ADD COLUMN     "bio_sr" TEXT,
ADD COLUMN     "fullName" TEXT NOT NULL,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shirtNumber" INTEGER;

-- AlterTable
ALTER TABLE "U19Player" DROP COLUMN "bio",
DROP COLUMN "isActive",
DROP COLUMN "number",
DROP COLUMN "sortOrder",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "bio_en" TEXT,
ADD COLUMN     "bio_ru" TEXT,
ADD COLUMN     "bio_sr" TEXT,
ADD COLUMN     "fullName" TEXT NOT NULL,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shirtNumber" INTEGER;

-- CreateIndex
CREATE INDEX "Player_active_order_idx" ON "Player"("active", "order");

-- CreateIndex
CREATE INDEX "U19Player_active_order_idx" ON "U19Player"("active", "order");
