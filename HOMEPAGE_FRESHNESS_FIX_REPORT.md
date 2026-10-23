# Homepage freshness and partner logos

## Investigation recorded before implementation (2026-10-23)

No application code was changed before the following findings were established. Production access was read-only.

### Confirmed production cause

- `GET https://kmfcrvenazvezda.rs/` serves static HTML with `Last-Modified: Thu, 17 Sep 2026 10:18:30 GMT`, `Cache-Control: no-cache, no-store, must-revalidate`, and bundle `main-KCDZ4V77.js`. Its `ng-state` contains news through September 16 and three partners (Eurosalon fabrika, Antika, MM Physical). The screenshot matches this snapshot exactly.
- Direct `/vesti` and `/prijatelji-kluba` HTML have the same modification date and stale transferred data. The dedicated pages are NOT inherently immune: fresh SPA navigation and direct entry take different paths.
- The live `/news?page=1&limit=3` API returned October 20, October 9 and October 9 articles (30 published articles total). `/news?page=1&limit=3&featured=true` returned one July 4 article. `/sponsors/grouped` returned five active partners, adding Zepter International and STM10 and an updated Eurosalon logo URL.
- Fresh headless Edge contexts at 1440px and 390px reproduced homepage dates July 4 / September 16 / September 15 and three logos. There were **no news or sponsors network requests**; only the Shop request ran. Clicking News fetched `/news?page=1&limit=24` and displayed October news. Direct Partners entry still showed three partners. No page errors or registered service workers were observed.

### Code evidence and data flow

1. `angular.json` sets `outputMode: static`; `app.routes.server.ts` prerenders home, News and Partners at build time. There is no request-time frontend SSR process. `app.config.server.ts` uses native fetch for build-time API requests.
2. `app.config.ts` enables `provideClientHydration(withEventReplay())`, including Angular HTTP TransferState caching. Installed Angular 21.2.17 `node_modules/@angular/common/fesm2022/http.mjs` returns eligible transferred GET responses without contacting the API; it turns off that cache after application stability, but does not reissue completed subscriptions.
3. `HomeComponent.ngOnInit()` subscribes once to `PublicNewsService.listState(1,3,{featured:true})`, `listState(1,3)` and `PublicSponsorsService.groupedState()`. `PublicApiService.cached()` further retains each completed response with `shareReplay` and a five-minute lookup TTL. That TTL is not a refresh timer. A transferred snapshot is treated as newly cached browser data regardless of its build date; the mounted component never requests again.
4. News uses `listState(1,24)`, a different cache key, so navigating there after homepage hydration can fetch current data. Partners uses the SAME grouped endpoint/cache key as home; navigation may retain the stale response until a new lookup after TTL expiry. Starting on another route, authentication state (the interceptor adds Authorization; Angular excludes those requests from transfer caching), and navigation history can change the result. These explain possible session differences; individual user device histories were not available.
5. Nest `NewsService.findPublished()` filters published articles and defaults to descending `publishedAt`, then `createdAt`. Homepage separately prioritizes featured items; three old featured entries could exclude all newer articles. The current July featured item explains the first old row, but cannot explain the September cutoff in the other rows: that is the transferred snapshot.
6. Nest `SponsorsService.findPublicGrouped()` returns active categories with active sponsors ordered by existing CMS order. Homepage flattens these and shows up to six; five is below this limit. Public presentation removes only empty retired categories. No database defect or need for a schema/data change was found.

### Caching/deployment evidence

- No Angular service-worker dependency, registration, build option, or ngsw configuration exists. `.htaccess` has defensive worker cache headers, which do not install a worker. Fresh production browser contexts had no registrations. Historical workers on untested devices remain unverified.
- Existing `.htaccess` already marks `index.html` no-store and hashed JS/CSS immutable. Production HTML honors that. Clearing browser caches cannot regenerate the server's September snapshot. API responses had ETags but no explicit Cache-Control; no observed CDN cache-hit/Age header established an additional stale API cache.
- `SEO_DEPLOYMENT.md` describes build-time snapshots and article/sitemap rebuild requirements. Static raw HTML will remain a snapshot even after adding client revalidation.

### Logo evidence and limits

