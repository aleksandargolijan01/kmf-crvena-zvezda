# Продавница — Фаза 1

Имплементирани су каталог, CMS производа и основа базе за поруџбине. Јавни интерфејс продавнице и ток наручивања припадају следећој фази.

## API

| Метод | Путања | Приступ |
| --- | --- | --- |
| GET | `/shop/products` | Јавни каталог, само активни производи |
| GET | `/shop/products/:slug` | Активан производ или 404 |
| GET | `/admin/shop/products` | ADMIN, SUPER_ADMIN |
| GET | `/admin/shop/products/:id` | ADMIN, SUPER_ADMIN |
| POST | `/admin/shop/products` | ADMIN, SUPER_ADMIN |
| PATCH | `/admin/shop/products/:id` | ADMIN, SUPER_ADMIN |
| DELETE | `/admin/shop/products/:id` | ADMIN, SUPER_ADMIN; само неактиван и некоришћен производ |

Листе користе постојећи облик `{ data, meta: { page, limit, total, totalPages } }`.
Параметри: `page` (од 1), `limit` (до 50), `featured=true|false`, `availability=AVAILABLE|SOLD_OUT|MADE_TO_ORDER`, `order=asc|desc`.
Редослед прати `displayOrder`, а за `featured=true` прво `featuredOrder`, са празним вредностима на крају. Идентификатор разрешава једнак редослед.
Admin додатно подржава `active=true|false` и `search` по називу.

Јавни одговор има локализоване `name` и `description` објекте са `sr`, `en`, `ru`; недостајући превод користи српски. Садржи цене, доступност, `isNew`, фотографије и активне величине. Недоступне активне величине остају видљиве са `available=false`; `SOLD_OUT` онемогућава све величине. `availableForOrder` захтева бар једну доступну активну величину; за универзалне артикле унети `UNI`. Нема залиха, SKU-а, сезонских карата или интерних бројача у јавном одговору.

При креирању су обавезни `nameSr`, `descriptionSr`, `priceMinor`. Цена је цео број пара, без аутоматске конверзије string вредности у DTO-у. `compareAtPriceMinor`, када постоји, мора бити већи од тренутне цене.

При PATCH-у изостављено поље остаје непромењено. `null` брише само nullable вредности. Изостављени `gallery`/`variants` остају непромењени; послат низ представља целу нову листу, а `[]` уклања листу када то историја дозвољава. Величине треба слати са постојећим `id` да се сачувају везе; без `id` сервис покушава подударање по нормализованој величини. Туђи и дупли идентификатори се одбијају. Коришћена величина се деактивира уместо брисања.

Slug користи постојећу News транслитерацију. Аутоматске колизије добијају суфикс, уз поновни покушај после конкурентне unique колизије. Ручна колизија враћа 409. Измена назива чува постојећи slug.

## Модели и интеграције

Додати модели: `Product`, `ProductImage`, `ProductVariant`, `SeasonTicket`, `Order`, `OrderItem`, `OrderStatusHistory`, `OrderNumberCounter`, `OrderEmail`.

Додати enum-и: `ProductAvailability`, `OrderStatus`, `OrderSource`, `SeasonTicketVerificationMethod`, `OrderEmailKind`, `OrderEmailStatus`.

`MediaFile.productCovers` и `productImages` имају FK заштиту `Restrict`. `User.orderStatusChanges` повезује аутора промене статуса; брисање корисника оставља историју и поставља аутора на null.

Media usage задржава провере News, Player, U19Player, ManagementMember, BoardMember, StaffMember и Sponsor, уз две нове Shop провере. Брисање прво закључава Media ред, проверава употребу и уписује `deletingAt`. Shop упис закључава исте редове и одбија фотографију која се брише. Storage позив је ван DB трансакције. После Storage грешке ознака остаје и брисање може да се понови. Старе форме нису рефакторисане; њихови уписи не користе нови протокол закључавања, па конкурентно повезивање фотографије у старом модулу остаје ограничење постојеће архитектуре.

`OrderItem` чува назив, slug, SKU, величину, количину и све износе као snapshot. Измена производа не мења историју. Опционе везе на производ/величину имају `Restrict` заштиту.

## Новац, поруџбине и сезонске карте

`3.200,00 RSD = 320000` пара. Backend utility користи BigInt за множење и проценат; заокруживање попуста је на најближу пару, пола навише. Frontend utility парсира децимални текст без floating-point множења и форматира српски приказ. Подржан је ненегативни PostgreSQL Int опсег.

