/*
  Warnings:

  - You are about to drop the column `content` on the `News` table. All the data in the column will be lost.
  - You are about to drop the column `coverImageUrl` on the `News` table. All the data in the column will be lost.
  - You are about to drop the column `excerpt` on the `News` table. All the data in the column will be lost.
  - You are about to drop the column `metaDescription` on the `News` table. All the data in the column will be lost.
  - You are about to drop the column `metaTitle` on the `News` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `News` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `News` table. All the data in the column will be lost.
  - Added the required column `content_sr` to the `News` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title_sr` to the `News` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "News_status_publishedAt_idx";

-- AlterTable
ALTER TABLE "News" DROP COLUMN "content",
DROP COLUMN "coverImageUrl",
DROP COLUMN "excerpt",
DROP COLUMN "metaDescription",
DROP COLUMN "metaTitle",
DROP COLUMN "status",
DROP COLUMN "title",
ADD COLUMN     "content_en" TEXT,
ADD COLUMN     "content_ru" TEXT,
ADD COLUMN     "content_sr" TEXT NOT NULL,
ADD COLUMN     "coverImage" TEXT,
ADD COLUMN     "excerpt_en" TEXT,
ADD COLUMN     "excerpt_ru" TEXT,
ADD COLUMN     "excerpt_sr" TEXT,
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "title_en" TEXT,
ADD COLUMN     "title_ru" TEXT,
ADD COLUMN     "title_sr" TEXT NOT NULL;

-- DropEnum
DROP TYPE "NewsStatus";

-- CreateIndex
CREATE INDEX "News_published_publishedAt_idx" ON "News"("published", "publishedAt");

-- CreateIndex
CREATE INDEX "News_featured_publishedAt_idx" ON "News"("featured", "publishedAt");
