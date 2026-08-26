/*
  Warnings:

  - You are about to drop the column `path` on the `MediaFile` table. All the data in the column will be lost.
  - You are about to drop the column `publicUrl` on the `MediaFile` table. All the data in the column will be lost.
  - You are about to drop the column `sizeBytes` on the `MediaFile` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[storagePath]` on the table `MediaFile` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `originalName` to the `MediaFile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `size` to the `MediaFile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `storagePath` to the `MediaFile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `url` to the `MediaFile` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "MediaFile_path_key";

-- AlterTable
ALTER TABLE "BoardMember" ADD COLUMN     "imageId" TEXT;

-- AlterTable
ALTER TABLE "ManagementMember" ADD COLUMN     "imageId" TEXT;

-- AlterTable
ALTER TABLE "MediaFile" DROP COLUMN "path",
DROP COLUMN "publicUrl",
DROP COLUMN "sizeBytes",
ADD COLUMN     "originalName" TEXT NOT NULL,
ADD COLUMN     "size" INTEGER NOT NULL,
ADD COLUMN     "storagePath" TEXT NOT NULL,
ADD COLUMN     "uploadedById" TEXT,
ADD COLUMN     "url" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "News" ADD COLUMN     "coverImageId" TEXT;

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "imageId" TEXT;

-- AlterTable
ALTER TABLE "Sponsor" ADD COLUMN     "logoId" TEXT;

-- AlterTable
ALTER TABLE "U19Player" ADD COLUMN     "imageId" TEXT;

-- CreateIndex
CREATE INDEX "BoardMember_imageId_idx" ON "BoardMember"("imageId");

-- CreateIndex
CREATE INDEX "ManagementMember_imageId_idx" ON "ManagementMember"("imageId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaFile_storagePath_key" ON "MediaFile"("storagePath");

-- CreateIndex
CREATE INDEX "MediaFile_uploadedById_idx" ON "MediaFile"("uploadedById");

-- CreateIndex
CREATE INDEX "News_coverImageId_idx" ON "News"("coverImageId");

-- CreateIndex
CREATE INDEX "Player_imageId_idx" ON "Player"("imageId");

-- CreateIndex
CREATE INDEX "Sponsor_logoId_idx" ON "Sponsor"("logoId");

-- CreateIndex
CREATE INDEX "U19Player_imageId_idx" ON "U19Player"("imageId");

-- AddForeignKey
ALTER TABLE "News" ADD CONSTRAINT "News_coverImageId_fkey" FOREIGN KEY ("coverImageId") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "U19Player" ADD CONSTRAINT "U19Player_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagementMember" ADD CONSTRAINT "ManagementMember_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardMember" ADD CONSTRAINT "BoardMember_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sponsor" ADD CONSTRAINT "Sponsor_logoId_fkey" FOREIGN KEY ("logoId") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaFile" ADD CONSTRAINT "MediaFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
