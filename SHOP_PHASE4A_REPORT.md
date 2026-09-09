# Фаза 4A — Shop routing и SEO

Имплементација и тест build су завршени. **Build са стварним подацима је блокиран:** `https://api.kmfcrvenazvezda.rs/shop/products?page=1&limit=50` тренутно враћа HTTP 404. Генератор намерно прекида рад, уместо да недоступан API представи као празан каталог. Backend, CMS, checkout обрачун, email worker, миграције и deploy нису мењани/покретани у овој фази.

## 1. Фајлови

Измењени:

```text
public/.htaccess
public/sitemap.xml
src/app/app.routes.ts
src/app/app.routes.server.ts
src/app/app.config.server.ts
src/app/core/api/public-shop-api.service.ts
src/app/core/seo/seo.service.ts
src/app/pages/shop/catalog-page.component.ts
src/app/pages/shop/product-page.component.ts
src/app/pages/shop/cart-page.component.ts
src/app/pages/shop/checkout-page.component.ts
src/app/pages/shop/order-success.component.ts
tools/generate-sitemap.mjs
tools/shop-frontend.lint.mjs
package.json
```

Додати:

```text
src/app/core/shop/shop-seo.ts
tools/static-shop-seo.mjs
tools/static-shop-seo.d.mts
tools/static-shop-seo.test.mjs
tools/shop-seo.fixture-loader.mjs
tools/shop-seo.browser-test.mjs
SHOP_PHASE4A_REPORT.md
```

У checkout/success/cart компонентама промењен је само robots SEO. Каталог и производ сада учитавају јавне податке и током Angular prerender-а. Опциони `prerender` аргумент API сервиса омогућава само пренос јавних GET одговора при hydration-у; обични позиви, корпа и carousel задржавају `transferCache: false`. После hydration-а страница освежава податке. Native FetchBackend додат је само server конфигурацији за static rendering; browser HTTP и auth interceptor нису мењани. Серверски frontend процес у продукцији није потребан.

## 2. Тачна Apache правила

После постојећих правила за стварне/prerender фајлове, admin и news, а пре завршног 404:

```apache
RewriteRule ^prodavnica/[a-z0-9]+(?:-[a-z0-9]+)*/?$ - [E=KMF_PRODUCT_FALLBACK:1]
RewriteRule ^prodavnica(?:/[a-z0-9]+(?:-[a-z0-9]+)*)?/?$ /index.html [L]
RewriteRule ^(?:korpa|porudzbina(?:/uspesno)?)/?$ /index.html [L]
```

За приватне Shop руте:

```apache
SetEnvIf Request_URI "^/(?:korpa|porudzbina(?:/uspesno)?)(?:/|$)" KMF_NOINDEX=1
```

Постојећи `KMF_NOINDEX` header допуњен је подршком за интерне rewrite прелазе и product fallback:

```apache
Header always set X-Robots-Tag "noindex, nofollow" env=KMF_NOINDEX
Header always set X-Robots-Tag "noindex, nofollow" env=REDIRECT_KMF_NOINDEX
Header always set X-Robots-Tag "noindex, nofollow" env=KMF_PRODUCT_FALLBACK
Header always set X-Robots-Tag "noindex, nofollow" env=REDIRECT_KMF_PRODUCT_FALLBACK
```

Редослед остаје: www → non-www 301, `.well-known` изузетак, `/404`, prerender фајлови, стварни фајлови/директоријуми, admin fallback, news fallback, ограничени Shop fallback, прави 404 за све остало. `/prodavnica/fake/extra`, `/korpa/extra` и произвољни јавни URL немају глобални SPA fallback.

## 3. Prerender руте

`/prodavnica` је `RenderMode.Prerender`. `/prodavnica/:slug` користи исти режим, `PrerenderFallback.None` и пагинирани јавни Product API за све активне производе. Постојећи News `getPrerenderParams` није мењан. API грешке, неисправан payload и прекомерна пагинација прекидају генерисање; постоје timeout и провера безбедног slug-а.

Стварни HTML садржи видљив каталог/производ, title, description, canonical, OpenGraph, Twitter и JSON-LD. Није направљен само празан SPA shell са накнадним метаподацима. `/korpa`, `/porudzbina` и `/porudzbina/uspesno` остају client-rendered приватни токови.

## 4. Sitemap

Постојећи News генератор остаје засебан. Његов XML се проширује `/prodavnica` и јединственим `/prodavnica/{slug}` адресама јавних активних производа. Експлицитно неактивни производи и небезбедни slug-ови се одбацују. Нема `/korpa`, checkout-а или `/admin` у sitemap-у. Нису измишљени `lastmod` датуми производа које јавни API не враћа.

У сачувани `public/sitemap.xml` додат је само стварни статички URL `/prodavnica`, уз очување затечених news адреса. Производи се нису измишљали због тренутног API 404. Успешан build са стварним API-јем попуниће њихове адресе. Тест sitemap са три fixture производа остао је искључиво у засебном temp build директоријуму.

## 5. Product JSON-LD

Један `Product` и један `BreadcrumbList`, кроз постојећи SeoService. Product садржи `name`, скраћен plain-text `description`, апсолутне безбедне HTTPS слике, `Brand` са називом `KMF Crvena zvezda` и `Offer` са canonical URL-ом, `priceCurrency: RSD`, пуном актуелном ценом из пара и расположивошћу.

На пример, `320050` пара даје Offer `price: "3200.50"`. Сезонски попуст није јавна Offer цена. Нема измишљених оцена, review-а, GTIN-а или MPN-а.

