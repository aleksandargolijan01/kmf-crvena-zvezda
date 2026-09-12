import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import '@angular/compiler';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { HttpRequest, HttpErrorResponse, HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';
const modules = new Map();
async function moduleUrl(url) {
  if (modules.has(url.href)) return modules.get(url.href);
  let source = ts.transpileModule(await readFile(url, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, experimentalDecorators: true } }).outputText;
  for (const match of [...source.matchAll(/(?:from\s+|import\s*)['"]([^'"]+)['"]/g)]) {
    const specifier = match[1], resolved = specifier.startsWith('.') ? await moduleUrl(new URL(specifier + '.ts', url)) : import.meta.resolve(specifier);
    source = source.replaceAll(`'${specifier}'`, `'${resolved}'`).replaceAll(`"${specifier}"`, `"${resolved}"`);
  }
  const value = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`; modules.set(url.href, value); return value;
}
const root = new URL('../src/', import.meta.url);
const load = async path => import(await moduleUrl(new URL(path, root)));
const { CheckoutSessionService } = await load('app/core/shop/checkout-session.service.ts');
const { CheckoutApiService } = await load('app/core/api/checkout-api.service.ts');
const { authInterceptor } = await load('app/core/interceptors/auth.interceptor.ts');
const { AuthService } = await load('app/core/auth/auth.service.ts');
const { environment } = await load('environments/environment.ts');
const { checkoutError } = await load('app/core/shop/checkout.models.ts');
const receipt = { receiptToken: 'opaque-signed-receipt', orderNumber: 'CZ-TEST', firstName: 'NEVER-PERSIST', email: 'never@example.invalid' };
test('checkout session retains one random attempt across refresh, separates manual attempt and persists only receipt token', () => {
  const storage = new Map(); globalThis.sessionStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  const first = new CheckoutSessionService(), key = first.attempt();
  assert.match(key, /^[a-zA-Z0-9_-]{32,128}$/); assert.equal(first.attempt(), key); assert.equal(new CheckoutSessionService().existing(), key);
  assert.notEqual(first.attempt(true), key); first.complete(receipt);
  assert.equal(first.existing(), null); assert.equal(new CheckoutSessionService().receipt(), receipt.receiptToken); assert.ok(first.existing(true));
  assert.doesNotMatch(JSON.stringify([...storage]), /NEVER-PERSIST|never@example|CZ-TEST/);
});
test('blocked session storage uses memory and still preserves the same attempt until success', () => {
  globalThis.sessionStorage = { getItem() { throw Error(); }, setItem() { throw Error(); }, removeItem() { throw Error(); } };
  const session = new CheckoutSessionService(), key = session.attempt(); assert.equal(session.attempt(), key); session.complete(receipt); assert.equal(session.existing(), null); assert.equal(session.receipt(), receipt.receiptToken);
});
for (const status of [401, 403]) test(`public Shop ${status} remains local without credentials, logout or admin redirect`, async () => {
  let redirects = 0, logouts = 0, refreshes = 0;
  const injector = createEnvironmentInjector([{ provide: AuthService, useValue: { accessToken: 'admin-token', refreshToken: 'refresh', logout: () => logouts++, refreshSession: () => { refreshes++; return of(null); } } }, { provide: Router, useValue: { navigate: () => redirects++ } }]);
  let authorized;
  const observable = runInInjectionContext(injector, () => authInterceptor(new HttpRequest('POST', `${environment.apiUrl}/shop/season-ticket/validate`, {}), request => { authorized = request.headers.get('Authorization'); return throwError(() => new HttpErrorResponse({ status })); }));
  await assert.rejects(firstValueFrom(observable)); assert.equal(authorized, null); assert.equal(redirects + logouts + refreshes, 0); injector.destroy();
});
test('admin 403 still attaches its access token and redirects to forbidden', async () => {
  let redirected, authorization;
  const injector = createEnvironmentInjector([{ provide: AuthService, useValue: { accessToken: 'test-token' } }, { provide: Router, useValue: { navigate: path => redirected = path } }]);
  const observable = runInInjectionContext(injector, () => authInterceptor(new HttpRequest('GET', `${environment.apiUrl}/admin/shop/orders`), request => { authorization = request.headers.get('Authorization'); return throwError(() => new HttpErrorResponse({ status: 403 })); }));
  await assert.rejects(firstValueFrom(observable)); assert.equal(authorization, 'Bearer test-token'); assert.deepEqual(redirected, ['/admin/forbidden']); injector.destroy();
});
test('quote and receipt API put private context only in POST bodies; API never invents client prices', async () => {
  const calls = [];
  const injector = createEnvironmentInjector([CheckoutApiService, { provide: HttpClient, useValue: { post: (url, body) => { calls.push({ url, body }); return of({}); } } }]);
  const api = injector.get(CheckoutApiService);
  await firstValueFrom(api.quote([{ variantId: 'v1', quantity: 2 }], 'ticket-token'));
  await firstValueFrom(api.receipt('secret-receipt')); await firstValueFrom(api.recover('opaque-idempotency-key'));
  await firstValueFrom(api.validateTicket('000123', 'Тест Власник'));
  assert.deepEqual(calls[3].body, { cardNumber: '000123', fullName: 'Тест Власник' });
  assert.deepEqual(calls[0].body, { items: [{ variantId: 'v1', quantity: 2 }], seasonTicketToken: 'ticket-token' });
  assert.ok(calls.every(call => !/ticket-token|secret-receipt|opaque-idempotency-key|000123|Власник/.test(call.url)));
  injector.destroy();
});
test('stable checkout errors are Cyrillic and raw server messages never reach the UI', () => {
  assert.match(checkoutError({ error: { code: 'PRICE_CHANGED' } }), /Цена/);
  assert.match(checkoutError({ error: { code: 'VARIANT_UNAVAILABLE' } }), /величини/);
  assert.doesNotMatch(checkoutError({ error: { message: 'SQL private-address stack' } }), /SQL|private|stack/);
});
