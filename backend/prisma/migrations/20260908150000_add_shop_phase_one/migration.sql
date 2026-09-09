-- CreateEnum
CREATE TYPE "ProductAvailability" AS ENUM ('AVAILABLE', 'SOLD_OUT', 'MADE_TO_ORDER');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('NEW', 'CONFIRMED', 'SHIPPED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('WEBSITE', 'INSTAGRAM', 'PHONE', 'IN_PERSON', 'ADMIN');

-- CreateEnum
CREATE TYPE "SeasonTicketVerificationMethod" AS ENUM ('LAST_NAME', 'PHONE_LAST4', 'PIN');

-- CreateEnum
CREATE TYPE "OrderEmailKind" AS ENUM ('CLUB', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "OrderEmailStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "MediaFile" ADD COLUMN     "deletingAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameSr" TEXT NOT NULL,
    "nameEn" TEXT,
    "nameRu" TEXT,
    "descriptionSr" TEXT NOT NULL,
    "descriptionEn" TEXT,
    "descriptionRu" TEXT,
    "priceMinor" INTEGER NOT NULL,
    "compareAtPriceMinor" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "featuredOrder" INTEGER,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "availability" "ProductAvailability" NOT NULL DEFAULT 'AVAILABLE',
    "newUntil" TIMESTAMP(3),
    "coverImageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "mediaFileId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "altSr" TEXT,
    "altEn" TEXT,
    "altRu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "sku" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "stockQuantity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonTicket" (
    "id" TEXT NOT NULL,
    "seasonKey" TEXT NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "verificationMethod" "SeasonTicketVerificationMethod",
    "verifierHash" TEXT,
    "verifierKeyVersion" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeasonTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'NEW',
    "source" "OrderSource" NOT NULL DEFAULT 'WEBSITE',
    "currency" CHAR(3) NOT NULL DEFAULT 'RSD',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "note" TEXT,
    "subtotalMinor" INTEGER NOT NULL,
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "discountMinor" INTEGER NOT NULL DEFAULT 0,
    "totalMinor" INTEGER NOT NULL,
    "shippingMinor" INTEGER,
    "shippingCalculated" BOOLEAN NOT NULL DEFAULT false,
    "seasonTicketId" TEXT,
    "idempotencyKeyHash" TEXT,
    "requestHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "productName" TEXT NOT NULL,
    "productSlug" TEXT NOT NULL,
    "sku" TEXT,
    "size" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceMinor" INTEGER NOT NULL,
    "subtotalMinor" INTEGER NOT NULL,
    "discountMinor" INTEGER NOT NULL DEFAULT 0,
    "finalMinor" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderNumberCounter" (
    "year" INTEGER NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OrderNumberCounter_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "OrderEmail" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "kind" "OrderEmailKind" NOT NULL,
    "status" "OrderEmailStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_active_displayOrder_id_idx" ON "Product"("active", "displayOrder", "id");

-- CreateIndex
CREATE INDEX "Product_active_featured_featuredOrder_id_idx" ON "Product"("active", "featured", "featuredOrder", "id");

-- CreateIndex
CREATE INDEX "Product_coverImageId_idx" ON "Product"("coverImageId");

-- CreateIndex
CREATE INDEX "ProductImage_productId_displayOrder_id_idx" ON "ProductImage"("productId", "displayOrder", "id");

-- CreateIndex
CREATE INDEX "ProductImage_mediaFileId_idx" ON "ProductImage"("mediaFileId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductImage_productId_mediaFileId_key" ON "ProductImage"("productId", "mediaFileId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_active_displayOrder_id_idx" ON "ProductVariant"("productId", "active", "displayOrder", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productId_size_key" ON "ProductVariant"("productId", "size");

-- CreateIndex
CREATE INDEX "SeasonTicket_seasonKey_active_validUntil_idx" ON "SeasonTicket"("seasonKey", "active", "validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonTicket_seasonKey_cardNumber_key" ON "SeasonTicket"("seasonKey", "cardNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKeyHash_key" ON "Order"("idempotencyKeyHash");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_id_idx" ON "Order"("status", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Order_createdAt_id_idx" ON "Order"("createdAt", "id");

-- CreateIndex
CREATE INDEX "Order_seasonTicketId_idx" ON "Order"("seasonTicketId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "OrderItem_variantId_idx" ON "OrderItem"("variantId");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_orderId_createdAt_id_idx" ON "OrderStatusHistory"("orderId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_changedById_idx" ON "OrderStatusHistory"("changedById");

-- CreateIndex
CREATE INDEX "OrderEmail_status_nextAttemptAt_idx" ON "OrderEmail"("status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrderEmail_orderId_kind_key" ON "OrderEmail"("orderId", "kind");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_coverImageId_fkey" FOREIGN KEY ("coverImageId") REFERENCES "MediaFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_mediaFileId_fkey" FOREIGN KEY ("mediaFileId") REFERENCES "MediaFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_seasonTicketId_fkey" FOREIGN KEY ("seasonTicketId") REFERENCES "SeasonTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEmail" ADD CONSTRAINT "OrderEmail_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Monetary values are integer paras. Order.totalMinor is the merchandise total;
-- unknown delivery is NULL, never silently represented as free shipping.
ALTER TABLE "Product"
  ADD CONSTRAINT "Product_price_check" CHECK ("priceMinor" >= 0 AND ("compareAtPriceMinor" IS NULL OR "compareAtPriceMinor" > "priceMinor")),
  ADD CONSTRAINT "Product_order_check" CHECK ("displayOrder" >= 0 AND ("featuredOrder" IS NULL OR "featuredOrder" >= 0)),
  ADD CONSTRAINT "Product_text_check" CHECK (length(btrim("nameSr")) >= 2 AND length(btrim("descriptionSr")) > 0),
  ADD CONSTRAINT "Product_slug_check" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_order_check" CHECK ("displayOrder" >= 0);
ALTER TABLE "ProductVariant"
  ADD CONSTRAINT "ProductVariant_size_check" CHECK (length(btrim("size")) > 0),
  ADD CONSTRAINT "ProductVariant_order_stock_check" CHECK ("displayOrder" >= 0 AND ("stockQuantity" IS NULL OR "stockQuantity" >= 0));
CREATE UNIQUE INDEX "ProductVariant_normalized_size_key" ON "ProductVariant" ("productId", upper(btrim("size")));
ALTER TABLE "SeasonTicket"
  ADD CONSTRAINT "SeasonTicket_dates_check" CHECK ("validFrom" IS NULL OR "validUntil" IS NULL OR "validUntil" >= "validFrom"),
  ADD CONSTRAINT "SeasonTicket_version_check" CHECK ("version" > 0 AND ("verifierKeyVersion" IS NULL OR "verifierKeyVersion" > 0)),
  ADD CONSTRAINT "SeasonTicket_identity_check" CHECK (length(btrim("seasonKey")) > 0 AND length(btrim("cardNumber")) > 0);
ALTER TABLE "Order"
  ADD CONSTRAINT "Order_money_check" CHECK ("subtotalMinor" >= 0 AND "discountMinor" >= 0 AND "discountMinor" <= "subtotalMinor" AND "totalMinor" = "subtotalMinor" - "discountMinor" AND "totalMinor" >= 0 AND "discountPercent" BETWEEN 0 AND 100),
  ADD CONSTRAINT "Order_shipping_check" CHECK ((NOT "shippingCalculated" AND "shippingMinor" IS NULL) OR ("shippingCalculated" AND "shippingMinor" IS NOT NULL AND "shippingMinor" >= 0)),
  ADD CONSTRAINT "Order_currency_check" CHECK ("currency" = 'RSD');
ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_quantity_check" CHECK ("quantity" > 0),
  ADD CONSTRAINT "OrderItem_money_check" CHECK ("unitPriceMinor" >= 0 AND "subtotalMinor"::bigint = "unitPriceMinor"::bigint * "quantity"::bigint AND "discountMinor" >= 0 AND "discountMinor" <= "subtotalMinor" AND "finalMinor" = "subtotalMinor" - "discountMinor" AND "finalMinor" >= 0);
ALTER TABLE "OrderNumberCounter" ADD CONSTRAINT "OrderNumberCounter_value_check" CHECK ("year" > 0 AND "lastValue" >= 0);
ALTER TABLE "OrderEmail" ADD CONSTRAINT "OrderEmail_attempts_check" CHECK ("attempts" >= 0);
