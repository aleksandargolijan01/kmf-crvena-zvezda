import { TranslationService } from '../translation/translation.service';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ProductsService } from './products.service';
import { OrderNumberService } from './orders/order-number.service';
import { OrderOutboxService } from './orders/order-outbox.service';

// Explicitly opt in with a disposable LOCAL database; never falls back to DATABASE_URL.
const databaseUrl = process.env.SHOP_TEST_DATABASE_URL;
if (databaseUrl) {
  const url = new URL(databaseUrl);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.pathname !== '/shop_phase1_test') {
    throw new Error('SHOP_TEST_DATABASE_URL must point to a local shop_phase1_test database.');
  }
}
const databaseSuite = databaseUrl ? describe : describe.skip;

databaseSuite('Shop PostgreSQL integration (disposable database)', () => {
  let db: PrismaClient;
  let products: ProductsService;
  const numbers = new OrderNumberService();
  const outbox = new OrderOutboxService();
  let productId: string;
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: databaseUrl! } } });
    products = new ProductsService(db as PrismaService, { translateMissingFieldsWithResult: jest.fn().mockResolvedValue({ translations: {}, errors: [] }) } as unknown as TranslationService);
    await db.$connect();
  });
  afterAll(async () => { await db?.$disconnect(); });

  it('creates, updates and queries a real catalog with stable variant IDs', async () => {
    const product = await products.create({ nameSr: 'Тест мајица', descriptionSr: 'Памучна мајица', priceMinor: 320000, variants: [{ size: 'M' }, { size: '128' }] });
    productId = product.id;
    await expect(products.findPublicBySlug(product.slug)).rejects.toThrow();
    const edited = await products.update(product.id, { active: true, variants: [{ id: product.variants[0].id, size: 'M', available: false }, { id: product.variants[1].id, size: '128' }] });
    expect(edited.variants[0].id).toBe(product.variants[0].id);
    const visible = await products.findPublicBySlug(product.slug);
    expect(visible.priceMinor).toBe(320000);
    expect(visible.variants.find((variant) => variant.size === 'M')?.available).toBe(false);
    await products.update(product.id, { availability: 'SOLD_OUT' });
    expect((await products.findPublicBySlug(product.slug)).availableForOrder).toBe(false);
  });

  it('enforces checks even if DTO/service validation is bypassed', async () => {
    await expect(db.product.update({ where: { id: productId }, data: { priceMinor: -1 } })).rejects.toThrow();
    await expect(db.product.update({ where: { id: productId }, data: { displayOrder: -1 } })).rejects.toThrow();
    await expect(db.productVariant.create({ data: { productId, size: ' m ' } })).rejects.toThrow();
    await expect(db.seasonTicket.create({ data: { seasonKey: 'bad', cardNumber: '001', validFrom: new Date('2026-10-01'), validUntil: new Date('2026-09-01') } })).rejects.toThrow();
  });

  it('rolls back all product changes when a duplicate SKU fails', async () => {
    const before = await products.findAdminById(productId);
    await expect(products.update(productId, {
      nameSr: 'Не сме бити сачувано', variants: [{ size: 'A', sku: 'duplicate' }, { size: 'B', sku: 'duplicate' }],
    })).rejects.toThrow();
    const after = await products.findAdminById(productId);
    expect(after.nameSr).toBe(before.nameSr);
    expect(after.variants.map((variant) => variant.id)).toEqual(before.variants.map((variant) => variant.id));
  });

  it('handles concurrent slug creation using the real unique index', async () => {
    const created = await Promise.all(Array.from({ length: 4 }, () => products.create({ nameSr: 'Конкурентни производ', descriptionSr: 'Опис', priceMinor: 1 })));
    expect(new Set(created.map((product) => product.slug)).size).toBe(4);
  });

  it('generates unique order numbers in concurrent transactions and rolls counters back', async () => {
    const when = new Date('2042-01-01T12:00:00Z');
    const start = (await db.orderNumberCounter.findUnique({ where: { year: 2042 } }))?.lastValue ?? 0;
    const generated = await Promise.all(Array.from({ length: 16 }, () => db.$transaction((tx) => numbers.next(tx, when), { maxWait: 20000, timeout: 20000 })));
    expect(new Set(generated).size).toBe(16);
    expect(generated).toContain(`CZ-2042-${String(start + 1).padStart(4, '0')}`);
    const before = await db.orderNumberCounter.findUniqueOrThrow({ where: { year: 2042 } });
    await expect(db.$transaction(async (tx) => { await numbers.next(tx, when); throw new Error('rollback'); })).rejects.toThrow('rollback');
    expect((await db.orderNumberCounter.findUniqueOrThrow({ where: { year: 2042 } })).lastValue).toBe(before.lastValue);
  });

  it('keeps order snapshots and outbox rows independent from product edits', async () => {
    const original = await products.findAdminById(productId);
    const order = await db.$transaction(async (tx) => {
      const orderNumber = await numbers.next(tx);
      const created = await tx.order.create({ data: {
        orderNumber, source: 'ADMIN', firstName: 'Тест', lastName: 'Купац', phone: '000', address: 'Тест адреса', city: 'Београд', postalCode: '11000',
        subtotalMinor: 320000, discountMinor: 64000, discountPercent: 20, totalMinor: 256000,
        items: { create: { productId, variantId: original.variants[0].id, productName: original.nameSr, productSlug: original.slug, size: original.variants[0].size, quantity: 1, unitPriceMinor: 320000, subtotalMinor: 320000, discountMinor: 64000, finalMinor: 256000 } },
        statusHistory: { create: { status: 'NEW' } },
      } });
      await outbox.enqueue(tx, created.id, false);
      await outbox.enqueue(tx, created.id, false);
      return created;
    });
    await products.update(productId, { nameSr: 'Промењен назив', priceMinor: 500000, active: false });
    const snapshot = await db.orderItem.findFirstOrThrow({ where: { orderId: order.id } });
    expect(snapshot.productName).toBe(original.nameSr);
    expect(snapshot.unitPriceMinor).toBe(320000);
    expect(order.shippingMinor).toBeNull();
    expect(order.shippingCalculated).toBe(false);
    expect(await db.orderEmail.count({ where: { orderId: order.id } })).toBe(1);
    await expect(products.remove(productId)).rejects.toThrow();
    await expect(db.product.delete({ where: { id: productId } })).rejects.toThrow();
    await expect(products.update(productId, { variants: [] })).rejects.toThrow();
    await expect(db.orderItem.update({ where: { id: snapshot.id }, data: { quantity: 0 } })).rejects.toThrow();
  });

  it('protects cover and gallery foreign keys, and rejects reserved media', async () => {
    const media = await db.mediaFile.create({ data: { bucket: 'test', storagePath: `shop-test-image-${Date.now()}`, url: 'https://example.invalid/photo.png', originalName: 'test.png', fileName: 'test.png', mimeType: 'image/png', size: 100 } });
    await products.update(productId, { coverImageId: media.id, gallery: [{ mediaFileId: media.id }] });
    await expect(db.mediaFile.delete({ where: { id: media.id } })).rejects.toThrow();
    await products.update(productId, { coverImageId: null, gallery: [] });
    await db.mediaFile.update({ where: { id: media.id }, data: { deletingAt: new Date() } });
    await expect(products.update(productId, { coverImageId: media.id })).rejects.toThrow();
  });
});