Мапирање: `AVAILABLE → InStock`, `SOLD_OUT → OutOfStock`, `MADE_TO_ORDER → MadeToOrder`. Последња вредност јесте стандардни члан Schema.org и описује израду по поруџбини: [Schema.org MadeToOrder](https://schema.org/MadeToOrder).

SeoService уклања претходне управљане JSON-LD блокове и безбедно escape-ује `<`, `>` и `&` при сериализацији, како садржај не би затворио script у raw HTML-у. Уклоњен је статички generic title са product руте који би током hydration-а могао преписати стварни назив производа.

## 6. Index/noindex

| Страница | Runtime robots | Apache header |
| --- | --- | --- |
| `/prodavnica` | `index, follow` | Без noindex забране |
| Активан prerender производ | `index, follow` | Без noindex забране |
| `/korpa` | `noindex, nofollow` | `noindex, nofollow` |
| `/porudzbina` | `noindex, nofollow` | `noindex, nofollow` |
| `/porudzbina/uspesno` | `noindex, nofollow` | `noindex, nofollow` |
| Непознат/неактиван производ после API провере | `noindex, nofollow`, без Product JSON-LD | Product fallback има `noindex, nofollow` |
| Нов активан производ без prerender фајла | Runtime приказује исправан Product SEO | Header задржава `noindex, nofollow` до следећег build-а |

Каталог има тачно тражени наслов и опис. Canonical користи продукциони домен без www; производ има `{Назив} | КМФ Црвена звезда` и canonical `/prodavnica/{slug}`. Browser провере потврђују један canonical и један Product блок.

## 7. Непостојећи и неактивни slug-ови

Због статичког Apache-а није могуће при самом HTTP захтеву проверити базу. Синтаксички исправан једноструки product slug без фајла добија ограничени **HTTP 200 shell**, али **HTTP `noindex, nofollow`**, а јавни API 404 доводи до „ПРОИЗВОД НИЈЕ ПРОНАЂЕН”, runtime noindex и уклањања structured data. Ово је експлицитан ограничени компромис; не тврди се да fake product slug има HTTP 404.

Сасвим непознати јавни URL, као `/fake-public`, и дубља product адреса добијају **HTTP 404**. Познати prerender производ добија **HTTP 200** са готовим SEO HTML-ом.

Ако је раније активан производ деактивиран после build-а, његов стари статички фајл и даље враћа HTTP 200 и затечени raw HTML до rebuild-а. Runtime освежавање одмах уклања производ/JSON-LD и поставља noindex када API врати 404. За усклађен raw HTML, sitemap и фајлове неопходан је нов build и уклањање застарелих фајлова при будућем deploy-у. Статички сервер без backend провере не може сам сазнати деактивацију.

## 8. Нов производ после build-а

Адреса функционално ради преко ограниченог fallback-а и учитава стварни производ. До следећег build-а нема prerender фајл ни sitemap entry, а fallback header спречава индексирање непровереног статичког URL-а. После build-а активни производ добија HTTP 200 са својим HTML-ом, SEO подацима и sitemap адресом, без fallback noindex header-а. Нема аутоматског deploy hook-а.

## 9. Тестови

- `npm run test:seo`: **15/15**, укључујући постојећих 5 News тестова и 10 нових Shop провера.
- Shop money/public/checkout тестови: **23/23**.
- Frontend lint: без грешака.
- Production HTML са изолованим подацима: каталог + три производа, све три availability вредности, пуна RSD цена, canonical, OG/Twitter, Breadcrumb/Product, видљив садржај и sitemap — прошло.
- Browser runtime/hydration: приватни robots, јединствени metadata блокови, непознат/деактивиран производ, нов производ, ограничени fallback и одсуство runtime грешака — прошло.

Apache није инсталиран у затеченом локалном окружењу. Routing тест чита стварни `.htaccess` и проверава редослед/regex/услове над filesystem сценаријима; browser тест користи локални HTTP сервер који моделује та правила. **Ово није провера на стварном Apache-у**: модуле и HTTP header понашање треба потврдити на staging хостингу.

## 10. Build

Обичан `npm run build` покренут је и контролисано стао због стварног **Shop API HTTP 404**, пре писања непотпуног sitemap-а.

Исти production build је затим проверен са изричито укљученим тест fetch fixture-има, без промена API адресе у апликацији, без seed-а или писања у backend. **Прошао је: 30 prerender рута** — 26 затечених и 4 Shop тест руте. Почетни bundle је **644,39 kB**, уз затечени warning буџет од 600 kB; нема компајлерских грешака.

Тест build је у `%TEMP%/kmf-shop-phase4a-build`; није у продукционом `dist` директоријуму и не треба га deploy-овати. Fixture loader се користи само преко експлицитног `NODE_OPTIONS=--import=...`; нормалан build га не увози. Тестови и production конфигурација нису ажурирали зависности. Backend тестови/build нису непотребно понављани јер backend није мењан.

За поновљиву изоловану проверу потребни су спољни Playwright и овај тест loader; sitemap треба сачувати и вратити после тест build-а. За стварне артефакте користити обичан `npm run build` када јавни Shop API буде доступан, без fixture loader-а.

## 11. Пре продукционог пуштања

Омогућити постојећи јавни Shop API у одговарајућем окружeњу, проверити стварне активне производе и поновити обичан build. Затим на staging Apache/LiteSpeed-у проверити www 301, `.well-known`, приватне и fallback `X-Robots-Tag` header-е, праве 404, admin/news руте и нови/деактивирани производ. При будућем deploy-у заменити комплетан актуелни static output без задржавања старих product HTML фајлова, проверити sitemap и structured data и тек тада посебно одобрити продукционо пуштање.

У овој фази нема продукционог deploy-а или миграција.
