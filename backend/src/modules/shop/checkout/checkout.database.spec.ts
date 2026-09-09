import { PrismaClient, Product, ProductVariant } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../database/prisma.service';
import { ShopTokensService } from './shop-tokens.service';
import { ShopPricingService } from './shop-pricing.service';
import { SeasonTicketsService } from '../season-tickets/season-tickets.service';
import { ShopOrdersService } from '../orders/shop-orders.service';
import { OrderNumberService } from '../orders/order-number.service';
import { OrderOutboxService } from '../orders/order-outbox.service';
import { OrderEmailWorkerService } from '../orders/order-email-worker.service';
import { MailService } from '../../mail/mail.service';
import { CreateOrderDto } from './checkout.dto';

const databaseUrl = process.env.SHOP_TEST_DATABASE_URL;
if (databaseUrl) { const url = new URL(databaseUrl); if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.pathname !== '/shop_phase1_test') throw new Error('Only disposable local shop_phase1_test is allowed.'); }
const suite = databaseUrl ? describe : describe.skip;
suite('Checkout transactions against isolated PostgreSQL', () => {
  let db: PrismaClient, pricing: ShopPricingService, tickets: SeasonTicketsService, orders: ShopOrdersService;
  let product: Product & { variants: ProductVariant[] };
  let userId: string;
  const config = new ConfigService({ SHOP_TOKEN_SECRET: 'test-only-signing-secret-with-32-characters', SHOP_ACTIVE_SEASON: 'TEST-ONLY', SHOP_VERIFIER_KEYS: JSON.stringify({ 1: 'test-only-verifier-secret-with-32-characters' }), SHOP_VERIFIER_KEY_VERSION: 1, SMTP_HOST: 'smtp.example.invalid', SMTP_USER: 'test@example.invalid', SMTP_PASS: 'test-only', SHOP_ORDER_RECIPIENT_EMAIL: 'club@example.invalid' });
  const tokens = new ShopTokensService(config);
  const numbers = new OrderNumberService(), outbox = new OrderOutboxService();
  const customer = { firstName: 'Тест', lastName: 'Купац', phone: '+381601234567', email: 'customer@example.invalid', address: 'Тест улица 1', city: 'Београд', postalCode: '11000', note: '<b>Напомена</b>' };
  const items = () => product.variants.map(variant => ({ variantId: variant.id, quantity: 1 }));
  const request = async (seasonTicketToken?: string): Promise<CreateOrderDto> => ({ items: items(), customer, idempotencyKey: randomUUID(), quoteToken: (await pricing.quote({ items: items(), seasonTicketToken })).quoteToken, seasonTicketToken });
  const ticketInput = (verificationMethod: 'PIN' | 'LAST_NAME' | 'PHONE_LAST4' = 'PIN', verificationValue = '4938') => ({ cardNumber: `TEST-${randomUUID()}`, seasonKey: 'TEST-ONLY', active: true, verificationMethod, verificationValue });
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: databaseUrl! } } }); await db.$connect();
    tickets = new SeasonTicketsService(db as PrismaService, config, tokens);
    pricing = new ShopPricingService(db as PrismaService, tickets, tokens);
    orders = new ShopOrdersService(db as PrismaService, pricing, tokens, numbers, outbox);
    userId = (await db.user.create({ data: { email: `${randomUUID()}@example.invalid`, passwordHash: 'unused-test-only', role: 'ADMIN', firstName: 'Тест', lastName: 'Администратор' } })).id;
  });
  beforeEach(async () => { product = await db.product.create({ data: { nameSr: 'Тест мајица', descriptionSr: 'Опис', slug: `test-${randomUUID()}`, priceMinor: 100003, active: true, variants: { create: [{ size: 'M' }, { size: 'L' }] } }, include: { variants: true } }); });
  afterAll(async () => { await db?.$disconnect(); });
  it('quotes current prices without discount, merges duplicates and rejects overflow', async () => {
    const quote = await pricing.quote({ items: [...items(), items()[0]] });
    expect(quote.subtotalMinor).toBe(300009); expect(quote.totalMinor).toBe(300009); expect(quote.discountMinor).toBe(0);
    expect(quote.items).toHaveLength(2); expect(quote.shippingMinor).toBeNull(); expect(quote.shippingCalculated).toBe(false);
    expect(tokens.verify(quote.quoteToken, 'quote', 'QUOTE_EXPIRED').fingerprint).toBeTruthy();
    expect(quote).not.toHaveProperty('ticket');
    expect(() => pricing.normalizeItems([{ variantId: 'v', quantity: 99 }, { variantId: 'v', quantity: 1 }])).toThrow();
    await db.product.update({ where: { id: product.id }, data: { priceMinor: 2147483647 } });
    await expect(pricing.quote({ items: items() })).rejects.toMatchObject({ response: { code: 'INVALID_INPUT' } });
  });
  it.each([['PIN', '4938', '4938'], ['LAST_NAME', ' ПЕТРОВИЋ ', 'петровић'], ['PHONE_LAST4', '0123', '0123']] as const)('validates %s, protects its verifier and gives exactly 20%% without usage limit', async (method, value, candidate) => {
    const input = ticketInput(method, value), safe = await tickets.write(input);
    expect(safe).not.toHaveProperty('verifierHash'); expect(safe).not.toHaveProperty('verifierKeyVersion');
    const stored = await db.seasonTicket.findUniqueOrThrow({ where: { id: safe.id } });
    expect(stored.verifierHash).toMatch(/^\$2[aby]\$12\$/); expect(stored.verifierHash).not.toContain(value);
    const validated = await tickets.validate({ cardNumber: input.cardNumber, verificationValue: candidate });
    const quote = await pricing.quote({ items: items(), seasonTicketToken: validated.seasonTicketToken });
    expect(quote.discountPercent).toBe(20); expect(quote.discountMinor).toBe(40001); expect(quote.totalMinor).toBe(160005);
    expect(quote.items.reduce((sum, line) => sum + line.discountMinor, 0)).toBe(quote.discountMinor);
    expect(quote.items.reduce((sum, line) => sum + line.finalMinor, 0)).toBe(quote.totalMinor);
    const first = await orders.create(await request(validated.seasonTicketToken));
    const second = await orders.create(await request(validated.seasonTicketToken));
    expect(first.orderNumber).not.toBe(second.orderNumber);
  });
  it('uses one generic error for unknown, expired, inactive and mismatched cards', async () => {
    const input = ticketInput(), ticket = await tickets.write(input);
    for (const dto of [{ cardNumber: 'UNKNOWN-TEST', verificationValue: '4938' }, { cardNumber: input.cardNumber, verificationValue: 'wrong' }]) await expect(tickets.validate(dto)).rejects.toMatchObject({ response: { code: 'SEASON_TICKET_INVALID' } });
    for (const data of [{ active: false }, { active: true, validUntil: new Date('2000-01-01') }, { validUntil: null, validFrom: new Date('2100-01-01') }]) {
      await db.seasonTicket.update({ where: { id: ticket.id }, data });
      await expect(tickets.validate({ cardNumber: input.cardNumber, verificationValue: '4938' })).rejects.toMatchObject({ response: { code: 'SEASON_TICKET_INVALID' } });
    }
  });
  it('keeps blank verifier edits, rehashes replacement, revokes tokens and never exposes hashes in lists', async () => {
    const input = ticketInput(), ticket = await tickets.write(input);
    const token = (await tickets.validate({ cardNumber: input.cardNumber, verificationValue: '4938' })).seasonTicketToken;
    const before = await db.seasonTicket.findUniqueOrThrow({ where: { id: ticket.id } });
    await tickets.write({ ...input, verificationValue: '' }, ticket.id);
    expect((await db.seasonTicket.findUniqueOrThrow({ where: { id: ticket.id } })).verifierHash).toBe(before.verifierHash);
    await expect(pricing.quote({ items: items(), seasonTicketToken: token })).rejects.toMatchObject({ response: { code: 'SEASON_TICKET_INVALID' } });
    await tickets.write({ ...input, verificationValue: 'new-secret' }, ticket.id);
    expect((await db.seasonTicket.findUniqueOrThrow({ where: { id: ticket.id } })).verifierHash).not.toBe(before.verifierHash);
    expect(JSON.stringify(await tickets.list({ page: 1, limit: 20, search: input.cardNumber }))).not.toMatch(/verifierHash|verifierKeyVersion|new-secret|4938/);
    await expect(tickets.write({ ...input, verificationMethod: 'PHONE_LAST4', verificationValue: '' }, ticket.id)).rejects.toThrow();
  });
  it('rejects price changes with a new quote and keeps the same attempt retryable', async () => {
    const dto = await request();
    await db.product.update({ where: { id: product.id }, data: { priceMinor: 120000 } });
    const before = await db.order.count();
    let newQuote: string | undefined;
    try { await orders.create(dto); throw new Error('Should reject changed price'); }
    catch (error) { expect(error).toMatchObject({ response: { code: 'PRICE_CHANGED', quote: { totalMinor: 240000 } } }); newQuote = (error as { response: { quote: { quoteToken: string } } }).response.quote.quoteToken; }
    expect(await db.order.count()).toBe(before);
    const receipt = await orders.create({ ...dto, quoteToken: newQuote! }); expect(receipt.totalMinor).toBe(240000);
  });
  it('rejects unavailable/inactive products, missing variants and expired quote before inserting', async () => {
    const dto = await request(), before = await db.order.count();
    await db.productVariant.update({ where: { id: product.variants[0].id }, data: { available: false } });
    await expect(orders.create(dto)).rejects.toMatchObject({ response: { code: 'VARIANT_UNAVAILABLE' } });
    await db.productVariant.update({ where: { id: product.variants[0].id }, data: { available: true } });
    await db.product.update({ where: { id: product.id }, data: { active: false } });
    await expect(orders.create(dto)).rejects.toMatchObject({ response: { code: 'PRODUCT_UNAVAILABLE' } });
    await expect(pricing.quote({ items: [{ variantId: 'missing-test', quantity: 1 }] })).rejects.toMatchObject({ response: { code: 'VARIANT_UNAVAILABLE' } });
    await expect(orders.create({ ...dto, quoteToken: tokens.sign('quote', {}, -1) })).rejects.toMatchObject({ response: { code: 'QUOTE_EXPIRED' } });
    expect(await db.order.count()).toBe(before);
  });
  it('creates one atomic snapshot/history/two-email order for concurrent duplicates and rejects changed requests', async () => {
    const dto = await request();
    const receipts = await Promise.all(Array.from({ length: 6 }, () => orders.create(dto)));
    expect(new Set(receipts.map(receipt => receipt.orderNumber)).size).toBe(1);
    const order = await db.order.findUniqueOrThrow({ where: { orderNumber: receipts[0].orderNumber }, include: { items: true, statusHistory: true, emails: true } });
    expect(order.items).toHaveLength(2); expect(order.statusHistory).toHaveLength(1); expect(order.statusHistory[0].status).toBe('NEW');
    expect(order.emails.map(email => email.kind).sort()).toEqual(['CLUB', 'CUSTOMER']);
    expect(order.email).toBe(customer.email); expect(order.country).toBe('RS'); expect(order.paymentMethod).toBe('COD');
    expect(order.note).toBe('Напомена'); expect(order.shippingMinor).toBeNull(); expect(order.shippingCalculated).toBe(false);
    expect(order.idempotencyKeyHash).not.toContain(dto.idempotencyKey); expect(order.requestHash).not.toContain(customer.email);
    await db.product.update({ where: { id: product.id }, data: { nameSr: 'Нови назив', priceMinor: 999999, active: false } });
    const detail = await orders.detail(order.id);
    expect(detail.items[0].productName).toBe('Тест мајица'); expect(detail.items[0].unitPriceMinor).toBe(100003);
    expect(detail).not.toHaveProperty('requestHash'); expect(detail).not.toHaveProperty('idempotencyKeyHash');
    expect((await orders.create({ ...dto, quoteToken: 'expired-token-is-irrelevant-on-replay' })).orderNumber).toBe(order.orderNumber);
    await expect(orders.create({ ...dto, customer: { ...customer, firstName: 'Други' } })).rejects.toMatchObject({ response: { code: 'IDEMPOTENCY_CONFLICT' } });
    expect(await orders.recover(dto.idempotencyKey)).toMatchObject({ found: true, orderNumber: order.orderNumber });
    const receipt = await orders.readReceipt(receipts[0].receiptToken);
    expect(JSON.stringify(receipt)).not.toMatch(/customer|address|phone|email|receiptToken/);
    await expect(orders.readReceipt(receipts[0].receiptToken + 'x')).rejects.toThrow();
  });
  it('rolls back order, items, history and counter if outbox insertion fails', async () => {
    const dto = await request();
    const before = await Promise.all([db.order.count(), db.orderItem.count(), db.orderStatusHistory.count(), db.orderEmail.count(), db.orderNumberCounter.findMany()]);
    const broken = new ShopOrdersService(db as PrismaService, pricing, tokens, numbers, { enqueue: async () => { throw new Error('isolated outbox failure'); } } as unknown as OrderOutboxService);
    await expect(broken.create(dto)).rejects.toThrow('isolated outbox failure');
    expect(await Promise.all([db.order.count(), db.orderItem.count(), db.orderStatusHistory.count(), db.orderEmail.count(), db.orderNumberCounter.findMany()])).toEqual(before);
  });
  it('allocates unique numbers for concurrent distinct attempts', async () => {
    const dto = await request();
    const receipts = await Promise.all(Array.from({ length: 8 }, () => orders.create({ ...dto, idempotencyKey: randomUUID() })));
    expect(new Set(receipts.map(receipt => receipt.orderNumber)).size).toBe(8);
    expect(receipts.every(receipt => /^CZ-\d{4}-\d{4,}$/.test(receipt.orderNumber))).toBe(true);
  });
  it('records CMS author and permits only the specified status flow including terminal cancellation', async () => {
    for (const cancelFrom of [null, 'NEW', 'CONFIRMED'] as const) {
      const receipt = await orders.create(await request(), 'INSTAGRAM', userId);
      const order = await db.order.findUniqueOrThrow({ where: { orderNumber: receipt.orderNumber } });
      expect(order.source).toBe('INSTAGRAM');
      await expect(orders.status(order.id, 'COMPLETED', userId)).rejects.toMatchObject({ response: { code: 'INVALID_STATUS' } });
      if (cancelFrom !== 'NEW') await orders.status(order.id, 'CONFIRMED', userId);
      if (cancelFrom) { await orders.status(order.id, 'CANCELLED', userId); }
      else { await orders.status(order.id, 'SHIPPED', userId); await expect(orders.status(order.id, 'CANCELLED', userId)).rejects.toThrow(); await orders.status(order.id, 'COMPLETED', userId); }
      await expect(orders.status(order.id, 'NEW', userId)).rejects.toThrow();
      const detail = await orders.detail(order.id); expect(detail.allowedStatuses).toEqual([]); expect(detail.statusHistory.every(event => event.changedBy?.id === userId)).toBe(true);
    }
  });
  it('leases outbox rows across workers, retries failure without losing order and restricts manual retry', async () => {
    // This is a disposable database; park earlier test messages so only these two are eligible.
    await db.orderEmail.updateMany({ data: { status: 'SENT', lockedAt: null, lockToken: null } });
    const receipt = await orders.create(await request());
    const order = await db.order.findUniqueOrThrow({ where: { orderNumber: receipt.orderNumber } });
    const send = jest.fn().mockRejectedValue(new Error('SMTP private customer content must not be persisted'));
    const mail = { send } as unknown as MailService;
    const workers = [new OrderEmailWorkerService(db as PrismaService, config, mail), new OrderEmailWorkerService(db as PrismaService, config, mail)];
    await Promise.all(workers.map(worker => worker.tick()));
    expect(send).toHaveBeenCalledTimes(2);
    let emails = await db.orderEmail.findMany({ where: { orderId: order.id } });
    expect(emails.every(email => email.status === 'PENDING' && email.attempts === 1 && email.nextAttemptAt! > new Date() && email.lockToken === null)).toBe(true);
    expect(JSON.stringify(emails)).not.toContain('private customer');
    expect(await db.order.count({ where: { id: order.id } })).toBe(1);
    await expect(orders.retryEmail(order.id, emails[0].id)).rejects.toThrow();
    await db.orderEmail.updateMany({ where: { orderId: order.id }, data: { attempts: 4, nextAttemptAt: new Date(0) } });
    await Promise.all(workers.map(worker => worker.tick()));
    emails = await db.orderEmail.findMany({ where: { orderId: order.id } }); expect(emails.every(email => email.status === 'FAILED' && email.attempts === 5)).toBe(true);
    await orders.retryEmail(order.id, emails[0].id);
    send.mockResolvedValue(undefined);
    await workers[0].tick();
    expect(await db.orderEmail.findUnique({ where: { id: emails[0].id } })).toMatchObject({ status: 'SENT', attempts: 1, lockedAt: null, lockToken: null });
    // Reclaim a crashed worker's expired lease.
    await db.orderEmail.update({ where: { id: emails[1].id }, data: { status: 'PROCESSING', attempts: 1, lockedAt: new Date(0), lockToken: 'crashed-test-worker' } });
    await workers[1].tick();
    expect(await db.orderEmail.findUnique({ where: { id: emails[1].id } })).toMatchObject({ status: 'SENT', attempts: 2 });
    const bodies = send.mock.calls.map(call => call[0].text as string);
    expect(bodies.every(body => body.includes('Плаћање поузећем') && body.includes('обрачунава се накнадно') && body.includes(order.orderNumber))).toBe(true);
    expect(bodies.join('\n')).not.toMatch(/verifier|quoteToken|seasonTicketToken|requestHash/);
  });
});
