/*
  Warnings:

  - A unique constraint covering the columns `[unsubscribeToken]` on the table `NewsletterSubscriber` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `unsubscribeToken` to the `NewsletterSubscriber` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "NewsletterSubscriber" ADD COLUMN     "consent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "unsubscribeToken" TEXT NOT NULL,
ALTER COLUMN "consentGivenAt" DROP NOT NULL,
ALTER COLUMN "consentGivenAt" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_unsubscribeToken_key" ON "NewsletterSubscriber"("unsubscribeToken");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_isActive_idx" ON "NewsletterSubscriber"("isActive");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_source_idx" ON "NewsletterSubscriber"("source");
