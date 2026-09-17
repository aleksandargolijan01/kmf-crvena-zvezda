# Измена терминологије партнера

## Резултат

- Назив странице: „Пријатељи клуба“ → **„Партнери клуба“**.
- Почетна: „Главни спонзори“ → **„Партнери“**.
- CTA: „ПОСТАНИ СПОНЗОР“ → **„ПОСТАНИ ПАРТНЕР“**.
- Усклађени су навигација, footer, партнерска форма, поруке учитавања/грешке, CMS и текст партнерског email упита.
- SEO title, description, Open Graph и breadcrumb structured data прате изабрани језик без освежавања странице.
- Дизајн, CSS, распоред, логотипи и њихови линкови нису мењани.

## Категорије и преводи

| Претходни назив | SR | EN | RU |
| --- | --- | --- | --- |
| Златни спонзор | Главни партнер | Main partner | Главный партнёр |
| Сребрни спонзор | Премијум партнер | Premium partner | Премиум-партнёр |
| Бронзани спонзор | Званични партнер | Official partner | Официальный партнёр |
| Пријатељи клуба — категорија | Клупски партнери | Club partners | Клубные партнёры |

Назив странице је засебан: **Партнери клуба / Partners of the club / Партнёры клуба**.
Почетна: **Партнери / Partners / Партнёры**. CTA: **ПОСТАНИ ПАРТНЕР / BECOME A PARTNER / СТАТЬ ПАРТНЁРОМ**.

Коришћени су постојећи `TranslationService`, речници и language state. За категорије је додато заједничко мапирање приказаних назива према постојећем slug-у, са подршком за старе називе и непромењеним приказом непознатих категорија. Форма задржава свој постојећи SR/EN/RU речник повезан са истим language state-ом.

## Насловна категорија, URL и подаци

Категорије су записи `SponsorCategory`, а не backend enum. Јавно читање API-ја потврдило је да је насловна категорија празна. Она се сада изоставља из јавног приказа и избора категорије за новог партнера. CMS задржава приступ историјским записима под ознаком „Архивска категорија“; већ додељена архивска категорија остаје доступна приликом измене тог партнера. Ако архивска категорија има партнере, они се не губе из јавног приказа.

ID, slug, редослед и везе партнера остају непромењени. Чување осталих поља категорије не уписује аутоматски приказане преводе преко старих назива у бази. У CMS компоненти је додато `markForCheck` после учитавања категорија, партнера и медија: browser провера је показала да без њега приказ остаје неосвежен до следеће интеракције.

Рута **`/prijatelji-kluba`**, canonical, API руте и CTA одредиште **`#sponsor-form`** остају исти. Промена URL-а није потребна за овај задатак. Sitemap није мењан овим задатком; претходно затечене измене су сачуване и после build-а.

Backend је минимално измењен **само због текста email упита** који би иначе задржао стару терминологију. API уговори, модели, Prisma schema, миграције и база нису мењани. Није било слања стварних упита, production уписа, deploy-а, commit-а или push-а.

## Измењени фајлови у овом задатку

- `src/app/i18n/translations.ts`
- `src/app/data/sponsor-category-labels.ts` — ново мапирање
- `src/app/data/sponsors.data.ts` — display labels постојећих примерних података
- `src/app/core/api/public-sponsors.service.ts`
- `src/app/core/api/admin-api.models.ts`
- `src/app/app.routes.ts`
- `src/app/pages/home/home.component.html`
- `src/app/pages/friends-page/friends-page.component.ts`
- `src/app/pages/friends-page/friends-page.component.html`
- `src/app/layout/footer/footer.component.ts`
- `src/app/shared/sponsor-inquiry-form/sponsor-inquiry-form.component.ts`
- `src/app/admin/admin.routes.ts`
- `src/app/admin/layout/admin-layout.component.ts`
- `src/app/admin/pages/dashboard/dashboard.component.ts`
- `src/app/admin/pages/sponsors/sponsors-admin.component.ts`
- `src/app/admin/pages/media/media-admin.component.ts`
- `backend/src/modules/sponsor-inquiries/sponsor-inquiries.service.ts`
- `backend/src/modules/sponsor-inquiries/templates/sponsor-inquiry-email.template.ts`
- `backend/src/modules/sponsor-inquiries/templates/sponsor-inquiry-email.template.spec.ts` — нов тест
- `tools/partners.test.mjs` — нови тестови
- `tools/partners.browser-test.mjs` — нове browser провере
- `PARTNERS_TERMINOLOGY_UPDATE_REPORT.md`

Затечене измене ауторског footer credit-а, `public/sitemap.xml`, `tools/shop-i18n.browser-test.mjs` и ZIP архиве нису уклањане.

## Где су били стари називи

У SR/EN/RU речницима за почетну, навигацију, партнерску страницу и footer; у називима категорија које враћа API; у опцији пакета партнерске форме; у CMS насловима, менију, потврдама и поруци о коришћеној слици; у партнерском email шаблону и subject-у. SEO и breadcrumb су користили исте старе речнике.

Завршна претрага је потврдила да су старе речи остале само где су оправдане: технички идентификатори/API називи, компатибилни алијаси, интерни типови и примерни `tier` идентификатори, као и вести у којима „пријатељи клуба“ означавају људе, а не партнерску категорију. Постојећи seed подаци и историјски записи нису преименовани.

## Провере

- Frontend тестови: **23/23 успешно**, укључујући 6 нових провера категорија, старих идентификатора, празне архивске категорије и SR/EN/RU назива, уз постојеће Shop i18n и SEO тестове.
- Browser: **успешно на 1440, 768 и 390 px**, са изолованим API одговорима. Проверени су језици без reload-а, навигација, footer, H1, CTA, SEO/OG/breadcrumb/canonical, исти линкови логотипа, четири категорије, форма упита, CMS избор категорије, додавање/измена/брисање, редослед и избор логотипа. Нема хоризонталног overflow-а партнерске странице нити browser JavaScript грешака. Стварни upload на сервер није извршаван; његов код није мењан.
- `npm run build`: **успешно**, 37 prerender рута. Постоји warning за initial bundle: **741,42 kB / budget 600 kB**; budget није мењан.
- Frontend lint: постојећа провера **34 фајла, 0 грешака**; додатни ESLint над фајловима ове измене **12 фајлова, 0 грешака**.
- Backend тестови: **12 suite-ова, 79 тестова успешно**; **2 DB suite-а / 32 теста прескочена** јер `SHOP_TEST_DATABASE_URL` није подешен.
- Backend `npm run build` и `npm run lint -- --no-fix`: **успешно**.
- `git diff --check`: **успешно**.

Browser алат је покренут из спољне тест инсталације Playwright-а; пројекту није додата библиотека нити мењан lockfile.
