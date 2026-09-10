import { TranslationService } from '../translation/translation.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, ProductAvailability } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ProductsService } from './products.service';
import { ProductsQueryDto } from './dto/products-query.dto';

const product = () => ({
  id: 'p1', slug: 'majica', nameSr: 'Мајица', nameEn: null, nameRu: null,
  descriptionSr: 'Опис мајице', descriptionEn: null, descriptionRu: null,
  priceMinor: 320000, compareAtPriceMinor: null, active: false, featured: false,
  featuredOrder: null, displayOrder: 0, availability: ProductAvailability.AVAILABLE,
  newUntil: null, coverImageId: null, coverImage: null, gallery: [],
  variants: [{ id: 'v1', productId: 'p1', size: 'M', sku: null, active: true, available: true, displayOrder: 0, stockQuantity: null, _count: { orderItems: 0 } }],
  _count: { orderItems: 0 },
});

describe('ProductsService', () => {
  let db: any;
  let service: ProductsService;
  beforeEach(() => {
    db = {
      product: { findUnique: jest.fn().mockResolvedValue(product()), findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn().mockResolvedValue(1), create: jest.fn().mockResolvedValue({ id: 'p1' }), update: jest.fn().mockResolvedValue({ id: 'p1' }), delete: jest.fn() },
      productImage: { deleteMany: jest.fn(), createMany: jest.fn() },
      productVariant: { update: jest.fn(), create: jest.fn(), deleteMany: jest.fn() },
      orderItem: { count: jest.fn().mockResolvedValue(0) },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    db.$transaction = jest.fn((operation) => typeof operation === 'function' ? operation(db) : Promise.all(operation));
    service = new ProductsService(db as PrismaService, { translateMissingFieldsWithResult: jest.fn().mockResolvedValue({ translations: {}, errors: [] }) } as unknown as TranslationService);
  });

  it('disables deletion when only a variant is linked to an order snapshot', async () => {
    const used = product();
    used.variants[0]._count.orderItems = 1;
    db.product.findUnique.mockResolvedValue(used);
    expect((await service.findAdminById('p1')).canDelete).toBe(false);
  });

  it('creates a Cyrillic product with exact price and a unique generated slug', async () => {
    db.product.findUnique.mockResolvedValueOnce({ id: 'taken' }).mockResolvedValueOnce(null).mockResolvedValueOnce(product());
    await service.create({ nameSr: '<b>Мајица</b>', descriptionSr: '<p>Опис</p><script>bad()</script>', priceMinor: 320000 });
    expect(db.product.create).toHaveBeenCalledWith({ data: expect.objectContaining({ nameSr: 'Мајица', slug: 'majica-2', priceMinor: 320000, descriptionSr: '<p>Опис</p>' }) });
  });

  it('retries a simultaneous generated-slug unique conflict', async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError('collision', { code: 'P2002', clientVersion: '6', meta: { target: ['slug'] } });
    db.$transaction.mockRejectedValueOnce(conflict);
    db.product.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(product());
    await service.create({ nameSr: 'Мајица', descriptionSr: 'Опис', priceMinor: 1 });
    expect(db.$transaction).toHaveBeenCalledTimes(2);
  });

  it('does not silently replace an explicitly requested conflicting slug', async () => {
    db.$transaction.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('collision', { code: 'P2002', clientVersion: '6', meta: { target: ['slug'] } }));
    await expect(service.create({ nameSr: 'Мајица', descriptionSr: 'Опис', priceMinor: 1, slug: 'majica' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('preserves slug, variants and gallery on a scalar update', async () => {
    await service.update('p1', { nameSr: 'Нови назив', priceMinor: 12345 });
    expect(db.product.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: expect.objectContaining({ nameSr: 'Нови назив', priceMinor: 12345, slug: 'majica' }) });
    expect(db.productImage.deleteMany).not.toHaveBeenCalled();
    expect(db.productVariant.deleteMany).not.toHaveBeenCalled();
  });

  it('rejects duplicate normalized sizes and empty sanitized descriptions', async () => {
    await expect(service.update('p1', { variants: [{ size: ' m ' }, { size: 'M' }] })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.update('p1', { descriptionSr: '<script>x</script>' })).rejects.toBeInstanceOf(BadRequestException);
    expect(db.product.update).not.toHaveBeenCalled();
  });

  it('preserves a variant ID and never decrements stock when editing availability', async () => {
    await service.update('p1', { variants: [{ id: 'v1', size: 'M', available: false }] });
    expect(db.productVariant.update).toHaveBeenLastCalledWith({ where: { id: 'v1' }, data: expect.objectContaining({ size: 'M', available: false, stockQuantity: undefined }) });
    expect(db.productVariant.create).not.toHaveBeenCalled();
  });

  it('rejects foreign variant IDs and deleting ordered variants', async () => {
    await expect(service.update('p1', { variants: [{ id: 'other', size: 'S' }] })).rejects.toBeInstanceOf(BadRequestException);
    db.orderItem.count.mockResolvedValue(1);
    await expect(service.update('p1', { variants: [] })).rejects.toBeInstanceOf(ConflictException);
  });

  it('replaces gallery ordering in the same transaction and rejects deleting media', async () => {
    db.$queryRaw.mockResolvedValue([{ id: 'm1', type: 'IMAGE', deletingAt: new Date() }]);
    await expect(service.update('p1', { gallery: [{ mediaFileId: 'm1' }] })).rejects.toBeInstanceOf(BadRequestException);
    db.$queryRaw.mockResolvedValue([{ id: 'm1', type: 'IMAGE', deletingAt: null }]);
    await service.update('p1', { gallery: [{ mediaFileId: 'm1', displayOrder: 3, altSr: '<b>Дрес</b>' }] });
    expect(db.productImage.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ productId: 'p1', mediaFileId: 'm1', displayOrder: 3, altSr: 'Дрес' })] });
  });

  it('forces active-only public queries and omits internal fields', async () => {
    db.product.findMany.mockResolvedValue([{ ...product(), active: true }]);
    const result = await service.findPublic(new ProductsQueryDto());
    expect(db.product.findMany.mock.calls[0][0].where.active).toBe(true);
    expect(result.data[0].name.sr).toBe('Мајица');
    expect(result.data[0]).not.toHaveProperty('_count');
    expect(result.data[0].variants[0]).not.toHaveProperty('stockQuantity');
    db.product.findFirst.mockResolvedValue(null);
    await expect(service.findPublicBySlug('hidden')).rejects.toBeInstanceOf(NotFoundException);
    expect(db.product.findFirst.mock.calls[0][0].where).toEqual({ slug: 'hidden', active: true });
  });

  it('keeps sold-out products visible but disables all sizes; hides inactive sizes', async () => {
    const item = product();
    db.product.findFirst.mockResolvedValue({ ...item, availability: ProductAvailability.SOLD_OUT, variants: [...item.variants, { ...item.variants[0], id: 'v2', active: false }] });
    const result = await service.findPublicBySlug('majica');
    expect(result.variants).toHaveLength(1);
    expect(result.variants[0].available).toBe(false);
    expect(result.availableForOrder).toBe(false);
  });

  it('deletes only inactive unused products and blocks existing order references', async () => {
    db.product.findUnique.mockResolvedValueOnce({ ...product(), active: true });
    await expect(service.remove('p1')).rejects.toBeInstanceOf(ConflictException);
    db.orderItem.count.mockResolvedValueOnce(1);
    await expect(service.remove('p1')).rejects.toBeInstanceOf(ConflictException);
    expect(db.product.delete).not.toHaveBeenCalled();
    await expect(service.remove('p1')).resolves.toEqual({ success: true });
  });
});
