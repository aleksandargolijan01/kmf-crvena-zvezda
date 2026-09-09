// Test-only fetch interception. Activate explicitly with NODE_OPTIONS=--import=... .
// No production generator imports this module; no real API writes are performed.
export const seoProducts = ['AVAILABLE', 'SOLD_OUT', 'MADE_TO_ORDER'].map((availability, index) => ({
  id: `seo-test-${index}`, slug: `seo-test-product-${index}`, active: true,
  name: { sr: `Тест производ ${index}` }, description: { sr: '<p>Званична клупска одећа &amp; опрема за навијаче.</p>' },
  priceMinor: 320050 + index * 10000, currency: 'RSD', availability, featured: false, isNew: false,
  coverImage: { id: 'test-cover', url: 'https://kmfcrvenazvezda.rs/images/logo-kmf-crvena-zvezda.png' }, gallery: [],
  variants: [{ id: `seo-test-size-${index}`, size: 'M', available: availability !== 'SOLD_OUT' }], availableForOrder: availability !== 'SOLD_OUT'
}));
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (url.hostname === 'api.kmfcrvenazvezda.rs' && url.pathname.startsWith('/shop/products')) {
    const product = seoProducts.find(product => url.pathname === `/shop/products/${product.slug}`);
    const catalog = url.pathname === '/shop/products';
    return new Response(JSON.stringify(catalog ? { data: seoProducts, meta: { page: 1, totalPages: 1, limit: 50, total: seoProducts.length } } : product ?? {}), { status: catalog || product ? 200 : 404, headers: { 'Content-Type': 'application/json' } });
  }
  return originalFetch(input, init);
};
