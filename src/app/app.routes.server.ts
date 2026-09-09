import { PrerenderFallback, RenderMode, ServerRoute } from '@angular/ssr';
import { fetchActiveProducts } from '../../tools/static-shop-seo.mjs';

type NewsPage = {
  data?: Array<{ slug?: string }>;
  meta?: { totalPages?: number };
};

const apiBaseUrl = 'https://api.kmfcrvenazvezda.rs';

export const serverRoutes: ServerRoute[] = [
  { path: 'prodavnica', renderMode: RenderMode.Prerender },
  {
    path: 'prodavnica/:slug', renderMode: RenderMode.Prerender, fallback: PrerenderFallback.None,
    async getPrerenderParams() { return (await fetchActiveProducts(apiBaseUrl)).map(({ slug }) => ({ slug })); }
  },
  {
    path: 'vesti/:slug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.None,
    async getPrerenderParams() {
      const slugs = new Set<string>();
      let page = 1;
      let totalPages = 1;

      do {
        const response = await fetch(`${apiBaseUrl}/news?page=${page}&limit=50`, {
          headers: { accept: 'application/json' }
        });

        if (!response.ok) {
          throw new Error(`News API returned HTTP ${response.status} while collecting prerender routes.`);
        }

        const payload = await response.json() as NewsPage;
        for (const item of payload.data ?? []) {
          if (item.slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)) {
            slugs.add(item.slug);
          }
        }

        totalPages = Number.isInteger(payload.meta?.totalPages) && Number(payload.meta?.totalPages) > 0
          ? Number(payload.meta?.totalPages)
          : 1;
        page += 1;
      } while (page <= totalPages);

      return [...slugs].map((slug) => ({ slug }));
    }
  },
  ...['', 'tim', 'u19-tim', 'vesti', 'uprava', 'upravni-odbor', 'prijatelji-kluba', 'kontakt', '404']
    .map((path): ServerRoute => ({ path, renderMode: RenderMode.Prerender })),
  {
    path: 'admin/**',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];
