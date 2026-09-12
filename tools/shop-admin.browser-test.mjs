// Optional isolated browser check. External Playwright is supplied via an absolute
// module path; no production credentials, app dependency changes or live APIs.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(path.join(root, 'backend/package.json'));
const databaseUrl = process.env.SHOP_TEST_DATABASE_URL;
const url = new URL(databaseUrl ?? 'http://invalid');
if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/shop_phase1_test') throw new Error('A disposable local shop_phase1_test database is required.');
if (!process.env.SHOP_PLAYWRIGHT_MODULE) throw new Error('Set SHOP_PLAYWRIGHT_MODULE to an external Playwright entry point.');
const { chromium } = await import(pathToFileURL(process.env.SHOP_PLAYWRIGHT_MODULE).href);
const { PrismaClient } = require('@prisma/client');
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const { JwtService } = require('@nestjs/jwt');
const { ConfigService } = require('@nestjs/config');
const { PrismaService } = require('./dist/src/database/prisma.service.js');
const { ProductsService } = require('./dist/src/modules/shop/products.service.js');
const { AdminProductsController } = require('./dist/src/modules/shop/admin-products.controller.js');
const { JwtAuthGuard } = require('./dist/src/modules/auth/guards/jwt-auth.guard.js');
const { RolesGuard } = require('./dist/src/modules/auth/guards/roles.guard.js');
const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const secret = 'local-browser-shop-test-only-secret';
const jwt = new JwtService({ secret });
const module = await Test.createTestingModule({
  controllers: [AdminProductsController], providers: [JwtAuthGuard, RolesGuard,
    { provide: ProductsService, useValue: new ProductsService(db, {
      translateMissingFieldsWithResult: async ({ fields, source }) => ({ translations: Object.fromEntries(fields.map(field => [field.targetKey, `${field.targetKey.endsWith('_en') ? 'EN' : 'RU'}: ${source[field.sourceKey]}`])), errors: [] })
    }) },
    { provide: PrismaService, useValue: { user: { findUnique: ({ where }) => ({ id: where.id, role: where.id, isActive: true }) } } },
    { provide: JwtService, useValue: jwt }, { provide: ConfigService, useValue: { getOrThrow: () => secret } }
  ]
}).compile();
const api = module.createNestApplication();
api.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
await api.listen(0, '127.0.0.1');
const apiBase = await api.getUrl();
const output = path.join(root, 'dist/kmf-crvena-zvezda-site/browser');
const types = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (request, response) => {
  try {
    const relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/+/, '');
    let file = path.resolve(output, relative);
    if (!file.startsWith(output + path.sep) && file !== output) { response.writeHead(403).end(); return; }
    if (relative.startsWith('admin') || !(await stat(file).catch(() => null))?.isFile()) file = path.join(output, 'index.html');
    response.setHeader('Content-Type', types[path.extname(file)] ?? 'application/octet-stream');
    response.end(await readFile(file));
  } catch { response.writeHead(500).end(); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
let testPage;
const browserErrors = [];
let deleteCalls = 0;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  context.setDefaultTimeout(15000);
  // All external calls are intercepted before they can leave the test browser.
  await context.route('**/*', async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.origin === base) return route.continue();
    if (requestUrl.pathname.startsWith('/admin/shop/products')) {
      if (route.request().method() === 'DELETE') deleteCalls++;
      const result = await route.fetch({ url: `${apiBase}${requestUrl.pathname}${requestUrl.search}` });
      return route.fulfill({ response: result });
    }
    if (requestUrl.pathname === '/admin/media') {
      return route.fulfill({ json: { data: [{ id: media.id, url: `${base}/images/logo-kmf-crvena-zvezda.png`, originalName: 'Тест фотографија', fileName: 'test.png', mimeType: 'image/png', size: 100 }], meta: { page: 1, limit: 12, total: 1, totalPages: 1 } } });
    }
    return route.fulfill({ json: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } } });
  });
  await context.addInitScript(({ token }) => {
    localStorage.setItem('kmf_admin_access_token', token);
    localStorage.setItem('kmf_admin_user', JSON.stringify({ id: 'ADMIN', email: 'test@example.invalid', role: 'ADMIN', firstName: 'Тест' }));
  }, { token: jwt.sign({ sub: 'ADMIN', type: 'access' }, { expiresIn: '10m' }) });
  const media = await db.mediaFile.create({ data: { bucket: 'test', storagePath: `browser-${Date.now()}`, url: `${base}/images/logo-kmf-crvena-zvezda.png`, originalName: 'Тест фотографија', fileName: 'test.png', mimeType: 'image/png', size: 100 } });
  const page = await context.newPage();
  testPage = page;
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
  await page.goto(`${base}/admin/shop/products`);
  await page.getByRole('heading', { name: 'Производи', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Додај производ', exact: true }).click();
  const name = `Браузер мајица ${Date.now()}`;
  await page.getByLabel('Назив *', { exact: true }).fill(name);
  await page.getByLabel('Опис *', { exact: true }).fill('Памучна мајица за проверу форме.');
  await page.getByLabel(/^Цена у динарима \*/).fill('3200,00');
  await page.getByRole('button', { name: '+ ДОДАЈ ВЕЛИЧИНУ', exact: true }).click();
  await page.getByPlaceholder('Величина', { exact: true }).fill('M');
  await page.getByRole('button', { name: 'Изабери главну фотографију', exact: true }).click();
  await page.getByRole('button', { name: 'Изабери фотографију: Тест фотографија', exact: true }).click();
  await page.getByRole('button', { name: 'Додај фотографију у галерију', exact: true }).click();
  await page.getByRole('button', { name: 'Изабери фотографију: Тест фотографија', exact: true }).click();
  await page.getByRole('button', { name: 'Затвори избор', exact: true }).click();
  await page.getByRole('button', { name: 'Сачувај производ', exact: true }).click();
  await page.getByText('Производ је успешно сачуван.', { exact: true }).waitFor();
  let saved = await db.product.findFirstOrThrow({ where: { nameSr: name }, include: { variants: true, gallery: true } });
  assert.equal(saved.priceMinor, 320000);
  assert.equal(saved.coverImageId, media.id);
  assert.equal(saved.gallery.length, 1);
  assert.equal(saved.variants[0].size, 'M');
  assert.equal(saved.nameEn, `EN: ${name}`); assert.equal(saved.nameRu, `RU: ${name}`);
  const variantId = saved.variants[0].id;
  const originalSlug = saved.slug;
  await page.getByLabel(/^Цена у динарима \*/).fill('3300,25');
  await page.getByRole('checkbox', { name: 'Доступно', exact: true }).uncheck();
  const update = page.waitForResponse((response) => response.request().method() === 'PATCH' && response.url().includes(saved.id));
  await page.getByRole('button', { name: 'Сачувај производ', exact: true }).click();
  assert.equal((await update).status(), 200);
  saved = await db.product.findUniqueOrThrow({ where: { id: saved.id }, include: { variants: true } });
  assert.equal(saved.priceMinor, 330025);
  assert.equal(saved.variants[0].id, variantId);
  assert.equal(saved.variants[0].available, false);
  await page.getByText('Преводи — опционо', { exact: true }).click();
  await page.getByLabel('Назив *', { exact: true }).fill(name + ' ново');
  await page.getByLabel('Назив на енглеском', { exact: true }).fill('Custom English shirt');
  const translatedUpdate = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url().includes(saved.id));
  await page.getByRole('button', { name: 'Сачувај производ', exact: true }).click();
  const translatedResponse = await translatedUpdate;
  assert.equal(translatedResponse.status(), 200);
  const payload = translatedResponse.request().postDataJSON();
  assert.equal(payload.nameEn, 'Custom English shirt'); assert.equal(Object.hasOwn(payload, 'nameRu'), false);
  assert.equal(Object.hasOwn(payload, 'descriptionEn'), false); assert.equal(Object.hasOwn(payload, 'descriptionRu'), false);
  saved = await db.product.findUniqueOrThrow({ where: { id: saved.id }, include: { variants: true } });
  assert.equal(saved.nameEn, 'Custom English shirt'); assert.equal(saved.nameRu, `RU: ${name} ново`);
  assert.equal(saved.slug, originalSlug); assert.equal(saved.priceMinor, 330025); assert.equal(saved.variants[0].id, variantId);
  await page.getByRole('button', { name: 'Допуни / исправи EN/RU', exact: true }).click();
  await page.getByText('Нема превода за допуну.', { exact: true }).waitFor();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Поново преведи сва EN/RU поља', exact: true }).click();
  await page.getByText('Преводи су обновљени.', { exact: true }).waitFor();
  saved = await db.product.findUniqueOrThrow({ where: { id: saved.id }, include: { variants: true } });
  assert.equal(saved.nameEn, `EN: ${name} ново`); assert.equal(saved.priceMinor, 330025); assert.equal(saved.variants[0].id, variantId);
  const artifactDir = process.env.SHOP_TEST_ARTIFACT_DIR;
  if (artifactDir) { await mkdir(artifactDir, { recursive: true }); await page.screenshot({ path: path.join(artifactDir, 'shop-desktop.png'), fullPage: true }); }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.querySelector('.admin-sidebar').getBoundingClientRect().right <= 1);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'mobile page must not overflow horizontally');
  assert.equal(await page.locator('.admin-page > section, .admin-page-head, .admin-form input').evaluateAll((elements) => elements.every((element) => {
    if (!element.getClientRects().length) return true;
    const box = element.getBoundingClientRect();
    return box.left >= 0 && box.right <= window.innerWidth;
  })), true, 'mobile cards and form controls must fit the viewport, even when the body clips overflow');
  if (artifactDir) await page.screenshot({ path: path.join(artifactDir, 'shop-mobile.png'), fullPage: true });
  // Exercise the actual Angular -> HTTP -> Nest -> Prisma delete path.
  await db.product.update({ where: { id: saved.id }, data: { active: true } });
  await page.reload();
  await page.getByLabel('Претрага по називу').fill(saved.nameSr); await page.getByLabel('Претрага по називу').press('Enter');
  const row = page.locator('tbody tr').filter({ hasText: saved.nameSr });
  await row.getByRole('button', { name: 'Обриши', exact: true }).waitFor();
  page.once('dialog', dialog => dialog.dismiss());
  await row.getByRole('button', { name: 'Обриши', exact: true }).click();
  assert.equal(deleteCalls, 0); assert.ok(await db.product.findUnique({ where: { id: saved.id } }));
  page.once('dialog', dialog => dialog.accept());
  const deleted = page.waitForResponse(response => response.request().method() === 'DELETE' && response.url().includes(saved.id));
  await row.getByRole('button', { name: 'Обриши', exact: true }).click();
  assert.equal((await deleted).status(), 200);
  await page.getByText('Производ је обрисан.', { exact: true }).waitFor();
  await row.waitFor({ state: 'detached' });
  assert.equal(await db.product.findUnique({ where: { id: saved.id } }), null);
  assert.equal(await db.productVariant.count({ where: { productId: saved.id } }), 0);
  assert.equal(await db.productImage.count({ where: { productId: saved.id } }), 0);
  assert.deepEqual(await db.mediaFile.findUnique({ where: { id: media.id } }), media);
  const ordered = await db.product.create({ data: { nameSr: `Наручен производ ${Date.now()}`, slug: `ordered-${Date.now()}`, descriptionSr: 'Опис', priceMinor: 100, active: true, variants: { create: { size: 'M' } } }, include: { variants: true } });
  await page.reload();
  await page.getByLabel('Претрага по називу').fill(ordered.nameSr); await page.getByLabel('Претрага по називу').press('Enter');
  const orderedRow = page.locator('tbody tr').filter({ hasText: ordered.nameSr });
  await orderedRow.getByRole('button', { name: 'Обриши', exact: true }).waitFor();
  // The list is intentionally stale: the order arrives after canDelete was read.
  const order = await db.order.create({ data: { orderNumber: `CZ-BROWSER-${Date.now()}`, firstName: 'Тест', lastName: 'Купац', phone: '000', address: 'Тест', city: 'Београд', postalCode: '11000', subtotalMinor: 100, discountMinor: 0, discountPercent: 0, totalMinor: 100,
    items: { create: { productId: ordered.id, variantId: ordered.variants[0].id, productName: ordered.nameSr, productSlug: ordered.slug, size: 'M', quantity: 1, unitPriceMinor: 100, subtotalMinor: 100, discountMinor: 0, finalMinor: 100 } }, statusHistory: { create: { status: 'NEW' } } }, include: { items: true, statusHistory: true } });
  page.once('dialog', dialog => dialog.accept());
  const rejected = page.waitForResponse(response => response.request().method() === 'DELETE' && response.url().includes(ordered.id));
  await orderedRow.getByRole('button', { name: 'Обриши', exact: true }).click();
  assert.equal((await rejected).status(), 409);
  const historyMessage = 'Производ не може бити обрисан јер постоји у постојећим поруџбинама. Можете га деактивирати.';
  await page.getByText(historyMessage, { exact: true }).waitFor();
  assert.deepEqual(await db.order.findUnique({ where: { id: order.id }, include: { items: true, statusHistory: true } }), order);
  await page.reload(); await page.getByLabel('Претрага по називу').fill(ordered.nameSr); await page.getByLabel('Претрага по називу').press('Enter');
  await orderedRow.getByRole('button', { name: 'Обриши', exact: true }).click();
  await page.getByText(historyMessage, { exact: true }).waitFor();
  assert.equal(deleteCalls, 2, 'known history shows feedback without sending another DELETE');
  await orderedRow.getByRole('button', { name: 'Деактивирај', exact: true }).click();
  await orderedRow.getByRole('button', { name: 'Активирај', exact: true }).waitFor();
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: ordered.id } })).active, false);
  assert.deepEqual(errors, []);
  // Recreate a context so role restrictions are exercised from a clean session.
  const editor = await browser.newContext();
  editor.setDefaultTimeout(15000);
  await editor.route('**/*', (route) => new URL(route.request().url()).origin === base ? route.continue() : route.fulfill({ json: {} }));
  await editor.addInitScript(({ token }) => {
    localStorage.setItem('kmf_admin_access_token', token);
    localStorage.setItem('kmf_admin_user', JSON.stringify({ id: 'EDITOR', role: 'EDITOR' }));
  }, { token: jwt.sign({ sub: 'EDITOR', type: 'access' }, { expiresIn: '10m' }) });
  const editorPage = await editor.newPage();
  await editorPage.goto(`${base}/admin/shop/products`);
  await editorPage.waitForURL('**/admin/forbidden');
  assert.equal(await editorPage.getByText('ПРОДАВНИЦА', { exact: true }).count(), 0);
  console.log('PASS: CMS create/update/translation, 390px layout, delete cancel/success/409/history/deactivation, owned cascades/media protection, EDITOR guard/sidebar.');
} catch (error) {
  if (testPage) {
    console.error('Browser URL:', testPage.url());
    console.error('Browser errors:', browserErrors);
    console.error('Visible content:', (await testPage.locator('body').innerText()).slice(0, 5000));
    if (process.env.SHOP_TEST_ARTIFACT_DIR) {
      await mkdir(process.env.SHOP_TEST_ARTIFACT_DIR, { recursive: true });
      await testPage.screenshot({ path: path.join(process.env.SHOP_TEST_ARTIFACT_DIR, 'shop-failure.png'), fullPage: true });
    }
  }
  throw error;
} finally {
  await browser?.close();
  await api.close();
  await db.$disconnect();
  await new Promise((resolve) => server.close(resolve));
}
