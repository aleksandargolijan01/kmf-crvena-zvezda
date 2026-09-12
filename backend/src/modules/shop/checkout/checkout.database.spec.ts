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
  const ticketInput = (fullName = 'Тест Купац') => ({ cardNumber: `00${BigInt('0x' + randomUUID().replace(/-/g, '')).toString()}`, seasonKey: 'TEST-ONLY', active: true, fullName });
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
  it.each([['Тест Купац', 'Тест Купац'], [' ПЕТАР   ПЕТРОВИЋ ', '  петар  петровић  '], ['Petar Petrović', 'PETAR PETROVIĆ']] as const)('validates %s with exact normalized name and gives exactly 20%% without usage limit', async (value, candidate) => {
    const input = ticketInput(value), safe = await tickets.write(input);
    expect(safe).not.toHaveProperty('verifierHash'); expect(safe).not.toHaveProperty('verifierKeyVersion');
    const stored = await db.seasonTicket.findUniqueOrThrow({ where: { id: safe.id } });
    expect(stored.verifierHash).toMatch(/^\$2[aby]\$12\$/); expect(stored.verifierHash).not.toContain(value);
    expect(stored.cardNumber).toBe(input.cardNumber); expect(stored.verificationMethod).toBe('FULL_NAME');
    const validated = await tickets.validate({ cardNumber: input.cardNumber, fullName: candidate });
    expect(Object.keys(validated).sort()).toEqual(['discountPercent', 'expiresIn', 'seasonTicketToken', 'valid']);
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
    for (const dto of [{ cardNumber: '999999', fullName: input.fullName }, ...['Погрешно Име', 'Купац Тест', 'Test Kupac', 'Тест Купа'].map(fullName => ({ cardNumber: input.cardNumber, fullName }))]) await expect(tickets.validate(dto)).rejects.toMatchObject({ response: { code: 'SEASON_TICKET_INVALID' } });
    for (const data of [{ active: false }, { active: true, validUntil: new Date('2000-01-01') }, { validUntil: null, validFrom: new Date('2100-01-01') }, { validFrom: null, seasonKey: 'OLD-SEASON' }]) {
      await db.seasonTicket.update({ where: { id: ticket.id }, data });
      await expect(tickets.validate({ cardNumber: input.cardNumber, fullName: input.fullName })).rejects.toMatchObject({ response: { code: 'SEASON_TICKET_INVALID' } });
    }
  });
  it('rehashes name edits, revokes tokens and never exposes hashes in admin lists', async () => {
    const input = ticketInput(), ticket = await tickets.write(input);
    const token = (await tickets.validate(input)).seasonTicketToken;
    const before = await db.seasonTicket.findUniqueOrThrow({ where: { id: ticket.id } });
    await expect(tickets.write({ ...input, fullName: '' }, ticket.id)).rejects.toThrow();
    await tickets.write({ ...input, fullName: 'Нови Власник' }, ticket.id);
    await expect(pricing.quote({ items: items(), seasonTicketToken: token })).rejects.toMatchObject({ response: { code: 'SEASON_TICKET_INVALID' } });
    expect((await db.seasonTicket.findUniqueOrThrow({ where: { id: ticket.id } })).verifierHash).not.toBe(before.verifierHash);
    expect(JSON.stringify(await tickets.list({ page: 1, limit: 20, search: input.cardNumber }))).not.toMatch(/verifierHash|verifierKeyVersion/);
    await expect(tickets.validate(input)).rejects.toMatchObject({ response: { code: 'SEASON_TICKET_INVALID' } });
    expect((await tickets.validate({ ...input, fullName: 'НОВИ ВЛАСНИК' })).valid).toBe(true);
  });
  it('keeps legacy records unusable until an administrator completes them', async () => {
    const input = ticketInput(), ticket = await tickets.write(input);
    for (const cardNumber of [input.cardNumber, 'OLD-' + ticket.id]) {
      await db.seasonTicket.update({ where: { id: ticket.id }, data: { fullName: null, verificationMethod: 'PIN', cardNumber } });
      await expect(tickets.validate({ fullName: input.fullName, cardNumber })).rejects.toMatchObject({ response: { code: 'SEASON_TICKET_INVALID' } });
      await expect(pricing.quote({ items: items(), seasonTicketToken: tokens.sign('season-ticket', { id: ticket.id, version: 1 }, 600) })).rejects.toMatchObject({ response: { code: 'SEASON_TICKET_INVALID' } });
    }
    await tickets.write(input, ticket.id);
    expect((await tickets.validate(input)).valid).toBe(true);
  });
  it.each([{ active: false }, { seasonKey: 'OLD' }, { validUntil: new Date('2000-01-01') }, { version: 99 }])('rechecks ticket state at quote and order creation: %j', async data => {
    const input = ticketInput(), ticket = await tickets.write(input);
    const token = (await tickets.validate(input)).seasonTicketToken, dto = await request(token);
    const before = await db.order.count();
    await db.seasonTicket.update({ where: { id: ticket.id }, data });
    await expect(pricing.quote({ items: items(), seasonTicketToken: token })).rejects.toMatchObject({ response: { code: 'SEASON_TICKET_INVALID' } });
    await expect(orders.create(dto)).rejects.toMatchObject({ response: { code: 'SEASON_TICKET_INVALID' } });
    expect(await db.order.count()).toBe(before);
  });
  it('rejects forged ticket tokens at both quote and order', async () => {
    const dto = await request();
    await expect(pricing.quote({ items: items(), seasonTicketToken: 'forged' })).rejects.toMatchObject({ response: { code: 'SEASON_TICKET_INVALID' } });
    await expect(orders.create({ ...dto, seasonTicketToken: 'forged' })).rejects.toMatchObject({ response: { code: 'SEASON_TICKET_INVALID' } });
  });
  it('deletes only order children, keeps numbering and preserves products, variants, media and ticket', async () => {
    const input = ticketInput(), ticket = await tickets.write(input);
    const token = (await tickets.validate(input)).seasonTicketToken;
    const media = await db.mediaFile.create({ data: { bucket: 'test', storagePath: randomUUID(), url: 'https://example.invalid/test.png', originalName: 'test.png', fileName: 'test.png', mimeType: 'image/png', size: 100 } });
    await db.product.update({ where: { id: product.id }, data: { coverImageId: media.id, gallery: { create: { mediaFileId: media.id } } } });
    const beforeProduct = await db.product.findUnique({ where: { id: product.id }, include: { variants: true, gallery: true } });
    const beforeTicket = await db.seasonTicket.findUnique({ where: { id: ticket.id } });
    const receipt = await orders.create(await request(token));
    const order = await db.order.findUniqueOrThrow({ where: { orderNumber: receipt.orderNumber } });
    const counters = await db.orderNumberCounter.findMany();
    await orders.remove(order.id);
    expect(await db.order.findUnique({ where: { id: order.id } })).toBeNull();
    expect(await db.orderItem.count({ where: { orderId: order.id } })).toBe(0);
    expect(await db.orderStatusHistory.count({ where: { orderId: order.id } })).toBe(0);
    expect(await db.orderEmail.count({ where: { orderId: order.id } })).toBe(0);
    expect(await db.product.findUnique({ where: { id: product.id }, include: { variants: true, gallery: true } })).toEqual(beforeProduct);
    expect(await db.mediaFile.findUnique({ where: { id: media.id } })).toEqual(media);
    expect(await db.seasonTicket.findUnique({ where: { id: ticket.id } })).toEqual(beforeTicket);
    expect(await db.orderNumberCounter.findMany()).toEqual(counters);
    const next = await orders.create(await request());
    expect(Number(next.orderNumber.split('-').at(-1))).toBe(Number(receipt.orderNumber.split('-').at(-1)) + 1);
    await expect(orders.remove(order.id)).rejects.toMatchObject({ status: 404 });
  });
  it('detaches a deleted ticket without changing historical discounts or other records', async () => {
    const input = ticketInput(), ticket = await tickets.write(input), other = await tickets.write(ticketInput());
    const token = (await tickets.validate(input)).seasonTicketToken;
    const dto = await request(token), receipt = await orders.create(dto);
    const order = await db.order.findUniqueOrThrow({ where: { orderNumber: receipt.orderNumber }, include: { items: true, emails: true, statusHistory: true } });
    const counters = await db.orderNumberCounter.findMany();
    await tickets.remove(ticket.id);
    const after = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true, emails: true, statusHistory: true } });
    expect(after).toEqual({ ...order, seasonTicketId: null, updatedAt: expect.any(Date) });
    expect(after.discountPercent).toBe(20); expect(after.discountMinor).toBe(order.discountMinor);
    expect(await db.seasonTicket.findUnique({ where: { id: other.id }, select: { fullName: true } })).toEqual({ fullName: other.fullName });
    expect(await db.orderNumberCounter.findMany()).toEqual(counters);
    await expect(pricing.quote({ items: items(), seasonTicketToken: token })).rejects.toMatchObject({ response: { code: 'SEASON_TICKET_INVALID' } });
    await expect(tickets.remove(ticket.id)).rejects.toMatchObject({ status: 404 });
  });
  it('continues at 0008 after deleting all seven orders of an isolated numbering year', async () => {
    let year = 4100;
    while (await db.orderNumberCounter.findUnique({ where: { year } })) year++;
    const annualNumbers = { next: (tx: Parameters<OrderNumberService['next']>[0]) => numbers.next(tx, new Date(`${year}-06-01T12:00:00Z`)) };
    const isolatedOrders = new ShopOrdersService(db as PrismaService, pricing, tokens, annualNumbers as OrderNumberService, outbox);
    for (let index = 1; index <= 7; index++) {
      const receipt = await isolatedOrders.create(await request());
      expect(receipt.orderNumber).toBe(`CZ-${year}-${String(index).padStart(4, '0')}`);
      const row = await db.order.findUniqueOrThrow({ where: { orderNumber: receipt.orderNumber } });
      await isolatedOrders.remove(row.id);
    }
    expect(await db.order.count({ where: { orderNumber: { startsWith: `CZ-${year}-` } } })).toBe(0);
    expect(await db.orderNumberCounter.findUnique({ where: { year } })).toEqual({ year, lastValue: 7 });
    expect((await isolatedOrders.create(await request())).orderNumber).toBe(`CZ-${year}-0008`);
  });
  it('handles deletion while an email is in flight without orphan rows or worker errors', async () => {
    await db.orderEmail.updateMany({ data: { status: 'SENT', lockedAt: null, lockToken: null } });
    const receipt = await orders.create(await request());
    const order = await db.order.findUniqueOrThrow({ where: { orderNumber: receipt.orderNumber } });
    let finish!: () => void, started!: () => void;
    const sending = new Promise<void>(resolve => { started = resolve; });
    const send = jest.fn(() => { started(); return new Promise<void>(resolve => { finish = resolve; }); });
    const worker = new OrderEmailWorkerService(db as PrismaService, config, { send } as unknown as MailService);
    const processing = worker.tick(); await sending;
    try { await orders.remove(order.id); } finally { finish(); }
    await processing; await worker.tick();
    expect(send).toHaveBeenCalledTimes(1);
    expect(await db.orderEmail.count({ where: { orderId: order.id } })).toBe(0);
    expect(await db.order.findUnique({ where: { id: order.id } })).toBeNull();
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
