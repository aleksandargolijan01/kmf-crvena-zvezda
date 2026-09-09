import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { seoProducts } from './shop-seo.fixture-loader.mjs';
if (!process.env.SHOP_SEO_BUILD_DIR || !process.env.SHOP_PLAYWRIGHT_MODULE) throw Error('Set SHOP_SEO_BUILD_DIR and SHOP_PLAYWRIGHT_MODULE.');
const output = path.resolve(process.env.SHOP_SEO_BUILD_DIR), site = 'https://kmfcrvenazvezda.rs';
const { chromium } = await import(pathToFileURL(process.env.SHOP_PLAYWRIGHT_MODULE).href);
const jsonld = html => [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
const meta = (html, key) => html.match(new RegExp(`<meta[^>]+(?:name|property)="${key}"[^>]+content="([^"]*)"`))?.[1];
const sitemap = await readFile(path.join(output, 'sitemap.xml'), 'utf8');
assert.match(sitemap, /\/vesti\//); assert.doesNotMatch(sitemap, /\/korpa|\/porudzbina|\/admin/);
for (const [index, product] of seoProducts.entries()) {
  const html = await readFile(path.join(output, 'prodavnica', product.slug, 'index.html'), 'utf8');
  const schemas = jsonld(html), schema = schemas.find(item => item['@type'] === 'Product');
  assert.equal(schemas.filter(item => item['@type'] === 'Product').length, 1); assert.equal(schemas.filter(item => item['@type'] === 'BreadcrumbList').length, 1);
  assert.equal(schema.offers.price, ((320050 + index * 10000) / 100).toFixed(2)); assert.equal(schema.offers.priceCurrency, 'RSD');
  assert.equal(schema.offers.availability, 'https://schema.org/' + ['InStock', 'OutOfStock', 'MadeToOrder'][index]);
  assert.equal(meta(html, 'robots'), 'index, follow'); assert.equal(meta(html, 'og:title'), `${product.name.sr} | КМФ Црвена звезда`);
  assert.equal(meta(html, 'twitter:title'), meta(html, 'og:title')); assert.equal(meta(html, 'og:url'), site + '/prodavnica/' + product.slug);
  assert.ok(html.includes(`rel="canonical" href="${site}/prodavnica/${product.slug}"`)); assert.ok(sitemap.includes('/prodavnica/' + product.slug));
  assert.match(html, /class="shop-info"/); assert.doesNotMatch(html, /ПРОИЗВОД НИЈЕ ПРОНАЂЕН/);
}
const catalog = await readFile(path.join(output, 'prodavnica/index.html'), 'utf8');
assert.equal(meta(catalog, 'robots'), 'index, follow'); assert.equal(meta(catalog, 'og:title'), 'Продавница КМФ Црвена звезда | Званична колекција');
assert.equal(meta(catalog, 'og:url'), site + '/prodavnica'); assert.equal((catalog.match(/<app-product-card/g) ?? []).length, 3);
console.log('PASS raw prerender HTML: catalog plus 3 products, OG/Twitter/canonical, Product/Breadcrumb, full RSD prices/availability, sitemap and actual product content.');
// Local static server mirrors the bounded routes for hydration/runtime checks; not a substitute for Apache staging.
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost'), pathname = decodeURIComponent(url.pathname);
    let file = path.resolve(output, '.' + pathname), status = 200;
    if (!file.startsWith(output + path.sep) && file !== output) { response.writeHead(404).end(); return; }
    if ((await stat(file).catch(() => null))?.isDirectory()) file = path.join(file, 'index.html');
    if (!(await stat(file).catch(() => null))?.isFile()) {
      const productFallback = /^\/prodavnica\/[a-z0-9]+(?:-[a-z0-9]+)*\/?$/.test(pathname);
      const allowed = productFallback || /^\/(?:korpa|porudzbina(?:\/uspesno)?|admin(?:\/.*)?|vesti\/[^/]+)\/?$/.test(pathname);
      status = allowed ? 200 : 404; file = path.join(output, status === 404 ? '404/index.html' : 'index.html');
      if (productFallback) response.setHeader('X-Robots-Tag', 'noindex, nofollow');
    }
    if (/^\/(?:korpa|porudzbina|admin)(?:\/|$)/.test(pathname)) response.setHeader('X-Robots-Tag', 'noindex, nofollow');
    response.statusCode = status; response.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' })[path.extname(file)] ?? 'application/octet-stream'); response.end(await readFile(file));
  } catch { response.writeHead(500).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const errors = []; let inactive = false;
  const fresh = { ...seoProducts[0], slug: 'new-after-build' };
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'api.kmfcrvenazvezda.rs') {
      const product = [...seoProducts, fresh].find(product => '/shop/products/' + product.slug === url.pathname);
      if (url.pathname === '/shop/products') return route.fulfill({ json: { data: seoProducts, meta: { page: 1, totalPages: 1, total: 3, limit: 50 } } });
      if (url.pathname.startsWith('/shop/products/')) return route.fulfill({ status: product && !inactive ? 200 : 404, json: product && !inactive ? product : {} });
      return route.fulfill({ json: { data: [], meta: { page: 1, totalPages: 0, total: 0, limit: 50 } } });
    }
    if (url.origin === base) return route.continue();
    return route.fulfill({ body: '' });
  });
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/prodavnica'); await page.locator('.shop-grid').waitFor();
  assert.equal(await page.title(), 'Продавница КМФ Црвена звезда | Званична колекција');
  const productResponse = await page.goto(base + '/prodavnica/' + seoProducts[0].slug); assert.equal(productResponse.status(), 200);
  await page.locator('.shop-info').waitFor();
  await page.waitForFunction(() => [...document.querySelectorAll('script[type="application/ld+json"]')].filter(node => JSON.parse(node.textContent)['@type'] === 'Product').length === 1);
  assert.equal(await page.locator('link[rel="canonical"]').count(), 1);
  for (const url of ['/korpa', '/porudzbina', '/porudzbina/uspesno']) {
    const response = await page.goto(base + url); assert.equal(response.status(), 200); assert.equal(response.headers()['x-robots-tag'], 'noindex, nofollow');
    await page.waitForFunction(() => document.querySelector('meta[name="robots"]')?.content === 'noindex, nofollow');
    assert.equal(await page.locator('script[type="application/ld+json"]').count(), 0);
  }
  const missing = await page.goto(base + '/prodavnica/fake-product'); assert.equal(missing.status(), 200); assert.equal(missing.headers()['x-robots-tag'], 'noindex, nofollow');
  await page.getByRole('heading', { name: 'ПРОИЗВОД НИЈЕ ПРОНАЂЕН', exact: true }).waitFor();
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow'); assert.equal(await page.locator('script[type="application/ld+json"]').count(), 0);
  inactive = true; await page.goto(base + '/prodavnica/' + seoProducts[0].slug); await page.getByRole('heading', { name: 'ПРОИЗВОД НИЈЕ ПРОНАЂЕН', exact: true }).waitFor();
  assert.equal(await page.locator('script[type="application/ld+json"]').count(), 0); inactive = false;
  const added = await page.goto(base + '/prodavnica/new-after-build'); assert.equal(added.status(), 200); assert.equal(added.headers()['x-robots-tag'], 'noindex, nofollow'); await page.locator('.shop-info').waitFor();
  assert.doesNotMatch(sitemap, /new-after-build/);
  const fake = await context.request.get(base + '/fake-public'); assert.equal(fake.status(), 404);
  const nestedFake = await context.request.get(base + '/prodavnica/fake/extra'); assert.equal(nestedFake.status(), 404);
  const admin = await context.request.get(base + '/admin/shop/orders'); assert.equal(admin.status(), 200);
  const news = await context.request.get(base + '/vesti/new-article'); assert.equal(news.status(), 200);
  assert.deepEqual(errors, []);
  console.log('PASS runtime/hydration: single JSON-LD/canonical, private noindex, missing/inactive product, new-product fallback, fake 404, admin/news fallback; no runtime errors.');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
