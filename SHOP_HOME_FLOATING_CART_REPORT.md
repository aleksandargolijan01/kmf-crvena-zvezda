# Home Shop i floating cart — izveštaj

**A. ANALYSIS**

Homepage je već imao `app-shop-carousel` tačno između `#klub` i `#uprava`. Komponenta je čitala samo featured proizvode i skrivala sekciju kada ih nema, čak i kada katalog ima javne proizvode. Header je prikazivao korpu na svim javnim rutama. Postojeći CartService koristi Angular signals i `kmf_shop_cart` u localStorage; back-to-top je fiksiran dole desno, dimenzija 50/46/44 px. Pregledani su postojeći routing, kartice i mobilni stilovi pre izmena.

**B. FILES CHANGED**

| Fajl | Razlog |
| --- | --- |
| `src/app/shared/shop/shop-carousel.component.ts` | Kada nema featured proizvoda, prikazuje do 10 proizvoda iz postojećeg public kataloga; ažuriran opis carousel-a. |
| `src/app/shared/shop/product-card.component.ts` | Cover → prva gallery slika → klupski logo; logo i pri grešci učitavanja slike. |
| `src/app/core/shop/shop-route.service.ts` | Zajedničko prepoznavanje Shop/public/admin konteksta preko Angular URL segmenata, uključujući query, fragment, matrix parametre i završnu kosu crtu. |
| `src/app/core/shop/cart-presentation.service.ts` | Odvojeno stanje vidljivosti, session persistence i reset posle dodavanja. |
| `src/app/shared/shop/floating-cart.component.ts` | Prikaz, navigacija, touch pointer capture, long-press, drag, prag uklanjanja, otkazivanje i tajmeri. |
| `src/app/shared/shop/floating-cart.component.html` | Kružna korpa, badge, pristupačno zatvaranje i X zona. |
| `src/app/shared/shop/floating-cart.component.scss` | Responsive položaj, safe-area, kontrolisani z-index, kratke animacije i reduced-motion. |
| `src/app/layout/header/header.component.ts` | Korpa u header-u samo u Shop kontekstu. |
| `src/app/layout/header/header-shop.scss` | Raspored header-a i mobilnog menija kada nema korpe. |
| `src/app/app.component.ts` | Uključivanje floating komponente u javni layout. |
| `src/styles.scss` | Samo safe-area položaj postojećeg back-to-top dugmeta. |
| `tools/shop-public.test.mjs` | Dva dodatna testa: URL kontekst i uslovi resetovanja dismissal-a. |
| `tools/shop-public.browser-test.mjs` | Prošireni postojeći UI testovi za homepage, rute, floating korpu, drag i persistence. |
| `tools/shop-frontend.lint.mjs` | AppComponent uključen u postojeću lint proveru. |
| `SHOP_HOME_FLOATING_CART_REPORT.md` | Ovaj izveštaj. |

`public/sitemap.xml` je imao lokalne izmene pre zadatka. Sačuvan je njihov identičan sadržaj posle build-a. SEO implementacija, Product modeli, CartService, backend, CMS i checkout kod nisu menjani.

**C. HOME SHOP**

Sačuvan je postojeći redosled: **О клубу → Звездина продавница → Управа**. Nema promena okolnih sekcija. Zadržan je API redosled featured proizvoda; ako je taj izbor prazan, koristi se javni katalog. Prazan katalog skriva celu sekciju, bez placeholder kartica. API greška takođe bezbedno skriva sekciju.

Kartice koriste postojeći model i redovnu `priceMinor` cenu formatiranu u RSD. Informacija o sezonskom popustu ostaje informacija; popust se ne predstavlja kao redovna cena. CTA vodi na `/prodavnica`, a kartice na `/prodavnica/:slug`. Postojeći desktop/tablet/mobile carousel ostaje u upotrebi. Kontakt ruta zadržava prethodno ponašanje bez homepage Shop sekcije.

**D. FLOATING CART**

Na `/prodavnica`, `/prodavnica/:slug`, `/korpa`, `/porudzbina` i `/porudzbina/uspesno` korpa je u header-u. Na drugim javnim rutama nema header korpe; floating dugme postoji samo ako ima artikala i nije sakriveno.

Klik otvara `/korpa`. Desktop i tastatura koriste mali ×. Touch/pen: long-press od 180 ms ili pomeranje preko 6 px započinje drag; bubble prati prst uz ograničenje na viewport. Pojavljuje se donja X zona; prag od 64 px aktivira isticanje, magnet i smanjenje bubble-a. Puštanje u zoni skriva prikaz. Puštanje van zone vraća početni položaj; pointer cancellation takođe vraća dugme. Drag ne izaziva slučajnu navigaciju. Escape otkazuje drag.

