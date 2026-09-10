Shop automatski prevod — završeno 10. septembra 2026.

1. Uzrok i postojeći sistem

Product je već imao `nameSr/nameEn/nameRu` i `descriptionSr/descriptionEn/descriptionRu`, ali `ProductsService` nije koristio `TranslationService`, niti je `ShopModule` uvozio `TranslationModule`. Javni API je već vraćao lokalizovane objekte, dok je frontend uglavnom birao `.sr` i koristio srpske tekstove direktno u šablonima. Shop nema poseban model kategorija, excerpt ili shortDescription.

Postojeći CMS servis koristi OpenAI Responses API, `OPENAI_API_KEY` i `OPENAI_TRANSLATION_MODEL` (podrazumevano `gpt-4.1-mini`), timeout 30 sekundi i jedan retry. News create/update čeka prevod u istom HTTP zahtevu; jezici se obrađuju redom. Servis popunjava nedostajuća polja, beleži greške i vraća uspešne prevode bez rušenja CMS zahteva. Shop ponovo koristi baš taj servis. Njegova implementacija i ponašanje drugih CMS modula nisu promenjeni. Mali Shop adapter mapira postojeće camelCase nazive u ključeve koje zajednički servis očekuje.

2. Izmenjeni i dodati fajlovi u ovom zadatku

Backend:

- `backend/src/modules/shop/products.service.ts`
- `backend/src/modules/shop/product-translations.ts` — nov adapter za zajednički prevodilac
- `backend/src/modules/shop/shop.module.ts`
- `backend/src/modules/shop/admin-products.controller.ts`
- `backend/src/modules/shop/dto/regenerate-product-translations.dto.ts` — nov DTO
- `backend/src/modules/shop/product-translations.spec.ts` — novi testovi
- `backend/src/modules/shop/products.service.spec.ts`
- `backend/src/modules/shop/products-auth.spec.ts`
- `backend/src/modules/shop/shop.database.spec.ts`

Frontend:

- `src/app/admin/pages/shop/products/products-admin.component.ts`
- `src/app/admin/pages/shop/products/products-admin.component.html`
- `src/app/core/api/admin-shop-api.service.ts`
- `src/app/core/shop/cart.service.ts`
- `src/app/core/shop/checkout.models.ts`
- `src/app/core/shop/public-shop.models.ts`
- `src/app/core/shop/shop-seo.ts`
- `src/app/i18n/translations.ts`
- `src/app/i18n/shop-translations.ts` — novi SR/EN/RU ključevi uključeni u postojeći rečnik
- `src/app/layout/header/header.component.ts`
- `src/app/pages/shop/catalog-page.component.ts`
- `src/app/pages/shop/product-page.component.ts`
- `src/app/pages/shop/product-page.component.html`
- `src/app/pages/shop/cart-page.component.ts`
- `src/app/pages/shop/cart-page.component.html`
- `src/app/pages/shop/checkout-page.component.ts`
- `src/app/pages/shop/order-success.component.ts`
- `src/app/shared/shop/product-card.component.ts`
- `src/app/shared/shop/shop-carousel.component.ts`
- `src/app/shared/shop/quantity-selector.component.ts`
- `src/app/shared/shop/checkout-form.component.ts`
- `src/app/shared/shop/checkout-form.component.html`
- `src/app/shared/shop/floating-cart.component.ts`
- `src/app/shared/shop/floating-cart.component.html`

Test alati i dokumentacija:

- `tools/shop-admin.browser-test.mjs`
- `tools/shop-public.test.mjs`
- `tools/static-shop-seo.test.mjs`
- `tools/shop-i18n.test.mjs` — nov
- `tools/shop-i18n.browser-test.mjs` — nov
- `tools/typescript-test-loader.mjs` — nov
- `SHOP_TRANSLATION_REPORT.md` — ovaj izveštaj