`Order.totalMinor` је збир робе после попуста, без накнадне доставе. Непозната достава је `shippingCalculated=false, shippingMinor=null`; када се накнадно утврди, оба поља се ажурирају заједно. Нема измишљене нулте поштарине. Наредна фаза мора засебно приказати робу и доставу.

`OrderNumberService.next(tx)` позива се у ИСТОЈ трансакцији која креира поруџбину. Један `INSERT ... ON CONFLICT DO UPDATE RETURNING` атомски повећава годишњи бројач. Година је по временској зони Београда; формат је `CZ-2026-0001`, а бројеви преко 9999 се не скраћују. Rollback враћа и бројач.

`OrderOutboxService.enqueue(tx, orderId, hasCustomerEmail)` само уписује CLUB и, када постоји email, CUSTOMER ставку, уз unique заштиту од дуплирања. Нема SMTP позива или worker-а. Будући checkout мора у истој трансакцији уписати поруџбину, ставке, историју и outbox, а worker шаље тек после commit-а.

Сезонска карта је јединствена по сезони и броју. Метод верификације још није изабран; поља метода/hash-а су nullable. Нема `used` заставице. Правило за следећу фазу остаје 20% на све производе, неограничено док карта важи. Јавна верификација и примена попуста нису имплементиране.

## CMS

Путања: `/admin/shop/products`. Група „ПРОДАВНИЦА” видљива је само ADMIN/SUPER_ADMIN. Поруџбине и сезонске карте имају заштићене информативне странице.

Производи имају листу, претрагу, филтере, пагинацију, додавање, измену, активацију и безбедно брисање. Форма садржи основна SR поља, опционе ручне EN/RU преводе, цене, фотографије, произвољне величине и подешавања приказа. Галерија има редослед и опис фотографије. Величине имају редослед, SKU, активност и ручну доступност. `stockQuantity` се чува као nullable, без аутоматског лагерског тока.

Нови MediaPicker користи постојеће Media API/upload методе. Нове компоненте експлицитно заказују освежавање приказа после асинхроних одговора; глобална Angular конфигурација није мењана.

## Миграција

Фајл: `prisma/migrations/20260908150000_add_shop_phase_one/migration.sql`.
Старе миграције нису мењане. Нова додаје табеле, enum-е, индексе, FK и CHECK за цене, количине, износе, доставу, период важења и нормализоване величине.

Продукциона миграција није покренута. SQL је проверен на засебној локалној PostgreSQL бази `shop_phase1_test`, са почетном шемом и новом миграцијом.

Након провере да backend конфигурација показује на жељену базу, ручно из backend директоријума:

```powershell
cd D:\kmf-czv-sajt\backend
npx prisma migrate status
npx prisma migrate deploy
npm run prisma:generate
npm run build
```

`migrate deploy` примењује СВЕ миграције које недостају циљној бази. Нови backend захтева ову миграцију пре пуштања у рад, укључујући Media колону `deletingAt`.

## Провере

```powershell
# backend
npx prisma validate
npm run prisma:generate
npm run lint -- --no-fix
npm test -- --runInBand
npm run build

# корен пројекта
npm run test:seo
node --test tools/shop-money.test.mjs
npm run build
```

`--no-fix` спречава да постојећа lint команда аутоматски мења неповезане фајлове. Корени package.json нема lint скрипту.

DB тестови су опционо укључени преко `SHOP_TEST_DATABASE_URL`; захтевају искључиво localhost/127.0.0.1 и базу названу `shop_phase1_test`, са примењеном шемом. Без те променљиве се прескачу. Користити само потрошну тестну базу јер тестови креирају и мењају податке.

Browser тест `tools/shop-admin.browser-test.mjs` захтева изграђен frontend/backend, исту локалну базу, спољну Playwright инсталацију у `SHOP_PLAYWRIGHT_MODULE` и Microsoft Edge. `SHOP_TEST_ARTIFACT_DIR` опционо задаје директоријум снимака. Тест покреће локални Nest product API; спољни захтеви прегледача су пресретнути. Media листа је тестна, без стварног Supabase upload-а. Не користи продукционе налоге и не додаје dependency у пројекат.

