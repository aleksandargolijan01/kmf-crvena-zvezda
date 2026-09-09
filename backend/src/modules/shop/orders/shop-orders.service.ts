import { Injectable } from '@nestjs/common';
import { Order, OrderSource, OrderStatus, Prisma } from '@prisma/client';
import sanitizeHtml from 'sanitize-html';
import { PrismaService } from '../../../database/prisma.service';
import { buildPaginatedResponse } from '../../../common/pagination';
import { ShopPricingService } from '../checkout/shop-pricing.service';
import { ShopTokensService } from '../checkout/shop-tokens.service';
import { CreateOrderDto, ShopListDto } from '../checkout/checkout.dto';
import { shopError } from '../checkout/shop-errors';
import { OrderNumberService } from './order-number.service';
import { OrderOutboxService } from './order-outbox.service';

export const statusTransitions: Record<OrderStatus, OrderStatus[]> = { NEW: ['CONFIRMED', 'CANCELLED'], CONFIRMED: ['SHIPPED', 'CANCELLED'], SHIPPED: ['COMPLETED'], COMPLETED: [], CANCELLED: [] };
const summarySelect = { id: true, orderNumber: true, firstName: true, lastName: true, createdAt: true, totalMinor: true, discountPercent: true, discountMinor: true, status: true, source: true } satisfies Prisma.OrderSelect;
@Injectable()
export class ShopOrdersService {
  constructor(private readonly db: PrismaService, private readonly pricing: ShopPricingService, private readonly tokens: ShopTokensService, private readonly numbers: OrderNumberService, private readonly outbox: OrderOutboxService) {}
  private key(raw: string) { return this.tokens.hash('idempotency', raw); }
  private async lockKey(tx: Prisma.TransactionClient, key: string) { await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text`; }
  private receipt(order: Pick<Order, 'id' | 'orderNumber' | 'status' | 'totalMinor' | 'createdAt'>) {
    return { orderNumber: order.orderNumber, status: order.status, totalMinor: order.totalMinor, createdAt: order.createdAt, shippingCalculated: false, shippingMinor: null, receiptToken: this.tokens.sign('receipt', { id: order.id }, 86400) };
  }
  async create(dto: CreateOrderDto, source: OrderSource = 'WEBSITE', changedById?: string) {
    const clean = (value: string) => sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
    if (!dto.customer) shopError('INVALID_INPUT', 400);
    const customer = { firstName: clean(dto.customer.firstName), lastName: clean(dto.customer.lastName), phone: clean(dto.customer.phone), email: dto.customer.email.trim().toLowerCase(), address: clean(dto.customer.address), city: clean(dto.customer.city), postalCode: dto.customer.postalCode, note: dto.customer.note ? clean(dto.customer.note) : null };
    if (!customer.firstName || !customer.lastName || !customer.address || !customer.city) shopError('INVALID_INPUT', 400);
    const items = this.pricing.normalizeItems(dto.items);
    const idempotencyKeyHash = this.key(dto.idempotencyKey);
    // Quote token rotation does not change the business request. PII is HMAC protected.
    const requestHash = this.tokens.hash('order-request', JSON.stringify({ customer, items, source, changedById: changedById ?? null, seasonTicketToken: dto.seasonTicketToken ?? null }));
    return this.db.$transaction(async (tx) => {
      await this.lockKey(tx, idempotencyKeyHash);
      const existing = await tx.order.findUnique({ where: { idempotencyKeyHash } });
      if (existing) {
        if (existing.requestHash !== requestHash) shopError('IDEMPOTENCY_CONFLICT');
        return this.receipt(existing);
      }
      const claims = this.tokens.verify(dto.quoteToken, 'quote', 'QUOTE_EXPIRED');
      const quote = await this.pricing.calculate(tx, { items, seasonTicketToken: dto.seasonTicketToken });
      if (claims.fingerprint !== this.pricing.fingerprint(quote)) shopError('PRICE_CHANGED', 409, { quote: this.pricing.publicQuote(quote) });
      const orderNumber = await this.numbers.next(tx);
      const order = await tx.order.create({ data: {
        ...customer, source, orderNumber, subtotalMinor: quote.subtotalMinor, discountPercent: quote.discountPercent, discountMinor: quote.discountMinor, totalMinor: quote.totalMinor,
        shippingMinor: null, shippingCalculated: false, seasonTicketId: quote.ticket?.id ?? null, idempotencyKeyHash, requestHash,
        items: { create: quote.items }, statusHistory: { create: { status: 'NEW', changedById: changedById ?? null } },
      } });
      await this.outbox.enqueue(tx, order.id, true);
      return this.receipt(order);
    }, { timeout: 15000, maxWait: 10000 });
  }
  async recover(rawKey: string) {
    const key = this.key(rawKey);
    return this.db.$transaction(async (tx) => {
      await this.lockKey(tx, key);
      const order = await tx.order.findUnique({ where: { idempotencyKeyHash: key } });
      return order ? { found: true, ...this.receipt(order) } : { found: false };
    }, { timeout: 15000 });
  }
  async readReceipt(token: string) {
    const claims = this.tokens.verify(token, 'receipt', 'RECEIPT_EXPIRED');
    if (typeof claims.id !== 'string') shopError('RECEIPT_EXPIRED');
    const order = await this.db.order.findUnique({ where: { id: claims.id }, select: { id: true, orderNumber: true, status: true, totalMinor: true, createdAt: true } });
    if (!order) shopError('RECEIPT_EXPIRED');
    const { receiptToken, ...receipt } = this.receipt(order);
    void receiptToken;
    return receipt;
  }
  async list(query: ShopListDto) {
    const where: Prisma.OrderWhereInput = { ...(query.status ? { status: query.status } : {}), ...(query.search ? { OR: ['orderNumber', 'firstName', 'lastName', 'phone', 'email'].map((field) => ({ [field]: { contains: query.search, mode: 'insensitive' } })) } : {}) };
    const [data, count] = await this.db.$transaction([this.db.order.findMany({ where, select: summarySelect, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: query.limit, skip: (query.page - 1) * query.limit }), this.db.order.count({ where })]);
    return buildPaginatedResponse(data, count, query.page, query.limit);
  }
  async detail(id: string) {
    const order = await this.db.order.findUnique({ where: { id }, include: { items: { orderBy: { id: 'asc' } }, statusHistory: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], include: { changedBy: { select: { id: true, firstName: true, lastName: true } } } }, emails: { select: { id: true, kind: true, status: true, attempts: true, lastError: true, nextAttemptAt: true, sentAt: true } } } });
    if (!order) shopError('INVALID_INPUT', 404);
    const { idempotencyKeyHash, requestHash, ...detail } = order;
    void idempotencyKeyHash; void requestHash;
    return { ...detail, allowedStatuses: statusTransitions[order.status] };
  }
  async status(id: string, status: OrderStatus, userId: string) {
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${id} FOR UPDATE`;
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) shopError('INVALID_INPUT', 404);
      if (!statusTransitions[order.status].includes(status)) shopError('INVALID_STATUS');
      await tx.order.update({ where: { id }, data: { status, statusHistory: { create: { status, changedById: userId } } } });
    });
    return this.detail(id);
  }
  async retryEmail(orderId: string, emailId: string) {
    const result = await this.db.orderEmail.updateMany({ where: { id: emailId, orderId, status: 'FAILED' }, data: { status: 'PENDING', attempts: 0, nextAttemptAt: new Date(), lastError: null } });
    if (!result.count) shopError('INVALID_INPUT');
    return { success: true };
  }
}