Prethodno postojeće izmene u radnom direktorijumu su očuvane. Navedeni Shop fajlovi nadograđeni su preko njih. Promene drugih fajlova vidljive u `git status` nisu deo ovog zadatka. Build je pokrenuo postojeći sitemap generator, a prethodni sadržaj `public/sitemap.xml` vraćen je iz memorijske kopije po završetku builda.

3. Prisma i ograničenja

Nije potrebna Prisma migracija. Schema, DTO polja proizvoda, Prisma/Node verzije, autentifikacija i uloge, obračun cena i sezonskog popusta, backend checkout, order flow, email worker, Supabase i deployment konfiguracija nisu menjani. Nema deploya ni masovnog menjanja produkcionih podataka.

4. Create/update, prikaz i fallback

Create automatski prevodi naziv i HTML opis iz SR u EN/RU ako odgovarajuća ciljna vrednost nije ručno popunjena. Neprazan ručni prevod ima prioritet za svoje polje i svoj jezik. Prazan string, whitespace ili null ne smatraju se ručnim prevodom.

Update poredi očišćeni SR tekst sa sačuvanim tekstom. Kada se SR polje promeni, obnavljaju se njegovi EN/RU prevodi, osim nepraznih vrednosti eksplicitno poslatih u istom zahtevu. Nepromenjena SR polja ne izazivaju obnovu postojećih nepraznih prevoda; prazni prevodi se mogu dopuniti. Prethodni ručni prevod nije trajno zaključan: na sledećoj promeni SR teksta potrebno ga je eksplicitno poslati da bi imao prioritet. CMS forma zato šalje EN/RU polja koja je korisnik ručno menjao, umesto da neizmenjene stare vrednosti šalje kao ručne override vrednosti.

Prevod se čeka pre otvaranja transakcije i zaključavanja proizvoda. Pre upisa proverava se da se tekst u međuvremenu nije promenio; u slučaju konkurentne izmene vraća se 409 i traži ponovno učitavanje. Generisani tekst prolazi postojeće čišćenje HTML-a. Prevode se samo naziv i opis; slug, SKU, veličine, cene, slike/alt vrednosti, dostupnost i tehnička polja nisu predmet automatskog prevoda.

Kod greške OpenAI servisa, uspešni prevodi se čuvaju, a neuspešan jezik ostaje na prethodnoj vrednosti ili prazan kod novog proizvoda. Čuvanje SR sadržaja nastavlja se po postojećoj CMS konvenciji. Javni API za prazne prevode vraća SR fallback.

Frontend koristi postojeći `TranslationService.text()` za javni CMS sadržaj i `t()` za Shop UI. Promena jezika odmah osvežava katalog, proizvod, carousel, korpu, checkout, greške/validaciju, potvrdu porudžbine i oznake korpe. Checkout nazive za prikaz uzima iz javnog kataloga, uz postojeći naziv iz obračuna kao fallback; iznosi i sačuvani podaci porudžbine ostaju autoritativni iz backend obračuna. Promena jezika ne šalje novi zahtev za proizvod niti pokreće novi checkout obračun.

Product title, meta description, Open Graph i Product JSON-LD koriste aktivni jezik. Canonical putanja, sitemap arhitektura, robots pravila i puna redovna cena u Product JSON-LD ostali su isti. Postojeći statički prerender ostaje na podrazumevanom srpskom jeziku; EN/RU SEO prati runtime promenu jezika, u skladu sa arhitekturom sajta.

5. Obnova postojećih proizvoda

U CMS-u otvoriti **Proizvodi → Izmeni → Prevodi — opciono**. Prvo sačuvati eventualne izmene.

- **Dopuni / ispravi EN/RU** prevodi samo prazna ciljna polja i polja čiji je tekst, nakon uklanjanja okolnih razmaka, jednak SR tekstu. Drugi postojeći prevodi ostaju sačuvani.
- **Ponovo prevedi sva EN/RU polja** obnavlja sva četiri prevoda iz SR. UI traži potvrdu jer ova izričita akcija zamenjuje i ručne prevode. Namenjena je i pogrešnim prevodima koji nisu doslovna kopija SR teksta.