Покривени су валидација новца/DTO-а, CRUD, колизије slug-а, величине и њихови идентификатори, јавна доступност, Media usage/брисање, JWT/улоге, SQL ограничења, snapshot, outbox, конкурентни slug-ови и бројеви поруџбина, rollback, CMS форма и мобилни приказ.

## Следећа фаза

Договорити метод верификације сезонске карте, па имплементирати checkout са backend обрачуном, idempotency заштитом и атомским уписом. Додати обраду поруџбина, ручни унос и CMS сезонских карата, затим outbox worker. Јавна продавница, корпа, homepage carousel и Shop SEO остају засебан наредни рад. Пословање остаје: Србија, плаћање поузећем и накнадно одређена достава.

## Резултати провера — 08.09.2026.

- Prisma validate/generate, Nest build и backend lint: успешно.
- Backend: 56 тестова у 8 група, укључујући 7 тестова са стварном локалном PostgreSQL базом; све успешно.
- Постојећи SEO тестови: 5 успешно. Frontend money utility: 2 успешно.
- Production Angular build: успешно, 26 статичких рута. Упозорење: почетни пакет 605,36 kB прелази warning праг од 600 kB за 5,36 kB; error праг није прекорачен.
- Browser: креирање/измена, цена, главна фотографија/галерија, стабилна величина, EDITOR приступ и мобилна форма на 390 px — успешно. Провера обухвата стварне границе картица/поља, јер постојећи стилови могу да сакрију overflow документа. Сама табела има хоризонтално померање на малом екрану.
- `git diff --check` за постојеће измењене Shop интеграционе фајлове: успешно.

Затечене околности које нису мењане: development SSR build упозорава на HttpClient/XHR и `withFetch`; локални Node је 20.20.0, док backend декларише 22.x. Постојећи CMS користи и обична поља за асинхроне одговоре без експлицитног освежавања; тај образац није глобално рефакторисан. Ограничење старог Media конкурентног уписа описано је изнад. Стварни Supabase upload и продукциони deploy нису тестирани.

Постојеће непредате SEO измене затечене су пре ове фазе. Ниједна од њих није уклоњена. Build генерише sitemap као споредни ефекат; изворни `public/sitemap.xml` враћен је на затечене бајтове, потврђене SHA-256 поређењем. Јавне странице, глобални CSS, `.htaccess`, prerender/SEO конфигурација и dependency верзије нису мењани у овој фази.

## Инвентар фајлова

Додати фајлови, са путањама релативним у односу на корен пројекта:

```text
backend/prisma/migrations/20260908150000_add_shop_phase_one/migration.sql
backend/src/modules/shop/README.md
backend/src/modules/shop/shop.module.ts
backend/src/modules/shop/products.controller.ts
backend/src/modules/shop/admin-products.controller.ts
backend/src/modules/shop/products.service.ts
backend/src/modules/shop/dto/product-write.dto.ts
backend/src/modules/shop/dto/product-parts.dto.ts
backend/src/modules/shop/dto/products-query.dto.ts
backend/src/modules/shop/utils/money.ts
backend/src/modules/shop/orders/order-number.service.ts
backend/src/modules/shop/orders/order-outbox.service.ts
backend/src/modules/shop/products.service.spec.ts
backend/src/modules/shop/products-auth.spec.ts
backend/src/modules/shop/shop.database.spec.ts
backend/src/modules/shop/dto/product-write.dto.spec.ts
backend/src/modules/shop/utils/money.spec.ts
backend/src/modules/shop/orders/order-number.service.spec.ts
backend/src/modules/shop/orders/order-outbox.service.spec.ts
backend/src/modules/media/media-shop.spec.ts
src/app/core/api/shop-api.models.ts
src/app/core/api/admin-shop-api.service.ts
src/app/core/shop/money.ts
src/app/admin/shared/media-picker/media-picker.component.ts
src/app/admin/pages/shop/products/products-admin.component.ts
src/app/admin/pages/shop/products/products-admin.component.html
src/app/admin/pages/shop/products/products-admin.component.scss
src/app/admin/pages/shop/shop-placeholder.component.ts
tools/shop-money.test.mjs
tools/shop-admin.browser-test.mjs
```

Измењени постојећи фајлови у овој фази:

```text
backend/prisma/schema.prisma
backend/src/app.module.ts
backend/src/modules/media/media.service.ts
src/app/core/api/admin-api.models.ts
src/app/admin/admin.routes.ts
src/app/admin/layout/admin-layout.component.ts
```