**E. STATE**

Dismiss zapisuje samo `kmf_floating_cart_dismissed=1` u sessionStorage. Ne menja `kmf_shop_cart`, količine ili sadržaj CartService-a. Stanje opstaje pri navigaciji i reload-u iste sesije; ako sessionStorage nije dostupan, koristi se memorija. Novo dodavanje varijante ili povećanje količine resetuje skrivanje. Uklanjanje, smanjenje količine i početno učitavanje postojeće korpe ne resetuju ga. Shop header korpa ostaje dostupna i kada je floating prikaz sakriven.

**F. RESPONSIVE / ACCESSIBILITY**

Dimenzije 50/46/44 px prate back-to-top; razmak je 14 px, uz mobilne safe-area dodatke. Back-to-top ponašanje ostaje isto. Floating z-index 81, dismiss zona 82, drag 83; postojeći header je iznad njih na 90. Animacije su 200 ms, bez bounce-a, isključene za reduced-motion. Dugme ima aria-label sa brojem artikala, badge je aria-hidden, × ima svoj opis, a obe kontrole imaju vidljiv focus. Zatvaranje tastaturom je alternativa gestu.

Vizuelno pregledani mobilni snimci carousel-a i dugmadi. Browser provere koriste Edge/Chromium sa stvarnim touch događajima preko CDP-a na simuliranim viewport-ima; fizički iOS/Android uređaji nisu testirani.

**G. TEST RESULTS**

Sve završne komande su prošle:

- `node --test tools/shop-public.test.mjs tools/shop-money.test.mjs tools/shop-checkout.test.mjs` — **25/25**.
- `node tools/shop-frontend.lint.mjs` — **34 fajla, 0 grešaka**.
- `node tools/shop-public.browser-test.mjs` — **1440, 768, 390 px**: redosled homepage sekcija, featured/catalog fallback, slike/naslov/RSD cena, klik na proizvod, prazna sekcija, responsive grid, gallery, postojeći cart scenariji; svih pet Shop ruta; non-Shop rute; prazan cart; broj i navigacija; keyboard close; uspešan/neuspešan touch drag i cancellation; očuvan localStorage; session/reload persistence; novo dodavanje vraća bubble; bez preklapanja back-to-top dugmeta. Proveren reduced-motion i desktop 200 ms transition.
- `node tools/shop-checkout.browser-test.mjs` — **1440, 768, 390 px** checkout scenariji, sezonski popust, quote/error/idempotency, receipt/privacy/reload; postojeće CMS provere na 1440/390 px takođe prolaze. Testovi koriste izolovane API fixture-e, bez produkcionih porudžbina ili email poruka.
- `npm run build` — **uspešan, 28 prerenderovanih ruta**; produkcioni public API trenutno vraća 1 aktivan proizvod. Postojeći generator normalno uključuje taj proizvod i 17 objavljenih vesti u build sitemap.
- `git diff --check` — bez whitespace grešaka.

Build ima upozorenje o initial bundle budžetu: **655,59 kB naspram 600 kB**. Build nije blokiran; budžet nije menjan.

Za browser testove korišćen je postojeći eksterni Playwright, bez instalacije zavisnosti u projektu:

```powershell
$env:SHOP_PLAYWRIGHT_MODULE = Join-Path $env:TEMP 'kmf-shop-phase1-tools/node_modules/playwright/index.mjs'
$env:SHOP_TEST_ARTIFACT_DIR = Join-Path $env:TEMP 'kmf-home-floating-artifacts'
node tools/shop-public.browser-test.mjs
node tools/shop-checkout.browser-test.mjs
```

**H. DEPLOYMENT**

Potreban je **samo frontend deploy**. Gotov produkcioni izlaz je `dist/kmf-crvena-zvezda-site/browser/`. Postaviti **ceo sadržaj tog direktorijuma** u postojeći frontend document root: `index.html`, sve hashirane `main-*.js`, `chunk-*.js`, `styles-*.css`, sve generisane HTML poddirektorijume, `images/`, `i18n/`, `sitemap.xml`, `robots.txt` i skriveni `.htaccess`, uz ostale fajlove koje build sadrži. Zbog hashiranih bundle-ova ne postavljati samo pojedinačne JS fajlove.

Nisu potrebni backend deploy, Prisma migracije, promene baze ili environment-a. Source `.ts/.scss` i testove ne postavljati kao javne deploy fajlove. Deploy nije izvršen.