Akcije rade nad izabranim proizvodom. Endpoint je `POST /admin/shop/products/:id/translations/regenerate`, za postojeće ADMIN/SUPER_ADMIN uloge. Body `{ "force": false }` (ili `{}`) koristi bezbednu dopunu, a `{ "force": true }` potpunu obnovu. Odgovor sadrži `product`, `translatedFields` i `errors`. Ako deo prevoda ne uspe, admin dobija upozorenje i može da ponovi akciju. Ni jedan režim ne menja cenu, slug, varijante, slike ili dostupnost. Nema automatske obnove pri pokretanju servera.

6. Rezultati provera

- Backend `npm run build`: prolazi.
- Backend `npm run lint -- --no-fix`: prolazi.
- Backend `npm test -- --runInBand` sa izdvojenom lokalnom test bazom: **94/94 testa, 13/13 suite-ova**, bez preskočenih testova.
- Frontend `npx tsc --noEmit -p tsconfig.app.json`: prolazi.
- `node tools/shop-frontend.lint.mjs`: **34 fajla, 0 grešaka**.
- Node testovi `shop-i18n`, `shop-public`, `shop-checkout`, `shop-money`, `static-shop-seo`, `static-news-seo`: **42/42**.
- Frontend `npm run build`: prolazi; **32 prerenderovane rute**. Postoji upozorenje za početni bundle: **734,70 kB**, preko warning praga od 600 kB, ispod error praga od 1 MB.
- Novi `shop-i18n.browser-test.mjs`: **1440 i 390 px**; SR → EN → RU na početnoj strani, detalju, katalogu, korpi, checkout-u i potvrdi; provereni vidljivi tekstovi, postojeće greške, meta/OG/JSON-LD i odsustvo reload-a/ponovnog obračuna.
- Postojeći `shop-public.browser-test.mjs`: **1440, 768 i 390 px**, prolazi.
- Postojeći `shop-checkout.browser-test.mjs`: **1440, 768 i 390 px**, prolazi, uključujući CMS na 1440/390 px, oporavak porudžbine, sezonski popust i auth regresije.
- Prošireni `shop-admin.browser-test.mjs`: prolazi; stvarni lokalni Nest/Prisma upis, deterministički prevodilac, CMS create/update/ručni EN override/izostavljanje netaknutih EN/RU polja, dopuna i potpuna obnova, cena, stabilni ID-jevi varijanti, mobilni raspored i postojeća EDITOR zaštita.
- `git diff --check`: prolazi.

Automatski prevod je testiran kroz stvarni zajednički servis sa mockovanim pozivom provajdera; kvalitet živih OpenAI prevoda nije deo ovih determinističkih testova. Browser zahtevi za porudžbine i spoljne servise presretnuti su testnim odgovorima. PostgreSQL testovi koristili su zasebnu lokalnu bazu `shop_phase1_test` na `127.0.0.1:54389`, sa trenutnom schemom i postojećim Shop SQL ograničenjima. Test server je ugašen nakon provera.

Ponovljivi frontend testovi iz korena projekta:

```powershell
node --test tools/shop-i18n.test.mjs tools/shop-public.test.mjs tools/shop-checkout.test.mjs tools/shop-money.test.mjs tools/static-shop-seo.test.mjs tools/static-news-seo.test.mjs
$env:SHOP_PLAYWRIGHT_MODULE = Join-Path $env:TEMP 'kmf-shop-phase1-tools/node_modules/playwright/index.mjs'
node tools/shop-i18n.browser-test.mjs
node tools/shop-public.browser-test.mjs
node tools/shop-checkout.browser-test.mjs
```

Browser testovi koriste prethodno izgrađen frontend i postojeću spoljnu Playwright instalaciju. Backend PostgreSQL i CMS browser testovi dodatno zahtevaju prethodno pokrenutu izdvojenu test bazu i `SHOP_TEST_DATABASE_URL` usmeren samo na nju.
