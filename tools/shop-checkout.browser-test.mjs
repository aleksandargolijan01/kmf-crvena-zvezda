// Exercises the production Angular UI against isolated API fixtures. Never sends SMTP or live writes.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
if (!process.env.SHOP_PLAYWRIGHT_MODULE) throw Error('Set SHOP_PLAYWRIGHT_MODULE to an external Playwright installation.');
const { chromium } = await import(pathToFileURL(process.env.SHOP_PLAYWRIGHT_MODULE).href);
const output = fileURLToPath(new URL('../dist/kmf-crvena-zvezda-site/browser/', import.meta.url));
const mime = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer(async (request, response) => {
  try {
    let file = path.resolve(output, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
    if (!file.startsWith(output)) { response.writeHead(403).end(); return; }
    if (!(await stat(file).catch(() => null))?.isFile()) file = path.join(output, 'index.html');
    response.setHeader('Content-Type', mime[path.extname(file)] ?? 'application/octet-stream'); response.end(await readFile(file));
  } catch { response.writeHead(500).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const product = { id: 'p1', slug: 'test-majica', name: { sr: 'Тест мајица' }, description: { sr: 'Опис' }, priceMinor: 300000, currency: 'RSD', availability: 'AVAILABLE', featured: true, isNew: false, coverImage: null, gallery: [], variants: [{ id: 'v1', size: 'M', available: true }], availableForOrder: true };
const customer = { firstName: 'Тест', lastName: 'Купац', phone: '+381601234567', email: 'browser@example.invalid', address: 'Тест улица 1', city: 'Београд', postalCode: '11000', note: 'Тест напомена' };
const pageResponse = data => ({ data, meta: { page: 1, totalPages: data.length ? 1 : 0, limit: 20, total: data.length } });
const artifactDir = process.env.SHOP_TEST_ARTIFACT_DIR;
if (artifactDir) await mkdir(artifactDir, { recursive: true });
let browser, currentPage;
async function screenshot(page, name) { if (artifactDir) await page.screenshot({ path: path.join(artifactDir, name + '.png'), fullPage: true }); }
const quote = (request, price = 300000) => {
  const discountPercent = request.seasonTicketToken ? 20 : 0;
  const items = request.items.map(item => { const subtotalMinor = item.quantity * price, discountMinor = Math.round(subtotalMinor * discountPercent / 100); return { ...item, productId: 'p1', productName: 'Тест мајица', productSlug: 'test-majica', sku: 'TEST-M', size: 'M', unitPriceMinor: price, subtotalMinor, discountMinor, finalMinor: subtotalMinor - discountMinor }; });
  const subtotalMinor = items.reduce((s, i) => s + i.subtotalMinor, 0), discountMinor = items.reduce((s, i) => s + i.discountMinor, 0);
  return { items, subtotalMinor, discountPercent, discountMinor, totalMinor: subtotalMinor - discountMinor, currency: 'RSD', shippingCalculated: false, shippingMinor: null, quoteToken: `quote-${price}-${discountPercent}`, expiresAt: new Date(Date.now() + 300000).toISOString() };
};
async function fixture(width, admin = false) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' }); context.setDefaultTimeout(15000);
  const state = { creates: [], quoteCalls: 0, price: 300000, quoteDelay: 0, quoteStatus: 201, nextError: null, ticketValid: false, receipt: null, delayCreate: 0, recoverCalls: 0, statusCalls: [], savedTickets: [], retryCalls: 0, dropResponse: false };
  const detail = { ...customer, id: 'order1', orderNumber: 'CZ-2026-TEST', status: 'NEW', source: 'PHONE', createdAt: new Date().toISOString(), ...quote({ items: [{ variantId: 'v1', quantity: 1 }] }), statusHistory: [{ id: 'h1', status: 'NEW', createdAt: new Date().toISOString(), changedBy: { firstName: 'Тест', lastName: 'Администратор' } }], allowedStatuses: ['CONFIRMED', 'CANCELLED'], emails: [{ id: 'email1', kind: 'CLUB', status: 'FAILED', attempts: 5, lastError: 'Слање није успело.', nextAttemptAt: null, sentAt: null }] };
  const ticket = { id: 't1', seasonKey: 'ТЕСТ', cardNumber: 'TEST-001', fullName: null, active: true, verificationMethod: 'PIN', validFrom: null, validUntil: null };
  await context.route('**/*', async route => {
    const url = new URL(route.request().url()), p = url.pathname;
    if (url.origin === base && route.request().isNavigationRequest()) return route.continue();
    if (p === '/shop/products') return route.fulfill({ json: pageResponse([product]) });
    if (p === '/shop/cart/quote') {
      state.quoteCalls++; if (state.quoteDelay) await new Promise(resolve => setTimeout(resolve, state.quoteDelay));
      return route.fulfill({ status: state.quoteStatus, json: state.quoteStatus === 201 ? quote(route.request().postDataJSON(), state.price) : { code: 'INVALID_INPUT' } });
    }
    if (p === '/shop/season-ticket/validate') {
      assert.deepEqual(route.request().postDataJSON(), { cardNumber: '000123', fullName: 'Тест Власник' });
      assert.equal(url.search, '');
      return route.fulfill({ status: state.ticketValid ? 201 : 400, json: state.ticketValid ? { valid: true, discountPercent: 20, seasonTicketToken: 'fixture-ticket' } : { code: 'SEASON_TICKET_INVALID' } });
    }
    if (p === '/shop/orders/recover') { state.recoverCalls++; return route.fulfill({ json: state.receipt ? { found: true, ...state.receipt } : { found: false } }); }
    if (p === '/shop/orders/receipt') return route.fulfill({ status: state.receipt ? 201 : 409, json: state.receipt ?? { code: 'RECEIPT_EXPIRED' } });
    if ((p === '/shop/orders' || p === '/admin/shop/orders') && route.request().method() === 'POST') {
      const body = route.request().postDataJSON(); state.creates.push(body);
      if (state.delayCreate) await new Promise(resolve => setTimeout(resolve, state.delayCreate));
      if (state.nextError) { const code = state.nextError; state.nextError = null; return route.fulfill({ status: 409, json: { code, ...(code === 'PRICE_CHANGED' ? { quote: quote(body, state.price) } : {}) } }); }
      state.receipt = { orderNumber: 'CZ-2026-TEST', status: 'NEW', totalMinor: quote(body, state.price).totalMinor, createdAt: new Date().toISOString(), receiptToken: 'opaque-fixture-receipt' };
      if (state.dropResponse) return route.abort('failed');
      return route.fulfill({ status: 201, json: state.receipt });
    }
    if (p === '/admin/shop/orders') return route.fulfill({ json: pageResponse([detail]) });
    if (p === '/admin/shop/orders/order1') return route.fulfill({ json: detail });
    if (p.endsWith('/order1/status')) { const { status } = route.request().postDataJSON(); state.statusCalls.push(status); detail.status = status; detail.allowedStatuses = status === 'CONFIRMED' ? ['SHIPPED', 'CANCELLED'] : status === 'SHIPPED' ? ['COMPLETED'] : []; detail.statusHistory.push({ id: 'h' + detail.statusHistory.length, status, createdAt: new Date().toISOString(), changedBy: { firstName: 'Тест', lastName: 'Администратор' } }); return route.fulfill({ json: detail }); }
    if (p.endsWith('/emails/email1/retry')) { state.retryCalls++; detail.emails[0].status = 'PENDING'; return route.fulfill({ json: { success: true } }); }
    if (p.startsWith('/admin/shop/season-tickets')) {
      if (route.request().method() === 'GET') return route.fulfill({ json: pageResponse([ticket]) });
      const body = route.request().postDataJSON(); state.savedTickets.push(body); Object.assign(ticket, body, { verificationMethod: 'FULL_NAME' }); return route.fulfill({ json: ticket });
    }
    if (url.origin === base) return route.continue();
    return route.fulfill({ json: pageResponse([]) });
  });
  if (admin) await context.addInitScript(() => {
    const token = 'test.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) + '.test';
    localStorage.setItem('kmf_admin_access_token', token);
    localStorage.setItem('kmf_admin_user', JSON.stringify({ id: 'admin', role: 'ADMIN', email: 'admin@example.invalid' }));
  });
  const page = await context.newPage(); currentPage = page;
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/prodavnica'); await page.locator('.shop-grid').waitFor();
  await page.evaluate(() => { localStorage.setItem('kmf_shop_cart', JSON.stringify({ version: 1, items: [{ variantId: 'v1', quantity: 1 }], updatedAt: new Date().toISOString() })); });
  return { page, context, state, errors };
}
async function fill(page) { for (const [key, value] of Object.entries(customer)) await page.locator(key === 'note' ? '.checkout [formcontrolname="note"]' : `#checkout-${key}`).fill(value); }
async function hasCart(page) { return page.evaluate(() => JSON.parse(localStorage.getItem('kmf_shop_cart')).items.length > 0); }
async function settled(page, state) { await page.locator('.checkout aside .total').waitFor(); assert.ok(state.quoteCalls > 0); }
async function submitDisabled(page, expected) { await page.waitForFunction(value => document.querySelector('.checkout button.confirm')?.disabled === value, expected); }
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  for (const width of [1440, 768, 390]) {
    const { page, context, state, errors } = await fixture(width);
    state.quoteDelay = 350;
    await page.goto(base + '/porudzbina');
    await page.getByText('Провера цене и доступности…', { exact: true }).waitFor();
    await settled(page, state);
    const submit = page.getByRole('button', { name: 'ПОТВРДИ ПОРУЏБИНУ', exact: true });
    await submitDisabled(page, true); await fill(page); await submitDisabled(page, false);
    for (const field of ['firstName', 'lastName', 'phone', 'email', 'address', 'city', 'postalCode']) { const input = page.locator(`#checkout-${field}`); await input.fill(''); await submitDisabled(page, true); await input.fill(customer[field]); await submitDisabled(page, false); }
    await page.locator('#checkout-email').fill('bad-email'); await submitDisabled(page, true); await page.locator('#checkout-email').fill(customer.email);
    await page.locator('#checkout-postalCode').fill('123'); await submitDisabled(page, true); await page.locator('#checkout-postalCode').fill(customer.postalCode);
    assert.match(await page.locator('.checkout aside').innerText(), /Трошак доставе није укључен.*обрачунава се накнадно/s);
    await page.getByLabel('Имам сезонску карту').check(); await submitDisabled(page, true);
    await page.locator('[formcontrolname="fullName"]').fill('Тест Власник');
    for (const number of ['TEST-001', '123-456', '12 34']) {
      await page.locator('[formcontrolname="cardNumber"]').fill(number);
      assert.equal(await page.getByRole('button', { name: 'ПРОВЕРИ КАРТУ', exact: true }).isDisabled(), true);
    }
    await page.locator('[formcontrolname="cardNumber"]').fill('000123');
    await page.getByRole('button', { name: 'ПРОВЕРИ КАРТУ', exact: true }).click(); await page.getByText(/Подаци сезонске карте нису исправни/).waitFor(); await submitDisabled(page, true);
    state.ticketValid = true; await page.getByRole('button', { name: 'ПРОВЕРИ КАРТУ', exact: true }).click(); await page.getByText(/Сезонска карта је потврђена/).waitFor();
    await page.locator('.checkout .total dd').filter({ hasText: '2.400 RSD' }).waitFor();
    assert.equal(await page.locator('[formcontrolname="fullName"]').inputValue(), 'Тест Власник');
    assert.equal(await page.locator('.checkout').evaluate(el => el.getBoundingClientRect().right <= innerWidth), true);
    await screenshot(page, `checkout-${width}`);
    state.price = 400000; state.nextError = 'PRICE_CHANGED'; await submit.click();
    await page.getByText(/Цена једног или више производа је промењена/).waitFor();
    assert.equal(state.creates.length, 1); assert.equal(await hasCart(page), true);
    assert.equal(await page.locator('.total dd').innerText(), '3.200 RSD');
    const key = state.creates[0].idempotencyKey;
    state.nextError = 'VARIANT_UNAVAILABLE'; await submit.click(); await page.getByText(/Један или више производа више није доступан/).waitFor();
    assert.equal(await hasCart(page), true); await submitDisabled(page, true);
    await page.getByRole('button', { name: 'ОСВЕЖИ ОБРАЧУН', exact: true }).click(); await settled(page, state);
    state.delayCreate = 500;
    // Dispatch two immediate clicks: Angular must synchronously block the second submit.
    await submit.evaluate(button => { button.click(); button.click(); });
    await page.getByRole('button', { name: 'СЛАЊЕ…' }).waitFor(); assert.equal(await hasCart(page), true);
    await page.waitForURL('**/porudzbina/uspesno'); await page.getByRole('heading', { name: 'ПОРУЏБИНА ЈЕ УСПЕШНО ПРИМЉЕНА' }).waitFor();
    assert.equal(state.creates.length, 3); assert.ok(state.creates.every(body => body.idempotencyKey === key));
    assert.equal(await hasCart(page), false); assert.equal(new URL(page.url()).search, '');
    const storage = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
    assert.doesNotMatch(storage, /browser@example|Тест улица|Тест Власник|000123|fixture-ticket/);
    await page.reload(); await page.getByText('CZ-2026-TEST', { exact: true }).waitFor(); await screenshot(page, `success-${width}`);
    const actions = page.locator('.shop-success-actions a');
    assert.equal(await actions.count(), 2);
    assert.deepEqual(await actions.evaluateAll(links => links.map(link => link.getAttribute('href'))), ['/prodavnica', '/']);
    const boxes = await actions.evaluateAll(links => links.map(link => { const r = link.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }; }));
    assert.ok(boxes[1].x - boxes[0].right >= 15 || boxes[1].y - boxes[0].bottom >= 15, 'CTA gap must remain at least 15px');
    assert.ok(boxes.every(box => box.x >= 0 && box.right <= width));
    if (width === 1440) assert.equal(boxes[0].y, boxes[1].y);
    await actions.first().click(); await page.waitForURL('**/prodavnica');
    await page.goto(base + '/porudzbina/uspesno'); await page.locator('.shop-success-actions a').last().click(); await page.waitForURL(base + '/');
    assert.deepEqual(errors, []); await context.close();
    console.log(`PASS ${width}px: required fields/email/postal, quote loading, seasonal failure/success/20%, delivery, price change, unavailable variant, idempotency/double click, cart safety, success/refresh/privacy.`);
  }
  {
    const { page, context, state } = await fixture(390); state.dropResponse = true;
    await page.goto(base + '/porudzbina'); await settled(page, state); await fill(page);
    await page.getByRole('button', { name: 'ПОТВРДИ ПОРУЏБИНУ', exact: true }).click();
    await page.waitForURL('**/porudzbina/uspesno'); assert.equal(state.creates.length, 1); assert.ok(state.recoverCalls > 0); assert.equal(await hasCart(page), false);
    await context.close(); console.log('PASS lost create response: recovered existing order, no duplicate.');
  }
  {
    const { page, context, state } = await fixture(390);
    state.receipt = { orderNumber: 'CZ-RECOVERED', status: 'NEW', totalMinor: 300000, receiptToken: 'opaque-recovery', createdAt: new Date().toISOString() };
    await page.evaluate(() => sessionStorage.setItem('kmf_checkout_attempt', 'a'.repeat(32)));
    await page.goto(base + '/porudzbina'); await page.waitForURL('**/porudzbina/uspesno'); await page.getByText('CZ-RECOVERED', { exact: true }).waitFor(); assert.equal(state.creates.length, 0); await context.close();
    console.log('PASS checkout refresh: existing attempt recovered before new entry.');
  }
  for (const status of [401, 403]) {
    const { page, context, state } = await fixture(390); state.quoteStatus = status;
    await page.goto(base + '/porudzbina'); await page.locator('.checkout [role="alert"]').waitFor(); assert.ok(page.url().endsWith('/porudzbina')); assert.equal(await hasCart(page), true); await context.close();
    console.log(`PASS guest ${status}: local error, no admin navigation.`);
  }
  {
    const { page, context } = await fixture(390); await page.goto(base + '/porudzbina/uspesno'); await page.getByText(/Потврда није доступна или је истекла/).waitFor(); assert.equal(await page.getByRole('heading', { name: 'ПОРУЏБИНА ЈЕ УСПЕШНО ПРИМЉЕНА' }).count(), 0); await context.close();
    console.log('PASS direct success without receipt: safe missing-context state.');
  }
  for (const width of [1440, 390]) {
    const { page, context, state, errors } = await fixture(width, true);
    await page.goto(base + '/admin/shop/orders'); await page.getByRole('button', { name: 'ДЕТАЉИ', exact: true }).click();
    await page.getByRole('button', { name: 'Потврђена', exact: true }).click(); await page.getByRole('button', { name: 'Послата', exact: true }).waitFor();
    assert.deepEqual(state.statusCalls, ['CONFIRMED']);
    await page.getByRole('button', { name: 'ПОНОВИ СЛАЊЕ', exact: true }).click(); await page.getByText('Клуб: Чека слање').waitFor(); assert.equal(state.retryCalls, 1);
    await screenshot(page, `cms-orders-${width}`);
    await page.getByRole('button', { name: 'Послата', exact: true }).click(); await page.getByRole('button', { name: 'Завршена', exact: true }).click(); await page.getByText('Поруџбина је у коначном статусу.').waitFor();
    await page.goto(base + '/admin/shop/orders/new'); await page.locator('[formcontrolname="variantId"] option[value="v1"]').waitFor({ state: 'attached' });
    await page.locator('[formcontrolname="variantId"]').selectOption('v1'); await page.getByRole('button', { name: 'ДОДАЈ СТАВКУ', exact: true }).click(); await settled(page, state); await fill(page);
    await page.getByLabel('Извор поруџбине').selectOption('INSTAGRAM'); await screenshot(page, `cms-manual-${width}`);
    await page.getByRole('button', { name: 'ПОТВРДИ ПОРУЏБИНУ', exact: true }).click(); await page.waitForURL('**/admin/shop/orders?search=*');
    assert.equal(state.creates[0].source, 'INSTAGRAM'); assert.equal(state.creates[0].customer.email, customer.email); assert.equal('priceMinor' in state.creates[0], false); assert.equal(await hasCart(page), true, 'manual orders leave public cart intact');
    await page.goto(base + '/admin/shop/season-tickets'); await page.getByRole('button', { name: 'ИЗМЕНИ', exact: true }).click();
    const owner = page.locator('[formcontrolname="fullName"]'), number = page.locator('[formcontrolname="cardNumber"]');
    await page.getByText(/Стара карта није спремна/).waitFor();
    assert.equal(await owner.inputValue(), ''); assert.equal(await page.getByRole('button', { name: 'САЧУВАЈ', exact: true }).isDisabled(), true);
    assert.equal(await number.getAttribute('type'), 'text'); assert.equal(await number.getAttribute('inputmode'), 'numeric');
    await screenshot(page, `cms-tickets-${width}`);
    await owner.fill('Тест Власник'); await number.fill('000123');
    await page.getByRole('button', { name: 'САЧУВАЈ', exact: true }).click(); await page.getByText('Сезонска карта је сачувана.').waitFor();
    assert.equal(state.savedTickets[0].cardNumber, '000123'); assert.equal(state.savedTickets[0].fullName, 'Тест Власник'); assert.equal('verificationValue' in state.savedTickets[0], false);
    await page.getByRole('button', { name: 'ИЗМЕНИ', exact: true }).click(); await owner.fill('Нови Власник'); await page.getByRole('button', { name: 'САЧУВАЈ', exact: true }).click(); await page.getByText('Сезонска карта је сачувана.').waitFor(); assert.equal(state.savedTickets[1].fullName, 'Нови Власник');
    await page.getByRole('button', { name: 'ИЗМЕНИ', exact: true }).click(); assert.equal(await owner.inputValue(), 'Нови Власник');
    await page.getByRole('button', { name: 'ОДУСТАНИ', exact: true }).click();
    await page.getByRole('button', { name: 'ДОДАЈ КАРТУ', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'САЧУВАЈ', exact: true }).isDisabled(), true);
    await number.fill('000456'); await page.locator('[formcontrolname="seasonKey"]').fill('ТЕСТ');
    await owner.fill('Други Власник'); await page.getByLabel('Активна', { exact: true }).check();
    await page.getByRole('button', { name: 'САЧУВАЈ', exact: true }).click(); await page.getByText('Сезонска карта је сачувана.').waitFor();
    assert.equal(state.savedTickets[2].cardNumber, '000456'); assert.equal(state.savedTickets[2].active, true);
    assert.equal(await page.locator('.operations h1').evaluate(el => getComputedStyle(el).color), 'rgb(36, 36, 36)');
    assert.equal(await page.locator('.operations').evaluate(el => el.getBoundingClientRect().right <= innerWidth), true);
    assert.deepEqual(errors, []); await context.close(); console.log(`PASS CMS ${width}px: order status/history/terminal, FAILED retry, manual authoritative order/source, legacy ticket completion, full name/create/edit/leading zeros.`);
  }
} catch (error) {
  if (currentPage && !currentPage.isClosed()) { console.error('Failure URL:', currentPage.url()); console.error((await currentPage.locator('body').innerText()).slice(-5500)); await screenshot(currentPage, 'checkout-failure'); }
  throw error;
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
