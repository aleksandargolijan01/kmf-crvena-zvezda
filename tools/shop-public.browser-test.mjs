// Local static build + intercepted public API. No live Shop/Media writes or dependencies.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
if (!process.env.SHOP_PLAYWRIGHT_MODULE) throw new Error('Set SHOP_PLAYWRIGHT_MODULE to an external Playwright module.');
const { chromium } = await import(pathToFileURL(process.env.SHOP_PLAYWRIGHT_MODULE).href);
const output = path.join(root, 'dist/kmf-crvena-zvezda-site/browser');
const types = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer(async (request, response) => {
  try {
    const relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/+/, '');
    let file = path.resolve(output, relative);
    if (!file.startsWith(output + path.sep) && file !== output) { response.writeHead(403).end(); return; }
    if (!(await stat(file).catch(() => null))?.isFile()) file = path.join(output, 'index.html');
    response.setHeader('Content-Type', types[path.extname(file)] ?? 'application/octet-stream');
    response.end(await readFile(file));
  } catch { response.writeHead(500).end(); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const names = ['Црвена мајица', 'Бела мајица', 'Клупски дукс', 'Дечја мајица', 'Спортски шортс', 'Клупска капа'];
const products = names.map((name, index) => ({
  id: `p${index + 1}`, slug: `proizvod-${index + 1}`, name: { sr: name, en: 'English name', ru: 'Русское имя' }, description: { sr: '<p>Званична клупска одећа за сваки дан.</p><p>Удобност на трибини и ван ње.</p>' },
  priceMinor: 320000 + index * 10000, compareAtPriceMinor: null, currency: 'RSD', availability: index === 2 ? 'SOLD_OUT' : 'AVAILABLE', featured: index < 4, isNew: index < 2,
  coverImage: { id: `m${index}`, url: `${base}/test-shirt-${index}.svg`, altText: null },
  gallery: [{ id: 'g1', url: `${base}/test-shirt-back.svg`, alt: { sr: 'Задња страна мајице' } }],
  variants: [{ id: `v${index + 1}`, size: index === 3 ? '128' : 'M', available: index !== 2 }, { id: `x${index}`, size: '3XL', available: false }], availableForOrder: index !== 2
}));
const pageResponse = (data) => ({ data, meta: { page: 1, limit: 50, total: data.length, totalPages: 1 } });
let browser;
let currentPage;
const artifactDir = process.env.SHOP_TEST_ARTIFACT_DIR;
if (artifactDir) await mkdir(artifactDir, { recursive: true });
const screenshot = async (page, label, locator) => {
  if (!artifactDir) return;
  if (!locator) {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForFunction(() => !document.querySelector('.site-header')?.classList.contains('header-hidden'));
  }
  await (locator ?? page).screenshot({ path: path.join(artifactDir, `${label}.png`), ...(locator ? {} : { fullPage: true }) });
};
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  for (const width of [1440, 768, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    context.setDefaultTimeout(12000);
    let currentProducts = structuredClone(products);
    let emptyFeatured = false;
    let failCatalog = false;
    let catalogRequests = 0;
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === '/shop/products') {
        catalogRequests++;
        if (failCatalog) return route.fulfill({ status: 503, json: {} });
        return route.fulfill({ json: pageResponse(url.searchParams.get('featured') === 'true' ? emptyFeatured ? [] : currentProducts.filter((p) => p.featured).reverse() : currentProducts) });
      }
      if (url.pathname.startsWith('/shop/products/')) {
        const product = currentProducts.find((p) => p.slug === url.pathname.split('/').pop());
        return route.fulfill({ status: product ? 200 : 404, json: product ?? { message: 'Производ није пронађен.' } });
      }
      if (url.pathname.startsWith('/test-shirt-')) {
        const light = /[13]/.test(url.pathname);
        return route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 800"><rect width="640" height="800" fill="#eeeeef"/><ellipse cx="320" cy="697" rx="190" ry="18" fill="#ddd"/><path d="M210 140 110 190 55 315 155 360 185 310 185 665 455 665 455 310 485 360 585 315 530 190 430 140 380 170 260 170Z" fill="${light ? '#fff' : '#c70016'}" stroke="#ccc" stroke-width="2"/><path d="M260 170Q320 225 380 170" fill="none" stroke="${light ? '#c70016' : '#fff'}" stroke-width="12"/><path d="m385 240 8 17 19 3-14 14 3 19-16-9-17 9 4-19-14-14 19-3Z" fill="${light ? '#c70016' : '#fff'}"/></svg>` });
      }
      if (url.origin === base) return route.continue();
      return route.fulfill({ json: pageResponse([]) });
    });
    const page = await context.newPage(); currentPage = page;
    const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(base);
    await page.locator('.shop-home').waitFor();
    assert.equal(await page.locator('app-shop-carousel').evaluate((el) => el.previousElementSibling.id === 'klub' && el.nextElementSibling.id === 'uprava'), true);
    assert.equal(await page.locator('.shop-track app-product-card').count(), 4);
    assert.equal(await page.locator('.shop-track h3').first().innerText(), names[3].toUpperCase());
    const track = page.locator('.shop-track');
    await page.getByRole('button', { name: 'Следећи производи', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.shop-track').scrollLeft > 10);
    await screenshot(page, `carousel-${width}`, page.locator('.shop-home'));
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('.header-cart').waitFor();
    await page.waitForFunction(() => !document.querySelector('.site-header').classList.contains('header-hidden'));
    if (width <= 1080) {
      assert.equal(await page.locator('.header-cart').isVisible(), true);
      const cartBounds = await page.locator('.header-cart').boundingBox(); assert.ok(cartBounds.x >= 0 && cartBounds.x + cartBounds.width <= width);
      await page.locator('.nav-toggle').click();
    }
    await page.locator('.site-nav a[href="/prodavnica"]').click();
    await page.locator('.shop-grid app-product-card').first().waitFor();
    assert.equal(await page.locator('.shop-grid app-product-card').count(), 6);
    const columns = await page.locator('.shop-grid').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    assert.equal(columns, width > 1080 ? 3 : width > 720 ? 2 : 1);
    assert.equal(await page.locator('.product-badge').filter({ hasText: 'РАСПРОДАТО' }).count(), 1);
    assert.equal(await page.locator('.shop-grid, .shop-grid app-product-card').evaluateAll((elements) => elements.every((el) => { const box = el.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth; })), true);
    await screenshot(page, `catalog-${width}`);
    await page.locator('.shop-grid app-product-card a').first().click();
    await page.locator('.shop-info h1').waitFor();
    await page.getByRole('button', { name: /^ДОДАЈ У КОРПУ/ }).click();
    await page.getByText('Изаберите величину.', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: '3XL — Распродато' }).isDisabled(), true);
    await page.getByRole('button', { name: 'M', exact: true }).click();
    await page.getByRole('button', { name: 'Повећај количину' }).click();
    await page.getByRole('button', { name: 'Прикажи фотографију 2' }).click();
    await page.waitForFunction(() => document.querySelector('.shop-gallery').scrollLeft > 10);
    await page.getByRole('button', { name: /^ДОДАЈ У КОРПУ/ }).click();
    await page.getByRole('button', { name: 'Затвори потврду' }).waitFor();
    assert.equal(await page.locator('.header-cart span').innerText(), '2');
    const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('kmf_shop_cart')));
    assert.deepEqual(Object.keys(persisted).sort(), ['items','updatedAt','version']);
    assert.deepEqual(persisted.items, [{ variantId: 'v1', quantity: 2 }]);
    await page.getByRole('button', { name: 'Затвори потврду' }).click();
    assert.equal(await page.locator('.shop-layout, .shop-info, .shop-gallery, .shop-sizes').evaluateAll((elements) => elements.every((el) => { const box = el.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth; })), true);
    await screenshot(page, `product-${width}`);
    currentProducts[0].priceMinor = 350050;
    await page.getByRole('link', { name: 'ПОГЛЕДАЈ КОРПУ →', exact: true }).click();
    await page.locator('.cart-total').waitFor();
    assert.equal(await page.getByRole('button', { name: /^НАСТАВИ НА ПОРУЧИВАЊЕ/ }).count(), 0);
    assert.equal(await page.locator('a[href="/porudzbina"]').count(), 1, 'valid cart exposes checkout link');
    assert.match(await page.locator('.cart-total').innerText(), /7\.001 RSD/);
    assert.ok(catalogRequests >= 3);
    await page.getByRole('button', { name: 'Повећај количину' }).click();
    await page.locator('.cart-total').filter({ hasText: '10.501,50 RSD' }).waitFor();
    assert.match(await page.locator('.cart-total').innerText(), /10\.501,50 RSD/);
    await screenshot(page, `cart-${width}`);
    assert.equal(await page.locator('.shop-layout, .cart-layout, .cart-summary, .shop-grid, .shop-info').evaluateAll((elements) => elements.every((el) => { const box = el.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth; })), true);
    await page.reload(); await page.locator('.cart-total').waitFor(); assert.match(await page.locator('.cart-total').innerText(), /10\.501,50 RSD/);
    failCatalog = true;
    await page.getByRole('button', { name: 'ОСВЕЖИ ЦЕНЕ И ДОСТУПНОСТ' }).click();
    await page.getByText('Не можемо да проверимо актуелне цене и доступност. Покушајте поново.', { exact: true }).waitFor();
    assert.equal(await page.locator('.cart-total').count(), 0);
    failCatalog = false; currentProducts = currentProducts.slice(1);
    await page.getByRole('button', { name: /^ПОКУШАЈ ПОНОВО/ }).click();
    await page.getByRole('heading', { name: 'Артикал више није доступан', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Уклони артикал 1' }).click();
    await page.getByRole('heading', { name: 'ВАША КОРПА ЈЕ ПРАЗНА' }).waitFor();
    await page.goto(`${base}/prodavnica/ne-postoji`);
    await page.getByRole('heading', { name: 'ПРОИЗВОД НИЈЕ ПРОНАЂЕН' }).waitFor();
    await page.goto(`${base}/korpa`);
    await page.evaluate(() => localStorage.setItem('kmf_shop_cart', '{broken'));
    await page.reload(); await page.getByText(/Сачувана корпа није исправна/).waitFor();
    emptyFeatured = true;
    const featuredResponse = page.waitForResponse((response) => response.url().includes('/shop/products?') && response.url().includes('featured=true'));
    await page.goto(base); await featuredResponse;
    await page.waitForFunction(() => document.querySelector('app-shop-carousel') !== null);
    assert.equal(await page.locator('.shop-home').count(), 0);
    currentProducts = [];
    await page.goto(`${base}/prodavnica`);
    await page.getByRole('heading', { name: 'КОЛЕКЦИЈА УСКОРО СТИЖЕ' }).waitFor();
    failCatalog = true;
    await page.reload();
    await page.getByText('Производи тренутно нису доступни. Покушајте поново.', { exact: true }).waitFor();
    failCatalog = false; emptyFeatured = false; currentProducts = structuredClone(products);
    await page.goto(`${base}/kontakt`);
    await page.locator('#klub').waitFor();
    assert.equal(await page.locator('app-shop-carousel').count(), 0, 'the homepage Shop section must not change the existing contact route');
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`PASS ${width}px: homepage order/hiding, carousel, navigation/cart icon, grid, gallery, sizes, add/persist/refresh/remove, API error, 404 and corrupt storage.`);
  }
} catch (error) {
  if (currentPage && !currentPage.isClosed()) {
    console.error('URL:', currentPage.url());
    console.error((await currentPage.locator('body').innerText()).slice(0, 3500));
    await screenshot(currentPage, 'shop-public-failure');
  }
  throw error;
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
