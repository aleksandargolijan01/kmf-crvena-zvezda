// Serve real production prerender files. Every API/image fixture is local; no CMS writes.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { currentNews, partners, pageResponse } from './homepage-freshness.fixtures.mjs';

if (!process.env.SHOP_PLAYWRIGHT_MODULE) throw Error('Set SHOP_PLAYWRIGHT_MODULE to playwright/index.mjs.');
const engines = await import(pathToFileURL(process.env.SHOP_PLAYWRIGHT_MODULE));
const output = path.resolve(process.env.HOMEPAGE_BUILD_DIR ?? '.tmp/homepage-freshness-build/browser');
const html = await readFile(path.join(output, 'index.html'), 'utf8');
assert.match(html, /September 16/, 'Build with homepage-freshness.fixture-loader.mjs first.');
assert.equal((html.match(/<app-sponsor-logo/g) ?? []).length, 3);
assert.match(html, /id="ng-state"/);
assert.match(html, /class="club-partners"/);
assert.doesNotMatch(html, /top-sponsors/);
assert.match(html, /rel="canonical"/);
assert.match(html, /application\/ld\+json/);
const mime = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  try {
    let file = path.resolve(output, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (file !== output && !file.startsWith(output + path.sep)) return res.writeHead(403).end();
    if ((await stat(file).catch(() => null))?.isDirectory()) file = path.join(file, 'index.html');
    res.setHeader('Content-Type', mime[path.extname(file)] ?? 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="148" height="52"><rect width="148" height="52" fill="#c90020"/><text x="20" y="32" fill="white">Partner</text></svg>';
const gate = () => { let release; const promise = new Promise(resolve => { release = resolve; }); return { promise, release }; };

async function fixture(browser, width, { earlyFailure = false, brokenLogo = false, failure = false, empty = false, language = 'sr' } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 950 }, reducedMotion: 'reduce' });
  const apiGate = gate(), scriptGate = gate(), imageGate = gate();
  if (!earlyFailure) scriptGate.release();
  const state = { news: currentNews, partners: partners(5, 'new'), calls: [], errors: [] };
  if (empty) { state.news = []; state.partners = []; }
  await context.addInitScript(lang => localStorage.setItem('kmf-czv-language', lang), language);
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'api.kmfcrvenazvezda.rs') {
      state.calls.push(url.pathname + url.search);
      if (url.pathname === '/news' || url.pathname === '/sponsors/grouped') {
        await apiGate.promise;
        if (failure) return route.fulfill({ status: 503, json: { message: 'Fixture outage' } });
        return route.fulfill({ json: url.pathname === '/news' ? pageResponse(state.news) : state.partners });
      }
      return route.fulfill({ json: pageResponse([]) });
    }
    if (url.origin !== base) return route.abort();
    if (url.pathname.endsWith('.js')) { await scriptGate.promise; return route.continue(); }
    if (url.pathname.startsWith('/fixture-logos/')) {
      if (earlyFailure && url.pathname.includes('/old-')) return route.fulfill({ status: 404, body: '' });
      if (brokenLogo && url.pathname.endsWith('/new-0.svg')) return route.fulfill({ status: 404, body: '' });
      if (url.pathname.includes('/new-')) await imageGate.promise;
      return route.fulfill({ contentType: 'image/svg+xml', body: svg });
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', e => state.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && /NG0\d+/.test(m.text())) state.errors.push(m.text()); });
  return { page, context, state, apiGate, scriptGate, imageGate };
}

async function decoded(page, selector, count) {
  await page.locator(selector).first().scrollIntoViewIfNeeded();
  await page.waitForFunction(({ selector, count }) => {
    const imgs = [...document.querySelectorAll(selector)];
    return imgs.length === count && imgs.every(i => i.complete && i.naturalWidth > 0 && i.getBoundingClientRect().width > 0 && i.getBoundingClientRect().height > 0);
  }, { selector, count });
  await page.locator(selector).evaluateAll(images => Promise.all(images.map(image => image.decode())));
}

