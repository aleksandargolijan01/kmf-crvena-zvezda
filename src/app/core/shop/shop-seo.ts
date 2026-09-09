import type { CatalogProduct } from './public-shop.models';
import type { SeoConfig } from '../seo/seo.service';
export const SHOP_TITLE = 'Продавница КМФ Црвена звезда | Званична колекција';
export const SHOP_DESCRIPTION = 'Званична продавница КМФ Црвена звезда. Погледајте клупску одећу и званичну колекцију футсал клуба Црвена звезда.';
export const SHOP_AVAILABILITY = { AVAILABLE: 'https://schema.org/InStock', SOLD_OUT: 'https://schema.org/OutOfStock', MADE_TO_ORDER: 'https://schema.org/MadeToOrder' };
export function shopPlainText(value: string): string {
  const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return value.replace(/<(script|style|template|iframe|object|embed|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ').replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, code: string) => {
      if (!code.startsWith('#')) return entities[code.toLowerCase()] ?? entity;
      const hex = code[1].toLowerCase() === 'x', point = Number.parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
      return point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
    }).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function description(value: string) { const text = shopPlainText(value); return text.length <= 160 ? text : text.slice(0, 157).trimEnd() + '...'; }
export function productSeo(product: CatalogProduct, siteUrl: string): SeoConfig {
  const path = `/prodavnica/${product.slug}`, canonical = new URL(path, siteUrl).href;
  const name = shopPlainText(product.name.sr), text = description(product.description.sr || name);
  const fallback = new URL('/images/logo-kmf-crvena-zvezda.png', siteUrl).href;
  const images = [product.coverImage?.url, ...product.gallery.map(image => image.url)].filter((value): value is string => !!value).map(value => {
    try { const url = new URL(value, siteUrl); return url.protocol === 'https:' && !url.username && !url.password ? url.href : fallback; } catch { return fallback; }
  });
  const image = [...new Set(images.length ? images : [fallback])];
  const minor = BigInt(product.priceMinor);
  return {
    title: `${name} | КМФ Црвена звезда`, description: text, path, image: image[0], imageAlt: name, robots: 'index, follow',
    schema: [
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Почетна', item: new URL('/', siteUrl).href },
        { '@type': 'ListItem', position: 2, name: 'Продавница', item: new URL('/prodavnica', siteUrl).href },
        { '@type': 'ListItem', position: 3, name, item: canonical }
      ] },
      { '@context': 'https://schema.org', '@type': 'Product', name, description: text, image, brand: { '@type': 'Brand', name: 'KMF Crvena zvezda' }, offers: {
        '@type': 'Offer', url: canonical, priceCurrency: 'RSD', price: `${minor / 100n}.${String(minor % 100n).padStart(2, '0')}`, availability: SHOP_AVAILABILITY[product.availability]
      } }
    ]
  };
}
