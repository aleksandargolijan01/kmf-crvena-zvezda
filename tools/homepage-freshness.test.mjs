import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import '@angular/compiler';
import { lastValueFrom, of, Subject, throwError, toArray } from 'rxjs';
import { moduleUrl } from './typescript-test-loader.mjs';

const load = file => moduleUrl(new URL('../src/app/' + file, import.meta.url)).then(url => import(url));
const { PublicApiService } = await load('core/api/public-api.service.ts');
const { PublicNewsService } = await load('core/api/public-news.service.ts');
const { PublicSponsorsService } = await load('core/api/public-sponsors.service.ts');
const { HomeComponent } = await load('pages/home/home.component.ts');

test('homepage partner section uses the neutral class and retains its accessible heading', async () => {
  const template = await readFile(new URL('../src/app/pages/home/home.component.html', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.scss', import.meta.url), 'utf8');
  assert.match(template, /<section class="club-partners" aria-labelledby="sponsors-title">/);
  assert.match(template, /<h2 id="sponsors-title">/);
  assert.match(styles, /\.club-partners\s*\{/);
  assert.doesNotMatch(template, /top-sponsors/);
  assert.doesNotMatch(styles, /top-sponsors/);
});

function setup(responses, platform = 'browser') {
  let stable;
  const ready = new Promise(resolve => { stable = resolve; });
  const calls = [];
  const api = new PublicApiService({ get(url, options) {
    calls.push({ url, options });
    const response = responses.shift();
    return response instanceof Error ? throwError(() => response) : of(response);
  } }, { whenStable: () => ready }, platform);
  return { api, calls, stable };
}

test('SSR fetches once and retains default HTTP transfer caching', async () => {
  const { api, calls } = setup([{ data: ['build snapshot'] }], 'server');
  assert.deepEqual(await lastValueFrom(api.news()), { data: ['build snapshot'] });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.transferCache, undefined);
});

for (const kind of ['news', 'sponsors']) test(`${kind}: stale transfer response is visible until stability, then refreshed without transfer/cache reuse`, async () => {
  const stale = kind === 'news' ? { data: ['September'] } : [1, 2, 3];
  const fresh = kind === 'news' ? { data: ['October'] } : [1, 2, 3, 4, 5];
  const { api, calls, stable } = setup([stale, fresh, []]);
  const values = [];
  const done = new Promise((resolve, reject) => api[kind]().subscribe({ next: v => values.push(v), complete: resolve, error: reject }));
  assert.deepEqual(values, [stale]);
  assert.equal(calls.length, 1);
  stable();
  await done;
  assert.deepEqual(values, [stale, fresh]);
  assert.equal(calls[1].options.transferCache, false);
  assert.equal(calls[1].options.cache, 'no-store');
  assert.equal(calls[1].url, calls[0].url);
  assert.equal(calls[1].options.params.toString(), calls[0].options.params.toString());
  // No five-minute shareReplay entry may hide later CMS removal, including empty data.
  assert.deepEqual(await lastValueFrom(api[kind]()), []);
  assert.equal(calls.length, 3);
  assert.equal(calls[2].options.transferCache, false);
});

test('failed refresh preserves snapshot; missing snapshot surfaces an error; later visit retries', async () => {
  const outage = new Error('offline');
  const a = setup([[1, 2, 3], outage]);
  const preserved = lastValueFrom(a.api.sponsors().pipe(toArray()));
  a.stable();
  assert.deepEqual(await preserved, [[1, 2, 3]]);
  const b = setup([outage, outage, [1, 2, 3, 4, 5]]);
  const failed = lastValueFrom(b.api.sponsors());
  b.stable();
  await assert.rejects(failed, /offline/);
  assert.deepEqual(await lastValueFrom(b.api.sponsors()), [1, 2, 3, 4, 5]);
});

test('navigation away before stability prevents the browser refresh', async () => {
  const { api, calls, stable } = setup([[1], [2]]);
  const subscription = api.sponsors().subscribe();
  subscription.unsubscribe();
  stable();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls.length, 1);
});

test('service mapping keeps fresh news translations and replaces partner categories', async () => {
  const article = date => ({ id: date, slug: 'article', title_sr: 'SR', title_en: 'EN', title_ru: 'RU', publishedAt: date });
  const { api, stable } = setup([{ data: [article('2026-09-16')] }, { data: [article('2026-10-20')] }]);
  const values = lastValueFrom(new PublicNewsService(api).listState(1, 3).pipe(toArray()));
  stable();
  assert.deepEqual((await values).map(s => s.items[0].publishedAt), ['2026-09-16', '2026-10-20']);
  const stream = new Subject();
  const states = [];
  new PublicSponsorsService({ sponsors: () => stream }).groupedState().subscribe(s => states.push(s));
  stream.next([{ id: 'category', sponsors: [{ id: 'old' }] }]);
  stream.next([{ id: 'category', sponsors: [{ id: 'new', logoUrl: '/changed.png' }] }]);
  stream.next([]);
  assert.deepEqual(states.at(-2).categories[0].sponsors, [{ id: 'new', logoUrl: '/changed.png' }]);
  assert.deepEqual(states.at(-1), { loading: false, error: false, categories: [] });
});

test('homepage asks for latest three without featured priority and reacts to partner updates', () => {
  const calls = [], news = new Subject(), partners = new Subject(), cleanup = [];
  const home = new HomeComponent({ t: key => key }, { set() {}, websiteSchema() {}, organizationSchema() {} }, { url: '/' },
    { listState(...args) { calls.push(args); return news; } }, { groupedState: () => partners },
    { onDestroy(fn) { cleanup.push(fn); return () => {}; } });
  home.ngOnInit();
  assert.deepEqual(calls, [[1, 3]]);
  news.next({ loading: false, error: false, items: [{ id: 'latest' }], total: 10 });
  assert.equal(home.newsState().items[0].id, 'latest');
  for (const count of [3, 5, 0]) {
    partners.next({ loading: false, error: false, categories: [{ sponsors: Array.from({ length: count }, (_, id) => ({ id })) }] });
    assert.equal(home.mainSponsors().length, count);
    assert.equal(home.marqueeSponsors().length, count * 2);
  }
  cleanup.forEach(fn => fn());
  assert.equal(news.observed, false);
  assert.equal(partners.observed, false);
});
