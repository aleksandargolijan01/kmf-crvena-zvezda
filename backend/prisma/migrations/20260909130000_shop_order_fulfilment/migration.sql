-- Locked MVP rules, recorded in the immutable order context.
ALTER TABLE "Order" ADD COLUMN "country" CHAR(2) NOT NULL DEFAULT 'RS';
ALTER TABLE "Order" ADD COLUMN "paymentMethod" TEXT NOT NULL DEFAULT 'COD';
ALTER TABLE "Order" ADD CONSTRAINT "Order_country_rs_check" CHECK ("country" = 'RS');
ALTER TABLE "Order" ADD CONSTRAINT "Order_payment_cod_check" CHECK ("paymentMethod" = 'COD');
