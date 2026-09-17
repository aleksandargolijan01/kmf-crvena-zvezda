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

const categories = ['naslovni-sponzor', 'zlatni-sponzori', 'srebrni-sponzori', 'bronzani-sponzori', 'prijatelji-kluba'].map((slug, index) => ({
  id: 'cat' + index, slug, name_sr: ['Насловни спонзор', 'Златни спонзори', 'Сребрни спонзори', 'Бронзани спонзори', 'Пријатељи клуба'][index],
  name_en: ['Title sponsor', 'Gold sponsors', 'Silver sponsors', 'Bronze sponsors', 'Friends of the club'][index],
  name_ru: 'Старый перевод', order: index, active: true,
  sponsors: index ? [{ id: 'partner' + index, name: 'Partner ' + index, categoryId: 'cat' + index, order: index, active: true, featured: false, logoUrl: '/images/logo-kmf-crvena-zvezda.png', websiteUrl: 'https://example.invalid/partner' + index }] : []
}));
const pageResponse = data => ({ data, meta: { page: 1, totalPages: 1, total: data.length, limit: 50 } });
const labels = { sr: ['Главни партнер', 'Премијум партнер', 'Званични партнер', 'Клупски партнери'], en: ['Main partner', 'Premium partner', 'Official partner', 'Club partners'], ru: ['Главный партнёр', 'Премиум-партнёр', 'Официальный партнёр', 'Клубные партнёры'] };
let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  for (const width of [1440, 768, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    context.setDefaultTimeout(15000);
    const state = { sponsors: categories.flatMap(c => c.sponsors.map(s => ({ ...s, category: c }))), writes: [], categoryWrites: [], deletes: [], inquiries: [] };
    await context.route('**/*', async route => {
      const url = new URL(route.request().url()), method = route.request().method(), p = url.pathname;
      if (url.origin === base) return route.continue();
      if (p === '/sponsors/grouped') return route.fulfill({ json: categories });
      if (p === '/admin/sponsor-categories') return route.fulfill({ json: pageResponse(categories) });
      if (p.startsWith('/admin/sponsor-categories/')) { state.categoryWrites.push(route.request().postDataJSON()); return route.fulfill({ json: categories[1] }); }
      if (p.startsWith('/admin/sponsors')) {
        if (method === 'GET') return route.fulfill({ json: pageResponse(state.sponsors) });
        if (method === 'DELETE') { state.deletes.push(p); state.sponsors = state.sponsors.filter(s => !p.endsWith('/' + s.id)); return route.fulfill({ json: { success: true } }); }
        const body = route.request().postDataJSON(); state.writes.push(body);
        const id = method === 'PATCH' ? p.split('/').at(-1) : 'created-partner';
        state.sponsors = state.sponsors.filter(s => s.id !== id);
        const item = { ...body, id, category: categories.find(c => c.id === body.categoryId) }; state.sponsors.push(item);
        return route.fulfill({ json: item });
      }
      if (p === '/admin/media') return route.fulfill({ json: pageResponse([{ id: 'media1', originalName: 'Test logo', url: '/images/logo-kmf-crvena-zvezda.png' }]) });
      if (p === '/sponsor-inquiries') { state.inquiries.push(route.request().postDataJSON()); return route.fulfill({ json: { success: true } }); }
      return route.fulfill({ json: pageResponse([]) });
    });
    await context.addInitScript(() => {
      localStorage.setItem('kmf_admin_access_token', 'test.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) + '.test');
      localStorage.setItem('kmf_admin_user', JSON.stringify({ id: 'admin', role: 'ADMIN' }));
    });
    const page = await context.newPage(), errors = []; let loads = 0;
    page.on('pageerror', e => errors.push(e.message)); page.on('domcontentloaded', () => loads++);
    async function language(lang) {
      const before = loads;
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.waitForFunction(() => !document.querySelector('.site-header')?.classList.contains('header-hidden'));
      const mobile = !await page.locator('.language-trigger').isVisible();
      if (mobile) await page.locator('.nav-toggle').click();
      await page.locator('.language-trigger').click(); await page.locator('#language-' + lang).click();
      if (mobile) await page.locator('.nav-toggle').click();
      await page.waitForFunction(value => document.documentElement.lang === value, lang === 'sr' ? 'sr-Cyrl' : lang);
      assert.equal(loads, before);
    }
    await page.goto(base + '/');
    for (const lang of ['sr', 'en', 'ru']) {
      await language(lang);
      assert.equal((await page.locator('#sponsors-title').textContent()).trim(), translations[lang]['home.sponsors.title']);
      assert.equal(await page.locator('.top-sponsors .sponsor-logo').count(), 4);
      assert.equal((await page.locator('app-footer a[href="/prijatelji-kluba"]').first().textContent()).trim(), translations[lang]['nav.friends']);
      assert.equal((await page.locator('.site-nav a[href="/prijatelji-kluba"]').textContent()).trim(), translations[lang]['nav.friends']);
    }
    await page.goto(base + '/prijatelji-kluba');
    await page.locator('.package-block').first().waitFor();
    for (const lang of ['sr', 'en', 'ru']) {
      await language(lang);
      assert.equal((await page.locator('h1').textContent()).trim(), translations[lang]['friends.hero.title']);
      assert.deepEqual(await page.locator('.package-block h2').allTextContents(), labels[lang]);
      assert.equal(await page.locator('.package-block').count(), 4);
      assert.deepEqual(await page.locator('.package-block .sponsor-logo').evaluateAll(links => links.map(l => l.getAttribute('href'))), [1,2,3,4].map(i => 'https://example.invalid/partner' + i));
      assert.match(await page.title(), new RegExp(translations[lang]['friends.hero.title']));
      assert.equal(await page.locator('meta[property="og:title"]').getAttribute('content'), await page.title());
      assert.equal(await page.locator('meta[name="description"]').getAttribute('content'), translations[lang]['friends.hero.text']);
      assert.equal(await page.locator('meta[property="og:description"]').getAttribute('content'), translations[lang]['friends.hero.text']);
      assert.ok((await page.locator('link[rel="canonical"]').getAttribute('href')).endsWith('/prijatelji-kluba'));
      const crumb = await page.locator('script[data-seo-jsonld]').evaluateAll(nodes => nodes.map(n => JSON.parse(n.textContent)).find(n => n['@type'] === 'BreadcrumbList'));
      assert.equal(crumb.itemListElement[1].name, translations[lang]['nav.friends']);
      const cta = page.locator('.page-hero .btn'); assert.equal(await cta.innerText(), translations[lang]['friends.hero.cta']);
      await cta.click(); await page.waitForURL('**/prijatelji-kluba#sponsor-form');
      assert.ok(await page.locator('#sponsor-form').isVisible());
      await page.locator('.sponsor-package-trigger').click();
      await page.getByRole('option').first().waitFor();
      assert.deepEqual((await page.getByRole('option').allTextContents()).slice(0, 4).map(s => s.trim()), labels[lang]);
      await page.getByRole('option').first().click();
      await page.getByRole('listbox').waitFor({ state: 'hidden' });
      assert.equal((await page.locator('.sponsor-package-trigger').innerText()).replace('⌄', '').trim(), labels[lang][0]);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.doesNotMatch(await page.locator('main').innerText(), /спонзор|спонсор|sponsor|Насловни/i);
    }
    for (const [field, value] of Object.entries({ fullName: 'Test Person', companyName: 'Test Company', email: 'test@example.invalid', message: 'Test partnership inquiry' })) await page.locator('#sponsor-form [formcontrolname="' + field + '"]').fill(value);
    await page.locator('#sponsor-form [formcontrolname="consent"]').check(); await page.locator('#sponsor-form button[type="submit"]').click();
    await page.locator('.sponsor-inquiry-status').waitFor(); assert.equal(state.inquiries[0].sponsorshipPackage, labels.ru[0]);
    await page.goto(base + '/admin/sponsors'); await page.getByRole('heading', { name: 'Партнери', exact: true }).waitFor();
    const select = page.locator('select[formcontrolname="categoryId"]');
    await page.waitForFunction(() => document.querySelector('select[formcontrolname="categoryId"]')?.options.length === 5).catch(async error => { console.error(await page.locator('main').innerText(), errors); throw error; });
    assert.deepEqual((await select.locator('option').allTextContents()).slice(1), labels.sr);
    await page.locator('[formcontrolname="name"]').fill('New partner');
    await page.locator('[formcontrolname="websiteUrl"]').fill('https://example.invalid/new');
    await select.selectOption('cat1'); await page.locator('[formcontrolname="order"]').last().fill('7');
    await page.locator('.media-picker-row button').first().click();
    await page.getByRole('button', { name: 'Сачувај партнера', exact: true }).click();
    await page.getByText('Партнер је сачуван.', { exact: true }).waitFor();
    assert.equal(state.writes[0].categoryId, 'cat1'); assert.equal(state.writes[0].logoId, 'media1'); assert.equal(state.writes[0].order, 7);
    await page.locator('.sponsor-list button').filter({ hasText: 'New partner' }).click();
    await page.locator('[formcontrolname="name"]').fill('Edited partner'); await select.selectOption('cat2');
    const updated = page.waitForResponse(r => r.request().method() === 'PATCH' && r.url().includes('/admin/sponsors/'));
    await page.getByRole('button', { name: 'Сачувај партнера', exact: true }).click(); await updated;
    assert.equal(state.writes[1].categoryId, 'cat2');
    await page.locator('.sponsor-list button').filter({ hasText: 'Edited partner' }).click();
    page.once('dialog', d => d.accept()); await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByText('Партнер је обрисан.', { exact: true }).waitFor(); assert.equal(state.deletes.length, 1);
    await page.getByRole('button', { name: 'Kategorije', exact: true }).click();
    await page.locator('.category-list button').filter({ hasText: labels.sr[0] }).click();
    assert.equal(await page.locator('[formcontrolname="name_sr"]').inputValue(), labels.sr[0]);
    await page.locator('.compact-form [formcontrolname="order"]').fill('8');
    await page.getByRole('button', { name: 'Sacuvaj', exact: true }).click(); await page.getByText('Kategorija je sacuvana.', { exact: true }).waitFor();
    assert.equal(state.categoryWrites[0].order, 8); assert.equal('name_sr' in state.categoryWrites[0], false); assert.equal('slug' in state.categoryWrites[0], false);
    assert.deepEqual(errors, []); await context.close();
    console.log('PASS partners ' + width + 'px: SR/EN/RU, live SEO/OG/breadcrumb, stable route/logo links, four categories, inquiry, CMS labels/create/edit/delete/order/logo and preserved identifiers.');
  }
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
