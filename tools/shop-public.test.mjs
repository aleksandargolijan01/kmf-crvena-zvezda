import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import '@angular/compiler';
import { createEnvironmentInjector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DefaultUrlSerializer } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';

// Load the actual TypeScript services with real Angular signals/injection; no signal mocks.
const modules = new Map();
async function moduleUrl(url) {
  if (modules.has(url.href)) return modules.get(url.href);
  let source = ts.transpileModule(await readFile(url, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, experimentalDecorators: true } }).outputText;
  for (const match of [...source.matchAll(/(?:from\s+|import\s*)['"]([^'"]+)['"]/g)]) {
    const specifier = match[1];
    const resolved = specifier.startsWith('.') ? await moduleUrl(new URL(specifier + '.ts', url)) : import.meta.resolve(specifier);
    source = source.replaceAll(`'${specifier}'`, `'${resolved}'`).replaceAll(`"${specifier}"`, `"${resolved}"`);
  }
  const value = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  modules.set(url.href, value);
  return value;
}
const root = new URL('../', import.meta.url);
const { shopRouteContext } = await import(await moduleUrl(new URL('src/app/core/shop/shop-route.service.ts', root)));
const { cartGrew } = await import(await moduleUrl(new URL('src/app/core/shop/cart-presentation.service.ts', root)));
test('Shop context uses URL segments and ignores query, fragment and matrix parameters', () => {
  const parser = new DefaultUrlSerializer();
  for (const url of ['/prodavnica', '/prodavnica/majica?size=M#gallery', '/korpa/', '/korpa;view=compact', '/porudzbina', '/porudzbina/uspesno']) assert.equal(shopRouteContext(parser.parse(url)), 'shop', url);
  for (const url of ['/', '/vesti', '/tim', '/uprava', '/prodavnica-extra', '/korpa/nepoznato', '/porudzbina/nepoznato', '/vesti?next=/korpa']) assert.equal(shopRouteContext(parser.parse(url)), 'public', url);
  assert.equal(shopRouteContext(parser.parse('/admin/shop/products')), 'admin');
});
test('dismiss reset detects additions and quantity increases, not removals or unchanged hydration', () => {
  const old = [{ variantId: 'v1', quantity: 2 }];
  assert.equal(cartGrew(old, structuredClone(old)), false);
  assert.equal(cartGrew(old, []), false);
  assert.equal(cartGrew(old, [{ variantId: 'v1', quantity: 1 }]), false);
  assert.equal(cartGrew(old, [{ variantId: 'v1', quantity: 3 }]), true);
  assert.equal(cartGrew(old, [...old, { variantId: 'v2', quantity: 1 }]), true);
});
const { CartService } = await import(await moduleUrl(new URL('src/app/core/shop/cart.service.ts', root)));
const { PublicShopApiService } = await import(await moduleUrl(new URL('src/app/core/api/public-shop-api.service.ts', root)));
const { productBadge, featuredProducts, formatShopPrice, CART_KEY } = await import(await moduleUrl(new URL('src/app/core/shop/public-shop.models.ts', root)));
const product = (overrides = {}) => ({ id: 'p1', slug: 'majica', name: { sr: 'Мајица' }, description: { sr: 'Опис' }, priceMinor: 320000, compareAtPriceMinor: null, currency: 'RSD', availability: 'AVAILABLE', featured: true, isNew: true, coverImage: null, gallery: [], variants: [{ id: 'v1', size: 'UNI', available: true }], availableForOrder: true, ...overrides });
function setup(raw = null) {
  const values = new Map(raw === null ? [] : [[CART_KEY, raw]]);
  globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  globalThis.window = new EventTarget();
  const api = { catalog: () => of([product()]) };
  const injector = createEnvironmentInjector([CartService, { provide: PublicShopApiService, useValue: api }]);
  const cart = injector.get(CartService);
  cart.initialize();
  return { cart, api, values, close: () => injector.destroy() };
}

