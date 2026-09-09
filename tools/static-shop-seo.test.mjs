import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { activeProducts, appendShopSitemap, fetchActiveProducts } from './static-shop-seo.mjs';
import { createSitemapXml } from './static-news-seo.mjs';
const source = await readFile(new URL('../src/app/core/shop/shop-seo.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { productSeo, SHOP_TITLE, SHOP_DESCRIPTION } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
const site = 'https://kmfcrvenazvezda.rs';
const product = { slug: 'test-majica', active: true, name: { sr: 'Клупска мајица' }, description: { sr: '<p>Памучна одећа &amp; опрема.</p>' }, priceMinor: 320050, availability: 'AVAILABLE', coverImage: { url: '/images/test.jpg' }, gallery: [] };
test('public catalog has exact requested indexable metadata', async () => {
  assert.equal(SHOP_TITLE, 'Продавница КМФ Црвена звезда | Званична колекција'); assert.match(SHOP_DESCRIPTION, /Званична продавница КМФ Црвена звезда/);
  const component = await readFile(new URL('../src/app/pages/shop/catalog-page.component.ts', import.meta.url), 'utf8');
  assert.match(component, /robots: 'index, follow'/); assert.match(component, /this.load\(true\)/);
});
test('Product/Breadcrumb metadata uses canonical, full actual RSD price, HTTPS images and no fabricated identifiers/ratings', () => {
  const seo = productSeo(product, site), schema = seo.schema.find(item => item['@type'] === 'Product');
  assert.equal(seo.title, 'Клупска мајица | КМФ Црвена звезда'); assert.equal(seo.robots, 'index, follow'); assert.equal(seo.path, '/prodavnica/test-majica');
  assert.equal(schema.offers.price, '3200.50'); assert.equal(schema.offers.priceCurrency, 'RSD'); assert.equal(schema.offers.url, site + seo.path);
  assert.deepEqual(schema.image, [site + '/images/test.jpg']); assert.equal(schema.brand.name, 'KMF Crvena zvezda');
  assert.equal(schema.description, 'Памучна одећа & опрема.');
  assert.equal(seo.schema.filter(item => item['@type'] === 'BreadcrumbList').length, 1);
  assert.doesNotMatch(JSON.stringify(schema), /aggregateRating|review|gtin|mpn|2560/);
});
test('availability maps AVAILABLE, SOLD_OUT and the standard MadeToOrder member', () => {
  for (const [availability, expected] of [['AVAILABLE', 'InStock'], ['SOLD_OUT', 'OutOfStock'], ['MADE_TO_ORDER', 'MadeToOrder']]) {
    assert.equal(productSeo({ ...product, availability }, site).schema[1].offers.availability, 'https://schema.org/' + expected);
  }
});
test('SEO description is bounded/plain text and unsafe images fall back safely', () => {
  const seo = productSeo({ ...product, description: { sr: '<script>secret()</script>' + 'Одећа '.repeat(100) }, coverImage: { url: 'javascript:alert(1)' } }, site);
  assert.ok(seo.description.length <= 160); assert.doesNotMatch(seo.description, /script|secret|</); assert.equal(seo.image, site + '/images/logo-kmf-crvena-zvezda.png');
});
test('Shop sitemap preserves news and includes only active valid product slugs; private flows never enter it', () => {
  const original = createSitemapXml([{ slug: 'objavljena-vest', published: true }], site);
  const sitemap = appendShopSitemap(original, [product, { ...product, slug: 'inactive', active: false }, { ...product, slug: '../escape' }, product], site);
  assert.match(sitemap, /<loc>https:\/\/kmfcrvenazvezda.rs\/prodavnica<\/loc>/); assert.match(sitemap, /\/prodavnica\/test-majica/); assert.match(sitemap, /\/vesti\/objavljena-vest/);
  assert.equal((sitemap.match(/\/prodavnica\/test-majica/g) ?? []).length, 1); assert.doesNotMatch(sitemap, /inactive|escape|korpa|porudzbina|admin/);
});
test('public API collector reads all pages, filters inactive and fails closed on errors and malformed data', async () => {
  const calls = [];
  const products = await fetchActiveProducts('https://api.example.invalid', async url => { calls.push(url.href); return { ok: true, json: async () => ({ data: url.searchParams.get('page') === '1' ? [product] : [{ ...product, slug: 'second' }, { ...product, slug: 'inactive', active: false }], meta: { totalPages: 2 } }) }; });
  assert.equal(calls.length, 2); assert.deepEqual(products.map(item => item.slug), ['test-majica', 'second']);
  await assert.rejects(fetchActiveProducts('https://api.example.invalid', async () => ({ ok: false, status: 404 })), /HTTP 404/);
  await assert.rejects(fetchActiveProducts('https://api.example.invalid', async () => ({ ok: true, json: async () => ({ data: null }) })), /invalid/);
  await assert.rejects(fetchActiveProducts('http://unsafe.example.invalid'), /HTTPS/);
  assert.deepEqual(activeProducts([{ ...product, active: false }]), []);
});
test('private cart/checkout/success use noindex, nofollow and no structured data', async () => {
  for (const file of ['cart-page.component.ts', 'checkout-page.component.ts', 'order-success.component.ts']) {
    const source = await readFile(new URL('../src/app/pages/shop/' + file, import.meta.url), 'utf8'); assert.match(source, /robots: 'noindex, nofollow', schema: \[\]/);
  }
});
test('missing product runtime clears Product data; shared JSON-LD serializer escapes script delimiters', async () => {
  const component = await readFile(new URL('../src/app/pages/shop/product-page.component.ts', import.meta.url), 'utf8');
  assert.match(component, /error.status === 404/); assert.match(component, /robots: 'noindex, nofollow', schema: \[\]/);
  const service = await readFile(new URL('../src/app/core/seo/seo.service.ts', import.meta.url), 'utf8');
  assert.match(service, /querySelectorAll\('script\[data-seo-jsonld="true"\]'\).forEach\(\(node\) => node.remove\(\)\)/);
  const expression = service.match(/script.textContent = (.*);/)[1];
  const malicious = { name: '</script><script>alert(1)</script>' };
  const serialized = new Function('item', `return ${expression}`)(malicious);
  assert.doesNotMatch(serialized, /<\/script>/); assert.deepEqual(JSON.parse(serialized), malicious);
});
test('prerender includes catalog and active slugs without a frontend Node server; news path remains present', async () => {
  const routes = await readFile(new URL('../src/app/app.routes.server.ts', import.meta.url), 'utf8');
  assert.match(routes, /path: 'prodavnica', renderMode: RenderMode.Prerender/); assert.match(routes, /path: 'prodavnica\/:slug', renderMode: RenderMode.Prerender/);
  assert.match(routes, /fetchActiveProducts\(apiBaseUrl\)/); assert.match(routes, /path: 'vesti\/:slug'/);
});
// Interpret the actual RewriteRule/RewriteCond file for filesystem/routing cases.
// This validates ordering/patterns without claiming to run Apache in this Windows environment.
test('bounded Apache rules preserve fake URL 404, files, news, admin, well-known and canonical redirect', async () => {
  const config = await readFile(new URL('../public/.htaccess', import.meta.url), 'utf8');
  const lines = config.split(/\r?\n/).map(line => line.trim());
  const files = new Set(['/index.html', '/prodavnica/index.html', '/prodavnica/test-majica/index.html', '/tim/index.html', '/vesti/old-news/index.html']);
  const directories = new Set(['/prodavnica', '/prodavnica/test-majica', '/tim', '/vesti/old-news']);
  function route(requestPath, host = 'kmfcrvenazvezda.rs') {
    let conditions = [];
    for (const line of lines) {
      if (line.startsWith('RewriteCond ')) { conditions.push(line); continue; }
      if (!line.startsWith('RewriteRule ')) continue;
      const [, pattern, target, flags = ''] = line.split(/\s+/);
      const ruleConditions = conditions; conditions = [];
      const tests = ruleConditions.map(condition => {
        const [, variable, pattern] = condition.split(/\s+/);
        const value = variable === '%{HTTP_HOST}' ? host : requestPath.replace(/\/$/, '') + (variable.endsWith('/index.html') ? '/index.html' : '');
        return pattern === '-f' ? files.has(value) : pattern === '-d' ? directories.has(value) : new RegExp(pattern, 'i').test(value);
      });
      if (tests.length && !(ruleConditions.some(c => c.includes('[OR]')) ? tests.some(Boolean) : tests.every(Boolean))) continue;
      if (!new RegExp(pattern).test(requestPath.slice(1))) continue;
      if (flags.includes('R=301')) return 301;
      if (flags.includes('R=404')) return 404;
      if (flags.includes('L')) return target === '-' && requestPath.startsWith('/.well-known') ? 'bypass' : 200;
    }
    return 404;
  }
  for (const url of ['/prodavnica', '/prodavnica/test-majica', '/prodavnica/new-product', '/prodavnica/fake-product', '/korpa', '/porudzbina', '/porudzbina/uspesno', '/admin/shop/orders', '/vesti/old-news', '/vesti/new-news', '/tim', '/index.html']) assert.equal(route(url), 200, url);
  for (const url of ['/fake-public', '/prodavnica/fake/extra', '/porudzbina/extra', '/korpa/extra', '/404']) assert.equal(route(url), 404, url);
  assert.equal(route('/.well-known/acme-challenge/test'), 'bypass'); assert.equal(route('/prodavnica', 'www.kmfcrvenazvezda.rs'), 301);
  assert.match(config, /Header always set X-Robots-Tag "noindex, nofollow" env=REDIRECT_KMF_PRODUCT_FALLBACK/);
  assert.match(config, /SetEnvIf Request_URI "\^\/\(\?:korpa\|porudzbina/);
});
