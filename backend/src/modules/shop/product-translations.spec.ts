import { ConflictException, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from '../../database/prisma.service';
import { TranslationField, TranslationService } from '../translation/translation.service';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';

describe('Shop translations through the existing CMS TranslationService', () => {
  const original = () => ({
    id: 'p1', slug: 'majica', nameSr: 'Мајица', nameEn: 'Old shirt', nameRu: 'Старая футболка',
    descriptionSr: '<p>Памучна мајица</p>', descriptionEn: '<p>Cotton shirt</p>', descriptionRu: '<p>Хлопковая футболка</p>',
    priceMinor: 320000, compareAtPriceMinor: null, availability: 'AVAILABLE', active: true, featured: true,
    coverImageId: null, coverImage: null, gallery: [], variants: [], _count: { orderItems: 0 },
  });
  let state: ReturnType<typeof original>;
  let service: ProductsService;
  let translator: TranslationService;
  let provider: jest.SpyInstance;
  let db: any;
  beforeEach(() => {
    state = original();
    translator = new TranslationService(new ConfigService({ OPENAI_API_KEY: 'test-only-never-sent' }));
    // Keep the real shared field selection, per-language error handling and adapter.
    provider = jest.spyOn(translator as unknown as {
      translateFields(target: string, fields: TranslationField[], source: Record<string, string>): Promise<Record<string, string>>;
    }, 'translateFields').mockImplementation(async (lang, fields, source) => Object.fromEntries(fields.map(field => [field.targetKey, `${lang}: ${source[field.sourceKey]}`])));
    db = {
      product: {
        findUnique: jest.fn(async () => ({ ...state })), findFirst: jest.fn(async () => ({ ...state })),
        findMany: jest.fn(async () => [{ ...state }]), count: jest.fn(async () => 1),
        create: jest.fn(async ({ data }) => { state = { ...state, ...data }; return state; }),
        update: jest.fn(async ({ data }) => { state = { ...state, ...data }; return state; }),
      },
      $queryRaw: jest.fn(async () => []),
      $transaction: jest.fn(operation => typeof operation === 'function' ? operation(db) : Promise.all(operation)),
    };
    service = new ProductsService(db as PrismaService, translator);
  });
  const create = (extra = {}) => service.create({ slug: 'majica', nameSr: 'Мајица', descriptionSr: '<p>Памучна мајица</p>', priceMinor: 320000, ...extra });

  it('creates EN/RU names and HTML descriptions from SR before opening a transaction', async () => {
    const product = await create();
    expect(product).toMatchObject({ nameEn: 'en: Мајица', nameRu: 'ru: Мајица', descriptionEn: 'en: <p>Памучна мајица</p>', descriptionRu: 'ru: <p>Памучна мајица</p>' });
    expect(provider).toHaveBeenCalledTimes(2);
    expect(provider.mock.invocationCallOrder[1]).toBeLessThan(db.$transaction.mock.invocationCallOrder[0]);
    expect(provider.mock.calls.flatMap(call => call[1]).map(field => field.targetKey).sort()).toEqual(['description_en', 'description_ru', 'name_en', 'name_ru']);
  });
  it.each(['En', 'Ru'] as const)('preserves manual %s names and descriptions on create', async suffix => {
    const product = await create({ [`name${suffix}`]: 'Manual name', [`description${suffix}`]: '<p>Manual description</p>' });
    expect(product[`name${suffix}`]).toBe('Manual name');
    expect(product[`description${suffix}`]).toBe('<p>Manual description</p>');
    expect(provider).toHaveBeenCalledTimes(1);
  });
  it('treats whitespace/null targets as missing, sanitizes generated HTML', async () => {
    provider.mockImplementation(async (_lang, fields: TranslationField[]) => Object.fromEntries(fields.map(field => [field.targetKey, '<p>Translated</p><script>bad()</script>'])));
    const product = await create({ nameEn: '  ', nameRu: null });
    expect(product.nameEn).toBe('Translated');
    expect(product.descriptionRu).toBe('<p>Translated</p>');
  });
  it('regenerates translations for changed SR only, even if old translations exist', async () => {
    const result = await service.update('p1', { nameSr: 'Нови назив' });
    expect(result).toMatchObject({ nameEn: 'en: Нови назив', nameRu: 'ru: Нови назив', descriptionEn: original().descriptionEn, descriptionRu: original().descriptionRu });
  });
  it.each(['En', 'Ru'] as const)('preserves explicit manual %s on SR update and regenerates the other language', async suffix => {
    const other = suffix === 'En' ? 'Ru' : 'En';
    const product = await service.update('p1', { nameSr: 'Нови назив', descriptionSr: '<p>Нови опис</p>', [`name${suffix}`]: 'Manual', [`description${suffix}`]: '<p>Manual</p>' });
    expect(product[`name${suffix}`]).toBe('Manual');
    expect(product[`description${suffix}`]).toBe('<p>Manual</p>');
    expect(product[`name${other}`]).toBe(`${other.toLowerCase()}: Нови назив`);
    expect(product[`description${other}`]).toBe(`${other.toLowerCase()}: <p>Нови опис</p>`);
  });
  it('does not regenerate populated fields for unchanged SR or technical-only updates', async () => {
    await service.update('p1', { nameSr: state.nameSr, priceMinor: 400000 });
    expect(provider).not.toHaveBeenCalled();
    expect(state.nameEn).toBe(original().nameEn);
  });
  it('fills missing targets on update without changing populated translations', async () => {
    state.nameEn = '';
    await service.update('p1', { nameSr: state.nameSr });
    expect(state.nameEn).toBe('en: Мајица');
    expect(state.nameRu).toBe(original().nameRu);
  });
  it('keeps graceful fallback for create/update without OpenAI configuration', async () => {
    const fallback = new ProductsService(db, new TranslationService(new ConfigService({ OPENAI_API_KEY: '' })));
    await expect(fallback.create({ slug: 'majica', nameSr: 'Мајица', descriptionSr: 'Опис', priceMinor: 1 })).resolves.toBeDefined();
    const before = state.nameEn;
    await fallback.update('p1', { nameSr: 'Ново' });
    expect(state.nameSr).toBe('Ново'); expect(state.nameEn).toBe(before);
  });
  it('retains failed language and saves successful language on partial provider failure', async () => {
    provider.mockRejectedValueOnce(new Error('provider unavailable'));
    await service.update('p1', { nameSr: 'Ново' });
    expect(state.nameEn).toBe(original().nameEn); expect(state.nameRu).toBe('ru: Ново');
  });
  it('repairs empty/copied translations only by default; leaves technical data intact', async () => {
    state.nameEn = state.nameSr; state.descriptionRu = '';
    const before = { ...state };
    const result = await service.regenerateTranslations('p1');
    expect(result.translatedFields.sort()).toEqual(['descriptionRu', 'nameEn']);
    expect(state).toEqual({ ...before, nameEn: 'en: Мајица', descriptionRu: 'ru: <p>Памучна мајица</p>' });
    expect(Object.keys(db.product.update.mock.calls[0][0].data).sort()).toEqual(['descriptionRu', 'nameEn']);
  });
  it('can explicitly regenerate all four targets and reports provider failures', async () => {
    provider.mockRejectedValueOnce(new Error('unavailable'));
    const result = await service.regenerateTranslations('p1', true);
    expect(result.translatedFields.sort()).toEqual(['descriptionRu', 'nameRu']);
    expect(result.errors).toEqual([{ target: 'en', message: 'OpenAI translation request failed.' }]);
    expect(state.nameEn).toBe(original().nameEn);
  });
  it.each(['update', 'regenerate'] as const)('rejects concurrent text changes during %s without overwriting them', async action => {
    provider.mockImplementation(async () => { state.nameEn = 'Concurrent manual edit'; return { name_en: 'Stale' }; });
    await expect(action === 'update' ? service.update('p1', { nameSr: 'Ново' }) : service.regenerateTranslations('p1', true)).rejects.toBeInstanceOf(ConflictException);
    expect(db.product.update).not.toHaveBeenCalled();
    expect(state.nameEn).toBe('Concurrent manual edit');
  });
  it('serves SR/EN/RU in public list/detail responses with Serbian fallback', async () => {
    state.nameRu = '';
    const module = await Test.createTestingModule({ controllers: [ProductsController], providers: [{ provide: ProductsService, useValue: service }] }).compile();
    const app: INestApplication = module.createNestApplication();
    await app.init();
    try {
      const list = await request(app.getHttpServer()).get('/shop/products').expect(200);
      const detail = await request(app.getHttpServer()).get('/shop/products/majica').expect(200);
      expect(list.body.data[0].name).toEqual({ sr: 'Мајица', en: 'Old shirt', ru: 'Мајица' });
      expect(detail.body.name).toEqual(list.body.data[0].name);
      expect(detail.body.description).toEqual({ sr: state.descriptionSr, en: state.descriptionEn, ru: state.descriptionRu });
    } finally { await app.close(); }
  });
});
