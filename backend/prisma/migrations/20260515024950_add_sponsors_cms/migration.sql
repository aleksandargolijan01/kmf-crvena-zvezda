/*
  Warnings:

  - You are about to drop the column `description` on the `Sponsor` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `Sponsor` table. All the data in the column will be lost.
  - You are about to drop the column `sortOrder` on the `Sponsor` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `SponsorCategory` table. All the data in the column will be lost.
  - You are about to drop the column `sortOrder` on the `SponsorCategory` table. All the data in the column will be lost.
  - Added the required column `name_sr` to the `SponsorCategory` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Sponsor_isActive_sortOrder_idx";

-- DropIndex
DROP INDEX "SponsorCategory_sortOrder_idx";

-- AlterTable
ALTER TABLE "Sponsor" DROP COLUMN "description",
DROP COLUMN "isActive",
DROP COLUMN "sortOrder",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "description_en" TEXT,
ADD COLUMN     "description_ru" TEXT,
ADD COLUMN     "description_sr" TEXT,
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SponsorCategory" DROP COLUMN "name",
DROP COLUMN "sortOrder",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "description_en" TEXT,
ADD COLUMN     "description_ru" TEXT,
ADD COLUMN     "description_sr" TEXT,
ADD COLUMN     "name_en" TEXT,
ADD COLUMN     "name_ru" TEXT,
ADD COLUMN     "name_sr" TEXT NOT NULL,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Sponsor_featured_idx" ON "Sponsor"("featured");

-- CreateIndex
CREATE INDEX "Sponsor_active_order_idx" ON "Sponsor"("active", "order");

-- CreateIndex
CREATE INDEX "SponsorCategory_active_order_idx" ON "SponsorCategory"("active", "order");
