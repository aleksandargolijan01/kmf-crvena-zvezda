// Activate only for the isolated test build via NODE_OPTIONS=--import=... .
import { snapshotNews, partners, pageResponse } from './homepage-freshness.fixtures.mjs';
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (url.hostname !== 'api.kmfcrvenazvezda.rs') return originalFetch(input, init);
  let data = [];
  if (url.pathname === '/news') data = pageResponse(snapshotNews);
  else if (url.pathname.startsWith('/news/')) data = snapshotNews.find(n => url.pathname.endsWith('/' + n.slug)) ?? {};
  else if (url.pathname === '/sponsors/grouped') data = partners(3);
  else if (url.pathname === '/shop/products') data = pageResponse([]);
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=0, must-revalidate' } });
};