- `SponsorLogoComponent` uses nested `ng-template` / `NgTemplateOutlet`, a native lazy image, and the shared `ImageFallbackDirective`. CSS gives the card a minimum height and the image width/max-height with `object-fit: contain`; no hiding rule was found.
- All five current Supabase logo URLs returned HTTP 200 with image/jpeg or image/png bodies (7,129–183,767 bytes) and `public, max-age=31536000`. All three snapshot logos decoded successfully at both tested viewport widths. Lazy loading was **not established as the production cause**.
- A missing card is a data problem; five existing images with `complete=false`/`naturalWidth=0` indicate pending/deferred requests, not proof of a failed download. The reported all-five-pending state could not be reproduced in these sessions. Network timing, browser-specific behavior and extensions remain unconfirmed possibilities.
- Confirmed resilience gaps: the shared fallback listens only to future `error` events, cannot detect an error that occurred before hydration, and never resets its `failed` flag when a reused image receives a different URL. Sponsor images lack intrinsic dimensions. These support targeted sponsor lifecycle/fallback fixes, not blanket eager loading or changes to unrelated images.

## Implemented changes

| File | Change and reason |
| --- | --- |
| `src/app/core/api/public-api.service.ts:63` | Only news **lists** and grouped sponsors use `currentList()`. Server rendering still makes one transferable request. On initial browser boot the snapshot emits first, then a request after `ApplicationRef.whenStable()` uses `transferCache:false` and bypasses the service's `shareReplay` cache. Subsequent route entries fetch current data. Requests time out after 12 seconds. Refresh errors retain an available snapshot; an initial failure without a snapshot surfaces through existing error states. Successful empty responses clear removed items. Unsubscribing on component destruction cancels the flow. |
| `src/app/pages/home/home.component.ts:75` | Request the latest three published news articles, consistent with `/vesti`. No additional featured request or featured-first merge. CMS featured flags are untouched. |
| `backend/src/modules/news/news.controller.ts:10` and `backend/src/modules/sponsors/sponsors.controller.ts:19` | List responses explicitly send `Cache-Control: public, max-age=0, must-revalidate`. Existing ETags can validate unchanged data, but cached lists cannot silently remain fresh. This policy remains eligible for Angular transfer caching; a blanket `no-store`/`no-cache` API response would make Angular skip that snapshot. The configured browser backend is XHR, which does not enforce the fetch-only `cache` request option; **the response headers are necessary for browser/intermediary HTTP caching policy**. No CORS or global HTTP backend change was made. |
| `src/app/shared/sponsor-logo/sponsor-logo.component.ts:20` | Native lazy loading and async decoding remain. Add intrinsic 148x52 image dimensions matching the existing display bounds. Image errors show the partner's name inside the existing link/card. `afterRenderEffect` checks images already failed before hydration, without treating pending lazy images as failures. `ngOnChanges` resets the error state when the CMS supplies a new URL for the same partner ID. The shared fallback directive for other images is unchanged. |
| `tools/homepage-freshness.*.mjs`, `backend/src/modules/news/public-list-cache.http.spec.ts`, `package.json` | Add service/component regressions, deterministic stale prerender fixtures, production-bundle browser tests, two HTTP revalidation tests, and `test:homepage` / `test:homepage:browser` scripts. |
| `tools/shop-frontend.lint.mjs` | Include the changed public API and sponsor-logo files in the existing frontend lint runner. |

There is no new dependency, global prerender disablement, route change, schema/data mutation, Shop/CMS redesign, translation change, or modification to SEO metadata generation. Homepage keeps its three-row news layout and six-card partner cap; all five current partners fit. All other images retain their loading behavior.

The browser freshness contract is **on page load and route entry**. No background polling, WebSocket, or perpetual refresh timer was added. A page left open without navigation will retain its most recent successful result. This fixes CMS changes requiring a frontend rebuild to appear to subsequent visitors, while keeping the change small.

## Verification results

All application checks below used Node 24.19.0 from the available runtime. Deployment should use the project's supported Node 22.x version, at least 22.12 for Angular 21. No production writes were performed; browser CMS/Shop interactions used intercepted local fixtures.

