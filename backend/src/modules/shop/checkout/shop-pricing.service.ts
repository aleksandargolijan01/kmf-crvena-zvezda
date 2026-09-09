import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { SeasonTicketsService } from '../season-tickets/season-tickets.service';
import { ShopTokensService } from './shop-tokens.service';
import { CartLineDto, QuoteDto } from './checkout.dto';
import { shopError } from './shop-errors';
import { assertMinor, lineSubtotal, percentageDiscount } from '../utils/money';

@Injectable()
export class ShopPricingService {
  constructor(private readonly db: PrismaService, private readonly tickets: SeasonTicketsService, private readonly tokens: ShopTokensService) {}
  normalizeItems(items: CartLineDto[]) {
    const quantities = new Map<string, number>();
    for (const item of items) {
      const quantity = (quantities.get(item.variantId) ?? 0) + item.quantity;
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) shopError('INVALID_INPUT', 400);
      quantities.set(item.variantId, quantity);
    }
    if (!quantities.size || quantities.size > 100) shopError('INVALID_INPUT', 400);
    return [...quantities].sort(([a], [b]) => a.localeCompare(b)).map(([variantId, quantity]) => ({ variantId, quantity }));
  }
  quote(dto: QuoteDto) { return this.db.$transaction(async (tx) => this.publicQuote(await this.calculate(tx, dto)), { timeout: 15000 }); }
  async calculate(tx: Prisma.TransactionClient, dto: QuoteDto) {
    const requested = this.normalizeItems(dto.items);
    const ticket = await this.tickets.context(tx, dto.seasonTicketToken);
    const ids = requested.map((item) => item.variantId);
    const initial = await tx.productVariant.findMany({ where: { id: { in: ids } }, select: { productId: true } });
    const productIds = [...new Set(initial.map((variant) => variant.productId))].sort();
    if (productIds.length) await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id" IN (${Prisma.join(productIds)}) ORDER BY "id" FOR SHARE`;
    await tx.$queryRaw`SELECT "id" FROM "ProductVariant" WHERE "id" IN (${Prisma.join(ids)}) ORDER BY "id" FOR SHARE`;
    const variants = await tx.productVariant.findMany({ where: { id: { in: ids } }, include: { product: true } });
    let subtotalMinor = 0;
    let allocatedDiscount = 0;
    const discountPercent = ticket ? 20 : 0;
    const items = requested.map((entry) => {
      const variant = variants.find((variant) => variant.id === entry.variantId);
      if (!variant || !variant.active || !variant.available) shopError('VARIANT_UNAVAILABLE');
      if (!variant.product.active) shopError('PRODUCT_UNAVAILABLE');
      if (variant.product.availability === 'SOLD_OUT') shopError('VARIANT_UNAVAILABLE');
      let line: number;
      try { line = lineSubtotal(variant.product.priceMinor, entry.quantity); subtotalMinor = assertMinor(subtotalMinor + line); }
      catch { return shopError('INVALID_INPUT', 400); }
      // Cumulative rounding distributes the exact cart discount across snapshots.
      const cumulativeDiscount = percentageDiscount(subtotalMinor, discountPercent);
      const discountMinor = cumulativeDiscount - allocatedDiscount;
      allocatedDiscount = cumulativeDiscount;
      return { productId: variant.productId, variantId: variant.id, productName: variant.product.nameSr, productSlug: variant.product.slug, sku: variant.sku, size: variant.size, quantity: entry.quantity, unitPriceMinor: variant.product.priceMinor, subtotalMinor: line, discountMinor, finalMinor: line - discountMinor };
    });
    return { items, subtotalMinor, discountPercent, discountMinor: allocatedDiscount, totalMinor: subtotalMinor - allocatedDiscount, shippingCalculated: false as const, shippingMinor: null, currency: 'RSD' as const, ticket };
  }
  fingerprint(quote: Awaited<ReturnType<ShopPricingService['calculate']>>) {
    return this.tokens.hash('quote', JSON.stringify({ items: quote.items.map((item) => [item.variantId, item.quantity, item.unitPriceMinor, item.discountMinor]), ticket: quote.ticket }));
  }
  publicQuote(quote: Awaited<ReturnType<ShopPricingService['calculate']>>) {
    const { ticket, ...result } = quote;
    void ticket;
    return { ...result, quoteToken: this.tokens.sign('quote', { fingerprint: this.fingerprint(quote) }, 300), expiresAt: new Date(Date.now() + 300000).toISOString() };
  }
}
