-- CreateEnum
CREATE TYPE "StaffTeamType" AS ENUM ('FIRST_TEAM', 'U19_TEAM');

-- CreateTable
CREATE TABLE "StaffMember" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role_sr" TEXT NOT NULL,
    "role_en" TEXT,
    "role_ru" TEXT,
    "bio_sr" TEXT,
    "bio_en" TEXT,
    "bio_ru" TEXT,
    "imageUrl" TEXT,
    "imageId" TEXT,
    "teamType" "StaffTeamType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffMember_imageId_idx" ON "StaffMember"("imageId");

-- CreateIndex
CREATE INDEX "StaffMember_teamType_active_order_idx" ON "StaffMember"("teamType", "active", "order");

-- AddForeignKey
ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