| Check | Result |
| --- | --- |
| `npm run test:homepage` | **7 passed**: single SSR request, snapshot-to-fresh sequence for both endpoints, cache bypass, next-visit updates/removals, outage retention, retry without snapshot, destruction cancellation, data mapping, latest-three selection and reactive partner count. |
| Frontend `node --test` excluding the database migration script | **56 passed**, including the seven new tests and existing partner, news/Shop SEO, cart, checkout, translation and money tests. |
| Isolated production fixture build | **Passed, 13 prerendered routes**. Snapshot intentionally contains three September articles and three partners. Browser API fixtures return October articles and five partners without changing/rebuilding that HTML. |
| `test:homepage:browser` in Edge/Chromium, Firefox and WebKit | **27 scenario groups passed** (nine per engine): 1440px/390px hydration and delayed image loading, SPA data updates/removal, pre-hydration failures followed by URL recovery, current-image 404 fallback, API outage preservation, empty current data, direct News/Partners entry with saved EN/RU language, and no-JavaScript HTML/SEO preservation. No page errors or Angular hydration errors. Assertions include `img.decode()`, nonzero intrinsic/display size, stable canonical/title, responsive width, and unchanged unrelated lazy images. |
| Real-logo smoke check | All five real Supabase images loaded with nonzero natural widths in all three engines at 1440px and 390px using the final local production build. API reads were replayed locally to avoid localhost CORS differences; the images themselves came from Supabase. A final decoded screenshot visually confirmed all five logos, including MM Physical. This is desktop browser/mobile-viewport coverage, not a physical iPhone/Android test. |
| Existing `tools/partners.browser-test.mjs` | **Passed at 1440/768/390px**: SR/EN/RU, live metadata, stable links, category terminology, inquiry and mocked CMS partner create/edit/delete/order/logo workflows. |
| Existing `tools/shop-public.browser-test.mjs` | **Passed at 1440/768/390px**: homepage carousel, Shop layout, cart visibility/state, floating cart controls/persistence and responsive spacing. |
| `tsc --noEmit -p tsconfig.app.json` | **Passed**. |
| Frontend lint | **36 files, zero errors** via `node tools/shop-frontend.lint.mjs`, including all changed Angular files. |
| Backend lint | **Passed**, `node node_modules/eslint/bin/eslint.js "{src,test}/**/*.ts"` from `backend`, without the package script's automatic `--fix`. |
| Backend Jest | **81 passed across 13 suites; 32 skipped in two opt-in database suites**. Includes the two new HTTP tests proving changed data returns 200/new ETag despite the previous `If-None-Match`. Translation-provider failure logs are expected mocked failure tests. |
| Backend `npm run build` | **Passed**. |
| Frontend `npm run build:production` against live read-only APIs | **Passed, 46 prerendered routes**, sitemap includes 30 published news and six active products. Initial bundle **744.07 kB**, over the existing 600 kB warning threshold and below the 1 MB error threshold. Budgets were not changed. |
| `git diff --check` | **Passed**. |

One broad frontend test invocation included `tools/shop-season-migration.test.mjs`; its safety guard refused to run because the required disposable local `shop_phase1_test` database was not configured. It did not execute a migration. The remaining 56 tests then passed in an explicit non-database run. Backend database suites similarly require `SHOP_TEST_DATABASE_URL` and were left skipped. These are the only unexecuted integration checks, and none relate to a schema change in this fix.

Local browser screenshots are under ignored `test-results/homepage/`; fixture build output is under ignored `.tmp/homepage-freshness-build/`. The production output is `dist/kmf-crvena-zvezda-site/browser/`. The pre-existing `public/sitemap.xml` working copy was preserved byte-for-byte around the production build (the built sitemap is generated normally); the five pre-existing frontend ZIP archives were untouched.

### Reproduce focused checks (PowerShell)

Use a supported Node on PATH and an existing Playwright installation. The browser test intentionally fails if the build does not contain the stale fixtures.

```powershell
npm run test:homepage
$env:NODE_OPTIONS = '--import=./tools/homepage-freshness.fixture-loader.mjs'
try {
  node node_modules/@angular/cli/bin/ng.js build --configuration production --output-path .tmp/homepage-freshness-build
} finally {
  Remove-Item Env:NODE_OPTIONS
}
$env:SHOP_PLAYWRIGHT_MODULE = '<absolute path to playwright/index.mjs>'
$env:HOMEPAGE_BROWSERS = 'chromium,firefox,webkit'
# Chromium uses installed msedge by default; HOMEPAGE_CHROMIUM_CHANNEL can select chrome.
npm run test:homepage:browser
node tools/shop-frontend.lint.mjs
```

The fixture build intercepts only public API reads; it does not connect to or write the CMS database. Install Playwright's Firefox/WebKit engines in the external tooling installation if they are not already available. The actual validation used the external runtime's Playwright and installed its browser binaries outside this repository; package lockfiles were unchanged.

## Remaining risks and boundaries

