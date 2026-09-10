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
    const context = await browser.newContext({ viewport: { width, height: 1000 }, hasTouch: width <= 768, reducedMotion: 'reduce' });
    context.setDefaultTimeout(12000);
    let currentProducts = structuredClone(products);
    let emptyFeatured = false;
    let failCatalog = false;
    let catalogRequests = 0;
    let managementRequests = 0;
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/management') || url.pathname.endsWith('/board-members')) {
        managementRequests++;
        const board = url.pathname.endsWith('/board-members');
        return route.fulfill({ json: [{ id: board ? 'board-test' : 'management-test', fullName: board ? 'Тест члан одбора' : 'Тест члан управе', role_sr: 'Члан', bio_sr: 'Опис члана', imageUrl: `${base}/images/logo-kmf-crvena-zvezda.png` }] });
      }
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
    const leadershipPreview = page.locator('#uprava');
    assert.equal(await leadershipPreview.locator('.person-card, img, .leadership-grid').count(), 0, 'homepage has no management cards or photos');
    assert.equal(managementRequests, 0, 'homepage does not fetch management/board members');
    assert.match(await leadershipPreview.locator('h2').innerText(), /ОЗБИЉАН СИСТЕМ ИЗА СВАКОГ РЕЗУЛТАТА\./);
    assert.equal(await leadershipPreview.locator('a').count(), 2);
    const managementLink = leadershipPreview.getByRole('link', { name: /^ПОГЛЕДАЈ УПРАВУ/ });
    const boardLink = leadershipPreview.getByRole('link', { name: /^УПРАВНИ ОДБОР/ });
    assert.equal(await managementLink.getAttribute('href'), '/uprava');
    assert.equal(await boardLink.getAttribute('href'), '/upravni-odbor');
    await leadershipPreview.scrollIntoViewIfNeeded();
    const primaryBox = await managementLink.boundingBox(), secondaryBox = await boardLink.boundingBox();
    assert.ok(primaryBox.width > 0 && secondaryBox.height >= 44);
    if (width >= 768) assert.ok(Math.abs(primaryBox.y - secondaryBox.y) < 1, 'desktop/tablet CTA row');
    else assert.ok(secondaryBox.y >= primaryBox.y + primaryBox.height, 'mobile CTA stack');
    assert.equal(await leadershipPreview.evaluate(el => {
      const section = el.getBoundingClientRect();
      const actions = el.querySelector('.leadership-actions').getBoundingClientRect();
      const next = el.nextElementSibling.getBoundingClientRect();
      return section.bottom - actions.bottom <= 60 && Math.abs(next.top - section.bottom) < 1
        && [...el.querySelectorAll('h2, a')].every(child => { const box = child.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth; });
    }), true, 'compact section with no blank card space or horizontal overflow');
    assert.equal(await leadershipPreview.evaluate(el => el.previousElementSibling.tagName === 'APP-SHOP-CAROUSEL' && el.nextElementSibling.id === 'prijatelji'), true);
    await page.keyboard.press('Tab');
    await boardLink.focus();
    assert.equal(await boardLink.evaluate(el => getComputedStyle(el).outlineStyle), 'solid');
    await screenshot(page, `leadership-preview-${width}`, leadershipPreview);
    await boardLink.press('Enter');
    await page.waitForURL('**/upravni-odbor');
    await page.locator('app-board-page .person-card h3').filter({ hasText: 'Тест члан одбора' }).waitFor();
    assert.equal(await page.locator('app-board-page .person-card img').count(), 1);
    await page.goBack();
    await page.locator('#uprava a[href="/uprava"]').click();
    await page.waitForURL('**/uprava');
    await page.locator('app-leadership-page .person-card h3').filter({ hasText: 'Тест члан управе' }).waitFor();
    assert.equal(await page.locator('app-leadership-page .person-card img').count(), 1);
    await page.goBack();
    await page.locator('.shop-home').waitFor();
    assert.equal(await page.locator('app-shop-carousel').evaluate((el) => el.previousElementSibling.id === 'klub' && el.nextElementSibling.id === 'uprava'), true);
    assert.equal(await page.locator('.shop-track app-product-card').count(), 4);
    assert.equal(await page.locator('.shop-track h3').first().innerText(), names[3].toUpperCase());
    assert.equal(await page.locator('.shop-track app-product-card a').first().getAttribute('href'), '/prodavnica/proizvod-4');
    assert.match(await page.locator('.shop-track .product-copy p').first().innerText(), /3\.500 RSD/);
    assert.equal(await page.locator('.shop-track img').first().getAttribute('src'), products[3].coverImage.url);
    const track = page.locator('.shop-track');
    await page.getByRole('button', { name: 'Следећи производи', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.shop-track').scrollLeft > 10);
    await screenshot(page, `carousel-${width}`, page.locator('.shop-home'));
    assert.equal(await track.evaluate(el => getComputedStyle(el).scrollbarWidth), 'none');
    assert.equal(await track.evaluate(el => getComputedStyle(el, '::-webkit-scrollbar').display), 'none');
    const scrollBefore = await track.evaluate(el => el.scrollLeft);
    const trackBox = await track.boundingBox();
    if (width <= 768) {
      const swipe = await context.newCDPSession(page);
      const x = trackBox.x + trackBox.width * .8, y = Math.max(100, trackBox.y + 170);
      await swipe.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
      for (let step = 1; step <= 6; step++) await swipe.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - step * trackBox.width / 10, y, id: 1 }] });
      await swipe.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await swipe.detach();
    } else {
      await page.mouse.move(trackBox.x + 100, trackBox.y + 170);
      await page.mouse.wheel(400, 0);
    }
    await page.waitForFunction(before => document.querySelector('.shop-track').scrollLeft > before + 10, scrollBefore);
    const promo = page.locator('.collection-card');
    await promo.scrollIntoViewIfNeeded();
    assert.equal(await promo.evaluate(el => el === el.parentElement.lastElementChild), true);
    assert.equal(await promo.getAttribute('href'), '/prodavnica');
    assert.equal(await promo.locator('a, button').count(), 0, 'no nested interactive controls');
    assert.equal(await promo.locator('img').getAttribute('alt'), '');
    assert.equal(await promo.locator('img').getAttribute('aria-hidden'), 'true');
    assert.match(await promo.innerText(), /НОСИ ЗВЕЗДУ\.\s+БУДИ ДЕО КЛУБА\./);
    assert.equal(await promo.locator('h3').evaluate(el => getComputedStyle(el).color), 'rgb(255, 255, 255)', 'heading contrast overrides global dark headings');
    assert.equal(await promo.evaluate(el => {
      const card = el.getBoundingClientRect();
      return [...el.querySelectorAll('h3, p, .collection-action')].every(child => {
        const box = child.getBoundingClientRect();
        return box.left >= card.left + 20 && box.right <= card.right - 20 && box.bottom <= card.bottom - 20 && child.scrollWidth <= child.clientWidth + 1;
      });
    }), true, 'promo text and CTA fit inside the card');
    assert.ok((await promo.locator('.collection-action').boundingBox()).height >= 44);
    assert.ok(await promo.locator('img').evaluate(el => parseFloat(getComputedStyle(el).transitionDuration) <= .001), 'reduced motion');
    await page.keyboard.press('Tab');
    await promo.focus();
    assert.equal(await promo.evaluate(el => getComputedStyle(el).outlineStyle), 'solid');
    await track.evaluate(el => el.scrollTo({ left: el.scrollWidth, behavior: 'instant' }));
    await page.waitForFunction(() => {
      const card = document.querySelector('.collection-card').getBoundingClientRect();
      const track = document.querySelector('.shop-track').getBoundingClientRect();
      return card.left >= track.left - 1 && card.right <= track.right + 1;
    });
    // Wait for touch momentum/scroll-snap to settle before capturing the promo.
    await track.evaluate(el => new Promise(resolve => {
      let last = el.scrollLeft, stable = 0;
      const settle = () => {
        stable = Math.abs(el.scrollLeft - last) < .1 ? stable + 1 : 0;
        last = el.scrollLeft;
        if (stable >= 12) resolve(); else requestAnimationFrame(settle);
      };
      requestAnimationFrame(settle);
    }));
    await promo.scrollIntoViewIfNeeded();
    await screenshot(page, `promo-card-${width}`, promo);
    await promo.press('Enter');
    await page.waitForURL('**/prodavnica');
    await page.goBack();
    await page.locator('.shop-home').waitFor();
    assert.equal(await page.locator('.all-products a').getAttribute('href'), '/prodavnica');
    await page.locator('.shop-track app-product-card a').first().click();
    await page.waitForURL('**/prodavnica/proizvod-4');
    await page.locator('.shop-info h1').waitFor();
    const viewCart = page.locator('.shop-cart-cta');
    const buyBox = await page.locator('.shop-buy').boundingBox(), viewCartBox = await viewCart.boundingBox();
    assert.equal(await viewCart.getAttribute('href'), '/korpa');
    assert.ok(viewCartBox.height >= 44 && viewCartBox.width < buyBox.width, 'secondary cart CTA stays touchable and compact');
    assert.ok(Math.abs(viewCartBox.x - buyBox.x) < 1 && viewCartBox.y >= buyBox.y + buyBox.height + 12, 'secondary CTA is left aligned below primary with a gap');
    assert.ok(viewCartBox.x >= 0 && viewCartBox.x + viewCartBox.width <= width);
    assert.equal(await viewCart.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)');
    assert.equal(await viewCart.evaluate(el => getComputedStyle(el).borderTopColor), 'rgb(213, 0, 18)');
    assert.equal(await viewCart.evaluate(el => getComputedStyle(el).fontFamily.split(',')[0].trim()), await page.locator('.shop-buy').evaluate(el => getComputedStyle(el).fontFamily.split(',')[0].trim()));
    await page.keyboard.press('Tab');
    await viewCart.focus();
    assert.equal(await viewCart.evaluate(el => getComputedStyle(el).outlineStyle), 'solid');
    if (width === 1440) {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await viewCart.hover();
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.shop-cart-cta')).color === 'rgb(255, 255, 255)');
      assert.equal(await viewCart.evaluate(el => getComputedStyle(el).transitionDuration), '0.2s, 0.2s, 0.2s');
      await page.mouse.move(0, 0);
      await page.emulateMedia({ reducedMotion: 'reduce' });
    }
    await screenshot(page, `product-cart-cta-${width}`, viewCart);
    await page.goBack();
    await page.locator('.shop-home').waitFor();
    await page.evaluate(() => window.scrollTo(0, 0));
    assert.equal(await page.locator('.header-cart').count(), 0);
    assert.equal(await page.locator('.floating-cart').count(), 0);
    await page.waitForFunction(() => !document.querySelector('.site-header').classList.contains('header-hidden'));
    if (width <= 1080) {
      await page.locator('.nav-toggle').click();
    }
    await page.locator('.site-nav a[href="/prodavnica"]').click();
    await page.locator('.shop-grid app-product-card').first().waitFor();
    assert.equal(await page.locator('.shop-grid app-product-card').count(), 6);
    assert.equal(await page.locator('.header-cart').isVisible(), true);
    const cartBounds = await page.locator('.header-cart').boundingBox(); assert.ok(cartBounds.x >= 0 && cartBounds.x + cartBounds.width <= width);
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
    currentProducts[0].coverImage = null;
    const featuredResponse = page.waitForResponse((response) => response.url().includes('/shop/products?') && response.url().includes('featured=true'));
    await page.goto(base); await featuredResponse;
    await page.waitForFunction(() => document.querySelector('app-shop-carousel') !== null);
    await page.locator('.shop-home').waitFor();
    assert.equal(await page.locator('.shop-track app-product-card').count(), currentProducts.length, 'active catalog is shown when no products are featured');
    assert.equal(await page.locator('.shop-track img').first().getAttribute('src'), currentProducts[0].gallery[0].url);
    currentProducts = [];
    const emptyCatalogResponse = page.waitForResponse(response => response.url().includes('/shop/products?') && !response.url().includes('featured=true'));
    await page.goto(base);
    await emptyCatalogResponse;
    assert.equal(await page.locator('.shop-home').count(), 0);
    await page.goto(`${base}/prodavnica`);
    await page.getByRole('heading', { name: 'КОЛЕКЦИЈА УСКОРО СТИЖЕ' }).waitFor();
    failCatalog = true;
    await page.reload();
    await page.getByText('Производи тренутно нису доступни. Покушајте поново.', { exact: true }).waitFor();
    failCatalog = false; emptyFeatured = false; currentProducts = structuredClone(products);
    await page.goto(`${base}/kontakt`);
    await page.locator('#klub').waitFor();
    assert.equal(await page.locator('app-shop-carousel').count(), 0, 'the homepage Shop section must not change the existing contact route');

    // Persistent cart UI on non-Shop routes, without modifying the saved cart on dismissal.
    await page.evaluate(() => localStorage.setItem('kmf_shop_cart', JSON.stringify({ version: 1, items: [{ variantId: 'v1', quantity: 2 }], updatedAt: new Date().toISOString() })));
    await page.goto(base);
    await page.locator('.floating-cart-open').waitFor();
    assert.match(await page.locator('.floating-cart-open').getAttribute('aria-label'), /2/);
    await page.evaluate(() => window.scrollTo({ top: 800, behavior: 'instant' }));
    await page.locator('.scroll-top.is-visible').waitFor();
    const bubble = await page.locator('.floating-cart').boundingBox();
    const topButton = await page.locator('.scroll-top').boundingBox();
    assert.ok(bubble.y + bubble.height + 8 <= topButton.y, 'cart is above back-to-top with a gap');
    assert.ok(bubble.x >= 0 && bubble.x + bubble.width <= width);
    await screenshot(page, `floating-${width}`, page.locator('.floating-cart'));
    if (artifactDir) await page.screenshot({ path: path.join(artifactDir, `floating-layout-${width}.png`) });
    const savedCart = await page.evaluate(() => localStorage.getItem('kmf_shop_cart'));
    if (width <= 768) {
      const cdp = await context.newCDPSession(page);
      const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x, y, id: 1 }] });
      const x = bubble.x + bubble.width / 2, y = bubble.y + bubble.height / 2;
      await touch('touchStart', x, y);
      await page.locator('.floating-cart.is-dragging').waitFor();
      await touch('touchMove', x - 100, y - 130);
      await page.locator('.cart-dismiss-zone.is-visible').waitFor();
      assert.ok((await page.locator('.floating-cart').boundingBox()).x < bubble.x - 50, 'bubble follows touch');
      await touch('touchEnd');
      await page.waitForFunction(() => !document.querySelector('.floating-cart').classList.contains('is-dragging'));
      assert.ok(Math.abs((await page.locator('.floating-cart').boundingBox()).x - bubble.x) < 1, 'failed drag snaps back');
      assert.ok(!page.url().includes('/korpa'), 'drag never triggers navigation');
      await touch('touchStart', x, y);
      await page.locator('.floating-cart.is-dragging').waitFor();
      await touch('touchMove', x - 70, y - 80);
      await touch('touchCancel');
      await page.waitForFunction(() => !document.querySelector('.floating-cart').classList.contains('is-dragging'));
      assert.ok(Math.abs((await page.locator('.floating-cart').boundingBox()).x - bubble.x) < 1, 'pointer cancellation restores position');
      await touch('touchStart', x, y);
      await page.locator('.floating-cart.is-dragging').waitFor();
      const target = await page.locator('.cart-dismiss-target').boundingBox();
      await touch('touchMove', target.x + target.width / 2, target.y + target.height / 2);
      await page.locator('.cart-dismiss-zone.is-active').waitFor();
      await touch('touchEnd');
      await cdp.detach();
    } else {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      assert.match(await page.locator('.floating-cart').evaluate(el => getComputedStyle(el).transitionDuration), /0\.2s/);
      await page.locator('.floating-cart-close').focus();
      await page.keyboard.press('Enter');
    }
    await page.locator('.floating-cart').waitFor({ state: 'detached' });
    assert.equal(await page.evaluate(() => localStorage.getItem('kmf_shop_cart')), savedCart);
    for (const route of ['/vesti', '/tim', '/uprava', '/kontakt']) {
      await page.goto(base + route);
      await page.locator('app-floating-cart').waitFor({ state: 'attached' });
      assert.equal(await page.locator('.header-cart, .floating-cart').count(), 0, `dismiss persists on ${route}`);
    }
    await page.reload();
    await page.locator('app-floating-cart').waitFor({ state: 'attached' });
    assert.equal(await page.locator('.floating-cart').count(), 0, 'dismiss survives reload');
    for (const route of ['/prodavnica?sort=new#top', '/prodavnica/proizvod-2', '/korpa', '/porudzbina', '/porudzbina/uspesno']) {
      await page.goto(base + route);
      await page.locator('.header-cart').waitFor();
      assert.equal(await page.locator('.floating-cart').count(), 0, `no floating cart on ${route}`);
      assert.equal(await page.locator('.header-cart span').innerText(), '2');
    }
    await page.goto(`${base}/prodavnica/proizvod-2`);
    await page.getByRole('button', { name: 'M', exact: true }).click();
    await page.getByRole('button', { name: /^ДОДАЈ У КОРПУ/ }).click();
    await page.getByRole('button', { name: 'Затвори потврду' }).click();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForFunction(() => !document.querySelector('.site-header').classList.contains('header-hidden'));
    await page.locator('.site-header .brand').click();
    await page.locator('.floating-cart-open').waitFor();
    assert.equal(await page.locator('.floating-cart-count').innerText(), '3', 'new product resets dismissal and updates count');
    await page.locator('.floating-cart-open').click();
    await page.waitForURL('**/korpa');
    assert.equal(await page.locator('.floating-cart').count(), 0);
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`PASS ${width}px: homepage order/fallback/images/prices, responsive Shop, route cart visibility, floating count/navigation, close/drag/cancel, session persistence/reset, back-to-top spacing, cart regression.`);
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