try {
  for (const name of (process.env.HOMEPAGE_BROWSERS ?? 'chromium').split(',')) {
    const browser = await engines[name].launch({ headless: true, ...(name === 'chromium' ? { channel: process.env.HOMEPAGE_CHROMIUM_CHANNEL ?? 'msedge' } : {}) });
    try {
      for (const width of [1440, 390]) {
        const f = await fixture(browser, width);
        try {
          const requested = Promise.all(['/news', '/sponsors/grouped'].map(p => f.page.waitForRequest(r => new URL(r.url()).pathname === p)));
          await f.page.goto(base + '/');
          await requested;
          // Model the suspected cosmetic selector, not any particular extension's behavior.
          await f.page.addStyleTag({ content: '.top-sponsors { display: none !important; }' });
          assert.equal(await f.page.locator('.top-sponsors').count(), 0);
          assert.equal(await f.page.locator('.club-partners').evaluate(section => {
            const rect = section.getBoundingClientRect();
            return getComputedStyle(section).display === 'grid' && rect.width > 0 && rect.height > 0;
          }), true);
          assert.equal(await f.page.locator('.club-partners app-sponsor-logo').count(), 3);
          assert.match(await f.page.locator('.compact-news-list').textContent(), /September 16/);
          const title = await f.page.title(), canonical = await f.page.locator('link[rel="canonical"]').getAttribute('href');
          f.apiGate.release();
          await f.page.waitForFunction(() => document.querySelectorAll('.club-partners app-sponsor-logo').length === 5);
          await f.page.waitForFunction(() => document.querySelector('.compact-news-list')?.textContent.includes('October 23'));
          await f.page.locator('.club-partners').scrollIntoViewIfNeeded();
          // Pending loads are not incorrectly replaced by the name fallback.
          assert.equal(await f.page.locator('.club-partners img').count(), 5);
          // Firefox may retain the previous decoded image while a changed src is pending.
          await f.page.waitForFunction(() => [...document.querySelectorAll('.club-partners img')].every(i => !i.complete));
          f.imageGate.release();
          await decoded(f.page, '.club-partners img', 5);
          assert.deepEqual(await f.page.locator('.compact-news-list h3').allTextContents(), ['October 23', 'October 22', 'October 21']);
          assert.equal(f.state.calls.filter(p => p.startsWith('/news?')).length, 1);
          assert.equal(f.state.calls.filter(p => p === '/sponsors/grouped').length, 1);
          assert.ok(!f.state.calls.some(p => p.includes('/news?') && p.includes('featured')));
          assert.equal(await f.page.title(), title);
          assert.equal(await f.page.locator('link[rel="canonical"]').getAttribute('href'), canonical);
          assert.equal(await f.page.locator('.team-brush img').getAttribute('loading'), 'lazy');
          assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
          await mkdir('test-results/homepage', { recursive: true });
          await f.page.screenshot({ path: `test-results/homepage/${name}-${width}.png` });
          // SPA navigation refreshes the same endpoint without the previous five-minute cache.
          await f.page.locator('.news-list-panel a[href="/vesti"]').click();
          await f.page.waitForSelector('app-news-page');
          await f.page.waitForFunction(() => document.querySelector('app-news-page')?.textContent.includes('October 23'));
          f.state.partners = partners(4, 'updated');
          await f.page.locator('app-footer a[href="/prijatelji-kluba"]').first().click();
          await decoded(f.page, '.sponsor-packages img', 4);
          // Return to home using its real router link, keeping service instances alive.
          await f.page.locator('app-footer a[href="/"]').first().click();
          await decoded(f.page, '.club-partners img', 4);
          assert.ok((await f.page.locator('.club-partners img').first().getAttribute('src')).includes('updated-0'));
          assert.deepEqual(f.state.errors, []);
          console.log(`PASS ${name} ${width}px: stale SSR -> fresh latest news / 5 partners, slow image decode, SPA updates/removal, SEO/layout/lazy images.`);
        } finally { f.apiGate.release(); f.scriptGate.release(); f.imageGate.release(); await f.context.close(); }
      }

      // Errors before Angular bootstraps are not replayed by a native image error listener.
      const early = await fixture(browser, 390, { earlyFailure: true });
      try {
        await early.page.goto(base + '/', { waitUntil: 'commit' });
        await early.page.locator('.club-partners').scrollIntoViewIfNeeded();
        await early.page.waitForFunction(() => [...document.querySelectorAll('.club-partners img')].length === 3 && [...document.querySelectorAll('.club-partners img')].every(i => i.complete && i.naturalWidth === 0));
        early.scriptGate.release();
        await early.page.waitForFunction(() => document.querySelectorAll('.club-partners .sponsor-logo span').length === 3);
        early.apiGate.release(); early.imageGate.release();
        await decoded(early.page, '.club-partners img', 5);
        assert.deepEqual(early.state.errors, []);
        console.log(`PASS ${name}: pre-hydration image errors show partner names; changed URLs recover on the same partner IDs.`);
      } finally { early.apiGate.release(); early.scriptGate.release(); early.imageGate.release(); await early.context.close(); }

      const broken = await fixture(browser, 390, { brokenLogo: true });
      try {
        broken.apiGate.release(); broken.imageGate.release();
        await broken.page.goto(base + '/');
        await broken.page.waitForFunction(() => document.querySelectorAll('.club-partners .sponsor-logo span').length === 1);
        await decoded(broken.page, '.club-partners img', 4);
        assert.equal(await broken.page.locator('.club-partners app-sponsor-logo').count(), 5);
        assert.equal(await broken.page.locator('.club-partners .sponsor-logo span').textContent(), 'Partner 0');
        assert.deepEqual(broken.state.errors, []);
        console.log(`PASS ${name}: a failed current logo keeps the partner/link visible by name without retry loops.`);
      } finally { broken.apiGate.release(); broken.imageGate.release(); await broken.context.close(); }

      for (const scenario of [{ failure: true }, { empty: true }]) {
        const f = await fixture(browser, 1440, scenario);
        try {
          const responses = Promise.all(['/news', '/sponsors/grouped'].map(p => f.page.waitForResponse(r => new URL(r.url()).pathname === p)));
          f.apiGate.release(); f.imageGate.release();
          await f.page.goto(base + '/'); await responses;
          if (scenario.empty) {
            await f.page.waitForFunction(() => document.querySelectorAll('.club-partners app-sponsor-logo').length === 0 && document.querySelectorAll('.compact-news-list article').length === 0);
          } else {
            await decoded(f.page, '.club-partners img', 3);
            assert.match(await f.page.locator('.compact-news-list').textContent(), /September 16/);
          }
          assert.deepEqual(f.state.errors, []);
          console.log(`PASS ${name}: ${scenario.empty ? 'empty current API clears snapshot' : 'API outage preserves snapshot'}.`);
        } finally { f.apiGate.release(); f.imageGate.release(); await f.context.close(); }
      }

      for (const route of ['/vesti', '/prijatelji-kluba']) {
        const f = await fixture(browser, 390, { language: route === '/vesti' ? 'en' : 'ru' });
        try {
          f.apiGate.release(); f.imageGate.release();
          await f.page.goto(base + route);
          if (route === '/vesti') await f.page.waitForFunction(() => document.querySelector('app-news-page')?.textContent.includes('October EN 23'));
          else await decoded(f.page, '.sponsor-packages img', 5);
          assert.deepEqual(f.state.errors, []);
          console.log(`PASS ${name}: direct ${route} refreshes transferred snapshot with saved language.`);
        } finally { f.apiGate.release(); f.imageGate.release(); await f.context.close(); }
      }
      const noJs = await browser.newContext({ javaScriptEnabled: false });
      try {
        const page = await noJs.newPage(); await page.goto(base + '/');
        assert.equal(await page.locator('.club-partners app-sponsor-logo').count(), 3);
        assert.match(await page.locator('.compact-news-list').textContent(), /September 16/);
        assert.ok(await page.locator('meta[name="description"]').getAttribute('content'));
        console.log(`PASS ${name}: no-JavaScript prerendered content and metadata retained.`);
      } finally { await noJs.close(); }
    } finally { await browser.close(); }
  }
} finally { await new Promise(resolve => server.close(resolve)); }