- The reported five-image `complete=false` production condition remains **unreproduced**. The confirmed data defect and separately confirmed image error lifecycle gaps are fixed; this report does not claim that lazy loading, CORS, a service worker, or a Supabase outage caused that report. A delayed-response fixture reproduces the pending state and confirms it resolves when bytes arrive. No code can make an unavailable/blocked remote asset load; an actual image error now leaves a named partner card instead of an unhandled broken image.
- Native lazy loading may defer below-the-fold logos until approached. Async decode can briefly lag a completed download; large source dimensions can affect decode timing. No image proxy, automatic canvas inspection, forced reload loop, or blanket eager-loading workaround was introduced.
- With JavaScript disabled, before hydration finishes, or during an API outage, users/crawlers see the static snapshot. Raw HTML and static article metadata/sitemap still need a frontend build when those **SEO artifacts** must reflect new content. This is the retained SSG architecture, not request-time SSR. Existing article-detail cache behavior was not expanded into this list-focused fix. New article URLs retain the existing Apache SPA fallback.
- There is no continuous update while a page stays open. Revalidation depends on application stability and public API reachability. Adding a future unrelated never-stable startup task could delay refresh; the present application passed real production-bundle hydration tests.
- Historical service workers, untested physical devices, extensions, and host-level overrides were not audited on users' machines. Fresh tested contexts had no worker. No origin-wide worker/cache deletion was added.
- Partner category/active filtering and the six-logo homepage limit are preserved; uncategorized partners and partners in inactive categories follow the existing API behavior.

## Exact deployment requirements (not performed)

1. **Release the Nest backend changes** using the existing deployment process and Node 22.x (22.12+). From `backend`, install locked dependencies if needed, run `npm run build`, and restart/reload the existing API process with the compiled output. No Prisma migration, seed, environment variable change, production content edit, or storage rewrite is needed.
2. Verify `GET https://api.kmfcrvenazvezda.rs/news?page=1&limit=3` and `GET https://api.kmfcrvenazvezda.rs/sponsors/grouped` return current data and **`Cache-Control: public, max-age=0, must-revalidate`**. Do not replace that header with a blanket cache directive that disables Angular transfer state. Preserve existing CORS origins and ETag behavior. Any external cache override must honor revalidation for these endpoints; invalidate an existing API cache only if one is configured.
3. **Build the frontend once to ship this code**, with the normal production environment and public API reachable: run `npm ci` if needed, then `npm run build:production` from the repository root. Ensure `NODE_OPTIONS` does **not** reference either test fixture loader. Do not deploy `.tmp/homepage-freshness-build`, test screenshots, source files, or an older ZIP archive. The tested normal output currently has 46 prerendered routes; counts can change as CMS content changes.
4. Publish the **entire** `dist/kmf-crvena-zvezda-site/browser/` output to the existing cPanel/Apache/LiteSpeed DocumentRoot, including hidden `.htaccess`, root and nested `index.html` files, current hashed bundles, images and sitemap. Use a consistent/atomic release so new HTML cannot point to missing bundles. Preserve the existing `mod_rewrite`/`mod_headers` behavior, canonical host, API origin and storage image access. No frontend Node server or SSR migration is required.
5. Confirm HTML still sends **`no-cache, no-store, must-revalidate`**, and hashed JS/CSS retain their existing immutable policy. If a CDN/host cache overrides origin HTML headers, invalidate the old HTML there and honor the policy. Updating only assets or only the homepage HTML will leave inconsistent/stale route snapshots. A browser cache-clearing instruction is not the fix.
6. In a fresh unauthenticated browser context, load `/` directly. Confirm one fresh `/news?page=1&limit=3` and `/sponsors/grouped` request after hydration, latest-three news, and five current partner cards. Scroll to logos and verify successful requests, `complete=true` and `naturalWidth>0`; verify direct `/vesti` and `/prijatelji-kluba`, then SPA navigation between them. Check SR/EN/RU, canonical/OG/JSON-LD and mobile layout. Compare current public API responses rather than hard-coding today's dates/counts in monitoring.
7. After this one-time code release, future published-news and active-partner list changes appear on browser page load/route entry **without another frontend rebuild**. Continue the existing build workflow separately when updating raw prerendered SEO/article pages and sitemap is required.

No deployment, commit, push, database schema change, production data update, or email/message send was performed.

Reference: Angular's [SSR and HTTP transfer caching guide](https://angular.dev/guide/ssr) documents transfer reuse during initial rendering and browser-only refresh opportunities. The installed 21.2.17 implementation and the executable browser tests above were used as the deciding evidence for this project.
