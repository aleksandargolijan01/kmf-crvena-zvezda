// Production Angular build, isolated API fixtures, no live CMS/orders/OpenAI writes.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { moduleUrl } from './typescript-test-loader.mjs';
if (!process.env.SHOP_PLAYWRIGHT_MODULE) throw Error('Set SHOP_PLAYWRIGHT_MODULE to an external Playwright installation.');
const { chromium } = await import(pathToFileURL(process.env.SHOP_PLAYWRIGHT_MODULE).href);
const { translations } = await import(await moduleUrl(new URL('../src/app/i18n/translations.ts', import.meta.url)));
const output = path.resolve(fileURLToPath(new URL('../dist/kmf-crvena-zvezda-site/browser/', import.meta.url)));
const mime = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  try {
    let file = path.resolve(output, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!file.startsWith(output + path.sep) && file !== output) return res.writeHead(403).end();
    if (!(await stat(file).catch(() => null))?.isFile()) file = path.join(output, 'index.html');
    res.setHeader('Content-Type', mime[path.extname(file)] ?? 'application/octet-stream'); res.end(await readFile(file));
  } catch { res.writeHead(500).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const product = {
  id: 'i18n-product', slug: 'i18n-shirt', name: { sr: 'Клупска мајица', en: 'Club shirt', ru: 'Клубная футболка' },
  description: { sr: '<p>Памучна мајица</p>', en: '<p>Cotton shirt</p>', ru: '<p>Хлопковая футболка</p>' },
  priceMinor: 320050, compareAtPriceMinor: null, currency: 'RSD', availability: 'AVAILABLE', featured: true, isNew: true,
  coverImage: null, gallery: [], variants: [{ id: 'v-i18n', size: 'M', available: true }], availableForOrder: true,
};
const receipt = { orderNumber: 'I18N-TEST', status: 'NEW', totalMinor: 320050, receiptToken: 'test-receipt', createdAt: new Date().toISOString() };
const pageResponse = data => ({ data, meta: { page: 1, totalPages: data.length ? 1 : 0, total: data.length, limit: 50 } });
let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    context.setDefaultTimeout(12000);
    let apiCalls = 0, quotes = 0, orderWrites = 0;
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin === base) return route.continue();
      apiCalls++;
      if (url.pathname === '/shop/products') return route.fulfill({ json: pageResponse([product]) });
      if (url.pathname === '/shop/products/i18n-shirt') return route.fulfill({ json: product });
      if (url.pathname === '/shop/cart/quote') {
        quotes++;
        const body = route.request().postDataJSON();
        const items = body.items.map(item => ({ ...item, productId: product.id, productName: product.name.sr, productSlug: product.slug, size: 'M', unitPriceMinor: product.priceMinor, subtotalMinor: product.priceMinor * item.quantity, discountMinor: 0, finalMinor: product.priceMinor * item.quantity }));
        return route.fulfill({ json: { items, subtotalMinor: product.priceMinor, totalMinor: product.priceMinor, discountPercent: 0, discountMinor: 0, shippingMinor: null, shippingCalculated: false, quoteToken: 'test-quote', expiresAt: new Date(Date.now() + 300000).toISOString() } });
      }
      if (url.pathname === '/shop/season-ticket/validate') return route.fulfill({ status: 400, json: { code: 'SEASON_TICKET_INVALID' } });
      if (url.pathname === '/shop/orders') { orderWrites++; return route.fulfill({ status: 201, json: receipt }); }
      if (url.pathname === '/shop/orders/receipt') return route.fulfill({ json: receipt });
      if (url.pathname === '/shop/orders/recover') return route.fulfill({ json: { found: false } });
      return route.fulfill({ json: pageResponse([]) });
    });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    let documentLoads = 0; page.on('domcontentloaded', () => documentLoads++);
    async function language(lang) {
      const loads = documentLoads;
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.waitForFunction(() => !document.querySelector('.site-header')?.classList.contains('header-hidden'));
      const mobileMenu = !await page.locator('.language-trigger').isVisible();
      if (mobileMenu) await page.locator('.nav-toggle').click();
      await page.locator('.language-trigger').click();
      await page.locator(`#language-${lang}`).click();
      if (mobileMenu) await page.locator('.nav-toggle').click();
      await page.waitForFunction(expected => document.documentElement.lang === expected, lang === 'sr' ? 'sr-Cyrl' : lang);
      assert.equal(documentLoads, loads, 'Language switching must not reload the document');
    }
    async function languages(check) { for (const lang of ['sr', 'en', 'ru']) { await language(lang); await check(lang, translations[lang]); } }

    await page.goto(base + '/');
    await page.locator('.shop-home .product-card').waitFor();
    await languages(async (lang, dict) => {
      assert.equal((await page.locator('.shop-home .product-card h3').textContent()).trim(), product.name[lang]);
      assert.equal(await page.locator('#shop-home-title').innerText(), dict['shop.zvezdaShop']);
      assert.equal(await page.locator('.product-badge').innerText(), dict['shop.new']);
    });
    await page.locator('.shop-home .product-card a').click();
    await page.locator('.shop-info h1').waitFor();
    await page.locator('.shop-buy').click(); // Keep validation visible while switching.
    await page.locator('#size-validation').filter({ hasText: translations.ru['shop.selectSizeError'] }).waitFor();
    const detailRequests = apiCalls;
    await languages(async (lang, dict) => {
      assert.equal((await page.locator('.shop-info h1').textContent()).trim(), product.name[lang]);
      assert.equal(await page.locator('#size-validation').innerText(), dict['shop.selectSizeError']);
      assert.equal(await page.locator('.shop-buy').innerText(), dict['shop.addToCart']);
      const description = product.description[lang].replace(/<[^>]+>/g, '');
      assert.equal(await page.locator('.shop-description-content').innerText(), description);
      await page.waitForFunction(name => document.title.startsWith(name), product.name[lang]);
      assert.equal(await page.locator('meta[property="og:title"]').getAttribute('content'), await page.title());
      assert.equal(await page.locator('meta[name="description"]').getAttribute('content'), description);
      assert.equal(await page.locator('meta[property="og:description"]').getAttribute('content'), description);
      const schemas = await page.locator('script[data-seo-jsonld="true"]').allTextContents();
      const schema = schemas.map(JSON.parse).find(item => item['@type'] === 'Product');
      assert.equal(schema.name, product.name[lang]); assert.equal(schema.description, description); assert.equal(schema.offers.price, '3200.50');
      assert.equal(new URL(schema.offers.url).pathname, '/prodavnica/i18n-shirt');
    });
    assert.equal(apiCalls, detailRequests, 'Switching language must not refetch the product');
    await page.locator('.shop-sizes button').click(); await page.locator('.shop-buy').click();
    await page.locator('.shop-cart-cta').click(); await page.locator('.cart-row h2').waitFor();
    await languages(async (lang, dict) => {
      assert.equal((await page.locator('.cart-row h2').textContent()).trim(), product.name[lang]);
      assert.equal(await page.locator('main h1').innerText(), dict['shop.yourCart']);
      assert.equal(await page.locator('.cart-summary .shop-buy').innerText(), dict['shop.proceedCheckout']);
    });
    await page.locator('.cart-summary .shop-buy').click(); await page.locator('.checkout .line').waitFor();
    await page.locator('#checkout-email').fill('invalid'); await page.locator('#checkout-email').blur();
    await page.locator('.checkout .check input').check();
    await page.locator('[formcontrolname="cardNumber"]').fill('000123');
    await page.locator('[formcontrolname="fullName"]').fill('Test Customer');
    await page.getByRole('button', { name: translations.ru['shop.verifyTicket'], exact: true }).click();
    await page.getByText(translations.ru['shop.ticketInvalid'], { exact: true }).waitFor();
    await languages(async (lang, dict) => {
      assert.equal(await page.locator('main h1').innerText(), dict['shop.completeOrder']);
      assert.ok(await page.getByText(dict['shop.invalidEmail'], { exact: true }).isVisible());
      assert.ok(await page.getByText(dict['shop.ticketInvalid'], { exact: true }).isVisible());
    });
    await page.locator('.checkout .check input').uncheck(); await page.locator('.checkout .line').waitFor();
    const quoteCalls = quotes;
    await languages(async (lang, dict) => {
      assert.ok((await page.locator('.checkout .line').innerText()).includes(product.name[lang]));
      assert.equal(await page.locator('.checkout button.confirm').innerText(), dict['shop.confirmOrder']);
    });
    assert.equal(quotes, quoteCalls, 'Language switch must not recalculate checkout');
    const customer = { firstName: 'Test', lastName: 'Customer', email: 'shop-test@example.invalid', phone: '+381601234567', address: 'Test Street 1', city: 'Belgrade', postalCode: '11000' };
    for (const [key, value] of Object.entries(customer)) await page.locator('#checkout-' + key).fill(value);
    await page.locator('.checkout button.confirm').click(); await page.waitForURL('**/porudzbina/uspesno');
    await page.getByText('I18N-TEST', { exact: true }).waitFor();
    await languages(async (_lang, dict) => {
      assert.equal(await page.locator('main h1').innerText(), dict['shop.confirmation']);
      assert.equal(await page.locator('main h2').innerText(), dict['shop.orderReceived']);
      assert.ok((await page.locator('.shop-state').innerText()).includes(dict['shop.statusNew']));
    });
    assert.equal(orderWrites, 1);
    await page.locator('main a[routerlink="/prodavnica"]').click(); await page.locator('.shop-grid').waitFor();
    await languages(async (lang, dict) => {
      assert.equal(await page.locator('main h1').innerText(), dict['shop.catalogHeading']);
      assert.equal((await page.locator('.product-card h3').textContent()).trim(), product.name[lang]);
    });
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`Shop SR → EN → RU: home, detail/SEO, cart, checkout/errors, success, catalog; ${width}px PASS`);
  }
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
