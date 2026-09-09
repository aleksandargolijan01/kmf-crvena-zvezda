# SEO i statički deployment

Frontend koristi Angular prerender sa `outputMode: static`. Produkcioni rezultat za cPanel/Apache je sadržaj direktorijuma `dist/kmf-crvena-zvezda-site/browser`; frontend ne zahtijeva Node proces.

`npm run build` prije Angular builda čita javni NestJS endpoint i generiše sitemap samo iz objavljenih vijesti. Angular zatim prerenderuje javne statičke rute i svaku tada objavljenu `/vesti/:slug` rutu. Objavljivanje, povlačenje ili promjena sluga vijesti zato mora pokrenuti novi frontend build/deployment. Build namjerno pada ako javni news API nije dostupan, umjesto da objavi nepotpun sitemap ili skup prerenderovanih članaka.

Na cPanelu Apache DocumentRoot treba da pokazuje na sadržaj `browser` direktorijuma, uključujući `.htaccess`. Pravila čuvaju Angular admin routing, dodaju `X-Robots-Tag: noindex, nofollow` za sve `/admin` URL-ove i vraćaju stvarni HTTP 404 za ostale nepostojeće putanje. Potrebni su `mod_rewrite`, a za HTTP noindex zaglavlje i `mod_headers`.

## Budući multilingual SEO

Trenutni izbor jezika mijenja sadržaj na istom URL-u u browseru, pa zasebni `sr`, `en` i `ru` hreflang linkovi ne bi predstavljali crawlable jezičke verzije. Zato se hreflang trenutno ne generiše. Kada svaki jezik dobije stabilne URL-ove (na primjer `/sr/`, `/en/` i `/ru/`), treba:

1. prerenderovati svaku jezičku rutu sa odgovarajućim sadržajem i `html lang` vrijednošću;
2. postaviti self-referencing canonical za svaku verziju;
3. na svakoj verziji dodati uzajamne `hreflang` linkove za `sr`, `en`, `ru` i `x-default`;
4. uključiti sve jezičke URL-ove i njihove alternate veze u sitemap.
