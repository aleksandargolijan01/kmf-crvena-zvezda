ALTER TABLE "OrderEmail" ADD COLUMN "lockedAt" TIMESTAMP(3), ADD COLUMN "lockToken" TEXT;
CREATE INDEX "OrderEmail_status_lockedAt_idx" ON "OrderEmail"("status", "lockedAt");
ALTER TABLE "OrderEmail" ADD CONSTRAINT "OrderEmail_lease_pair_check" CHECK (("lockedAt" IS NULL) = ("lockToken" IS NULL));
