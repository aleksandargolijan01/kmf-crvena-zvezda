-- Preserve legacy card numbers, verification data and order references.
-- Legacy rows remain incomplete and cannot pass the new application validation.
ALTER TYPE "SeasonTicketVerificationMethod" ADD VALUE 'FULL_NAME';
ALTER TABLE "SeasonTicket" ADD COLUMN "fullName" VARCHAR(200);

-- Only completed records are subject to the new format; no invented backfill.
ALTER TABLE "SeasonTicket" ADD CONSTRAINT "SeasonTicket_full_name_number_check"
  CHECK ("fullName" IS NULL OR (
    length(btrim("fullName")) > 0 AND "cardNumber" ~ '^[0-9]+$'
  ));