test('badge priority: sold out, new, featured, none', () => {
  assert.equal(productBadge(product({ availability: 'SOLD_OUT' })), 'РАСПРОДАТО');
  assert.equal(productBadge(product()), 'НОВО');
  assert.equal(productBadge(product({ isNew: false })), 'ИСТАКНУТО');
  assert.equal(productBadge(product({ isNew: false, featured: false })), null);
});
test('public price formatting preserves exact paras, optional decimals and large cart totals', () => {
  assert.equal(formatShopPrice(320000), '3.200 RSD');
  assert.equal(formatShopPrice(320050), '3.200,50 RSD');
  assert.equal(formatShopPrice(1), '0,01 RSD');
  assert.equal(formatShopPrice(3000000000), '30.000.000 RSD');
  assert.throws(() => formatShopPrice(0.1));
});
test('featured carousel preserves API featuredOrder, caps ten, never fills with nonfeatured products', () => {
  const items = [product({ id: 'second', featured: false }), ...Array.from({ length: 12 }, (_, i) => product({ id: String(12 - i) }))];
  assert.deepEqual(featuredProducts(items).map((p) => p.id), ['12','11','10','9','8','7','6','5','4','3']);
  assert.deepEqual(featuredProducts([product({ featured: false })]), []);
});
test('CartService adds and merges a size, counts quantity, updates and removes', () => {
  const t = setup();
  assert.equal(t.cart.add(product(), 'v1', 2), null);
  t.cart.add(product(), 'v1', 1);
  assert.equal(t.cart.count(), 3);
  assert.equal(t.cart.items().length, 1);
  t.cart.updateQuantity('v1', 4);
  assert.equal(t.cart.totalMinor(), 1280000);
  t.cart.updateQuantity('v1', 0);
  assert.equal(t.cart.count(), 4);
  assert.ok(t.cart.add(product(), 'v1', 99));
  t.cart.remove('v1');
  assert.equal(t.cart.totalMinor(), 0);
  t.close();
});
test('persistence contains only version, variantId, quantity and timestamp and restores', async () => {
  const t = setup(); t.cart.add(product(), 'v1', 2);
  const raw = t.values.get(CART_KEY);
  const saved = JSON.parse(raw);
  assert.deepEqual(Object.keys(saved).sort(), ['items', 'updatedAt', 'version']);
  assert.deepEqual(saved.items, [{ variantId: 'v1', quantity: 2 }]);
  t.close();
  const restored = setup(raw); await restored.cart.refresh();
  assert.equal(restored.cart.count(), 2); assert.equal(restored.cart.totalMinor(), 640000);
  restored.close();
});
test('corrupt JSON, old schema, duplicate identifiers and invalid quantities recover safely', () => {
  for (const raw of ['{', 'null', JSON.stringify({ version: 0, items: [] }), JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), items: [{ variantId: 'v1', quantity: 100 }] }), JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), items: [{ variantId: 'v1', quantity: 1 }, { variantId: 'v1', quantity: 1 }] })]) {
    const t = setup(raw); assert.equal(t.cart.count(), 0); assert.ok(t.cart.notice()); t.close();
  }
});
test('unavailable or missing size cannot be added', () => {
  const t = setup();
  assert.ok(t.cart.add(product(), '', 1));
  assert.ok(t.cart.add(product({ variants: [{ id: 'v1', size: 'UNI', available: false }] }), 'v1', 1));
  assert.ok(t.cart.add(product({ availability: 'SOLD_OUT' }), 'v1', 1));
  assert.equal(t.cart.count(), 0); t.close();
});
test('deactivated products, removed variants and sold out items remain removable with no misleading total', async () => {
  for (const products of [[], [product({ variants: [] })], [product({ availability: 'SOLD_OUT' })], [product({ variants: [{ id: 'v1', size: 'UNI', available: false }] })]]) {
    const t = setup(); t.cart.add(product(), 'v1', 1); t.api.catalog = () => of(products);
    await t.cart.refresh(); assert.equal(t.cart.totalMinor(), null); assert.equal(t.cart.rows()[0].available, false);
    t.cart.remove('v1'); assert.equal(t.cart.count(), 0); t.close();
  }
});
test('fresh API prices replace prior prices with integer totals', async () => {
  const t = setup(); t.cart.add(product(), 'v1', 3);
  t.api.catalog = () => of([product({ priceMinor: 320050 })]);
  await t.cart.refresh(); assert.equal(t.cart.totalMinor(), 960150); assert.equal(t.cart.notice(), 'shop.cartPriceChanged'); t.close();
});
test('refresh failure preserves saved choices but hides totals; retry recovers', async () => {
  const t = setup(); t.cart.add(product(), 'v1', 1); t.api.catalog = () => throwError(() => new Error('offline'));
  await t.cart.refresh(); assert.ok(t.cart.error()); assert.equal(t.cart.totalMinor(), null); assert.equal(t.cart.count(), 1);
  t.api.catalog = () => of([product()]); await t.cart.refresh(); assert.equal(t.cart.totalMinor(), 320000); t.close();
});
test('a late refresh cannot overwrite newer prices', async () => {
  const t = setup(); t.cart.add(product(), 'v1', 1);
  const stale = new Subject(); t.api.catalog = () => stale; const first = t.cart.refresh();
  t.api.catalog = () => of([product({ priceMinor: 400000 })]); await t.cart.refresh();
  stale.next([product()]); stale.complete(); await first;
  assert.equal(t.cart.totalMinor(), 400000); t.close();
});
test('blocked localStorage still allows an in-memory cart', () => {
  const t = setup(); globalThis.localStorage.setItem = () => { throw new Error('denied'); };
  assert.equal(t.cart.add(product(), 'v1', 1), null); assert.equal(t.cart.count(), 1); assert.ok(t.cart.notice()); t.close();
});
test('featured request delegates ordering to the API and limits to ten', async () => {
  const calls = [];
  const injector = createEnvironmentInjector([PublicShopApiService, { provide: HttpClient, useValue: { get: (url, options) => { calls.push({ url, options }); return of({ data: [product()], meta: { page: 1, totalPages: 1 } }); } } }]);
  const { firstValueFrom } = await import('rxjs');
  await firstValueFrom(injector.get(PublicShopApiService).featured());
  assert.deepEqual(calls[0].options.params, { page: 1, limit: 10, order: 'asc', featured: true });
  assert.equal(calls[0].options.transferCache, false);
  injector.destroy();
});
test('catalog reads all pages and every new call refreshes rather than using memory cache', async () => {
  const calls = [];
  const injector = createEnvironmentInjector([PublicShopApiService, { provide: HttpClient, useValue: { get: (_url, options) => { const page = options.params.page; calls.push(page); return of({ data: [product({ id: `p${page}` })], meta: { page, totalPages: 2 } }); } } }]);
  const { firstValueFrom } = await import('rxjs');
  const api = injector.get(PublicShopApiService);
  assert.equal((await firstValueFrom(api.catalog())).length, 2);
  await firstValueFrom(api.catalog());
  assert.deepEqual(calls, [1, 2, 1, 2]); injector.destroy();
});
