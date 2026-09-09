const validSlug = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
export function activeProducts(items) {
  if (!Array.isArray(items)) throw new Error('Shop API must return a product array.');
  const seen = new Set();
  // The public endpoint already restricts active=true; also reject explicit inactive fixtures/data.
  return items.filter(item => {
    if (!item || item.active === false || !validSlug(item.slug) || seen.has(item.slug)) return false;
    seen.add(item.slug); return true;
  });
}
function httpsUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Shop SEO requires an HTTPS URL without credentials.');
  return url;
}
export async function fetchActiveProducts(apiBaseUrl, fetchImpl = fetch) {
  const base = httpsUrl(apiBaseUrl), collected = [];
  let page = 1, totalPages = 1;
  do {
    const url = new URL(`${base.pathname.replace(/\/$/, '')}/shop/products`, base.origin);
    url.searchParams.set('page', String(page)); url.searchParams.set('limit', '50');
    const response = await fetchImpl(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`Shop API returned HTTP ${response.status} while collecting SEO routes. No incomplete Shop sitemap/prerender will be generated.`);
    const payload = await response.json();
    if (!payload || !Array.isArray(payload.data)) throw new Error('Shop API returned an invalid SEO payload.');
    collected.push(...payload.data);
    totalPages = Number.isInteger(payload.meta?.totalPages) && payload.meta.totalPages > 0 ? payload.meta.totalPages : 1;
    if (totalPages > 10000) throw new Error('Shop pagination exceeded the safety limit.');
    page++;
  } while (page <= totalPages);
  return activeProducts(collected);
}
export function appendShopSitemap(newsSitemap, products, siteUrl) {
  const site = httpsUrl(siteUrl);
  if (!newsSitemap.includes('</urlset>')) throw new Error('A valid existing news sitemap is required.');
  const escapeXml = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const paths = ['/prodavnica', ...activeProducts(products).map(product => `/prodavnica/${product.slug}`)];
  const entries = paths.map(route => `  <url>\n    <loc>${escapeXml(new URL(route, site).href)}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`).join('');
  return newsSitemap.replace('</urlset>', entries + '</urlset>');
}
