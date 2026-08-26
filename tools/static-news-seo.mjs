import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const STATIC_ROUTES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/tim', changefreq: 'weekly', priority: '0.8' },
  { path: '/u19-tim', changefreq: 'weekly', priority: '0.7' },
  { path: '/uprava', changefreq: 'monthly', priority: '0.7' },
  { path: '/upravni-odbor', changefreq: 'monthly', priority: '0.7' },
  { path: '/prijatelji-kluba', changefreq: 'weekly', priority: '0.8' },
  { path: '/kontakt', changefreq: 'monthly', priority: '0.6' },
  { path: '/vesti', changefreq: 'daily', priority: '0.9' },
];

const META_KEYS = new Set([
  'description',
  'robots',
  'og:title',
  'og:description',
  'og:image',
  'og:image:secure_url',
  'og:image:alt',
  'og:url',
  'og:type',
  'og:site_name',
  'og:locale',
  'twitter:card',
  'twitter:title',
  'twitter:description',
  'twitter:image',
  'twitter:image:alt',
  'article:published_time',
  'article:modified_time',
]);

export async function fetchPublishedNews(apiBaseUrl, fetchImpl = fetch) {
  const baseUrl = requireHttpsUrl(apiBaseUrl, 'API_BASE_URL');
  const collected = [];
  let page = 1;
  let totalPages = 1;

  do {
    const url = new URL(`${baseUrl.pathname.replace(/\/$/, '')}/news`, baseUrl.origin);
    url.searchParams.set('page', String(page));
    url.searchParams.set('limit', '100');

    const response = await fetchImpl(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      throw new Error(`News API returned HTTP ${response.status} for ${url}`);
    }

    const payload = await response.json();
    if (!payload || !Array.isArray(payload.data)) {
      throw new Error(`News API returned an invalid payload for ${url}`);
    }

    collected.push(...payload.data);
    totalPages = positiveInteger(payload.meta?.totalPages, 1);
    page += 1;

    if (page > 10_000) {
      throw new Error('News API pagination exceeded the safety limit.');
    }
  } while (page <= totalPages);

  return publishedNews(collected);
}

export function createNewsMetadata(news, options) {
  const siteUrl = requireHttpsUrl(options.siteUrl, 'PUBLIC_SITE_URL');
  const siteName = plainText(options.siteName) || 'KMF Crvena Zvezda';
  const slug = normalizeSlug(news?.slug);
  const title = truncate(plainText(news?.title_sr), 180);

  if (!slug || !title || news?.published === false) {
    return null;
  }

  const canonical = new URL(`/vesti/${slug}`, siteUrl).href;
  const fallbackImage = resolveImageUrl(options.defaultImage, siteUrl, null);
  if (!fallbackImage) {
    throw new Error('The default social image must resolve to an absolute HTTPS URL.');
  }

  const image = resolveImageUrl(news.coverImage, siteUrl, fallbackImage);
  const sourceDescription = plainText(news.excerpt_sr) || plainText(news.content_sr) || title;
  const description = truncate(sourceDescription, 160);
  const publishedAt = isoDate(news.publishedAt);
  const modifiedAt = isoDate(news.updatedAt) || publishedAt;
  const publisherLogo = resolveImageUrl(options.publisherLogo, siteUrl, null);

  if (!publisherLogo) {
    throw new Error('The publisher logo must resolve to an absolute HTTPS URL.');
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: title,
    description,
    image: [image],
    ...(publishedAt ? { datePublished: publishedAt } : {}),
    ...(modifiedAt ? { dateModified: modifiedAt } : {}),
    author: {
      '@type': 'Organization',
      name: siteName,
    },
    publisher: {
      '@type': 'Organization',
      name: siteName,
      logo: {
        '@type': 'ImageObject',
        url: publisherLogo,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonical,
    },
  };

  return {
    slug,
    title,
    description,
    canonical,
    image,
    imageAlt: title,
    siteName,
    publishedAt,
    modifiedAt,
    structuredData,
  };
}

export function renderNewsHtml(appShell, metadata) {
  if (!metadata || typeof appShell !== 'string' || !/<\/head>/i.test(appShell)) {
    throw new Error('A valid Angular app shell and news metadata are required.');
  }

  let html = appShell
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\b[^>]*>/gi, (tag) => (isManagedMetaTag(tag) ? '' : tag))
    .replace(/<link\b[^>]*\brel\s*=\s*(["'])canonical\1[^>]*>/gi, '')
    .replace(/<script\b[^>]*\bdata-seo-jsonld\s*=\s*(["'])true\1[^>]*>[\s\S]*?<\/script>/gi, '');

  const tags = [
    `<title>${escapeHtml(metadata.title)}</title>`,
    meta('name', 'description', metadata.description),
    meta('name', 'robots', 'index, follow'),
    `<link rel="canonical" href="${escapeAttribute(metadata.canonical)}" />`,
    meta('property', 'og:type', 'article'),
    meta('property', 'og:title', metadata.title),
    meta('property', 'og:description', metadata.description),
    meta('property', 'og:url', metadata.canonical),
    meta('property', 'og:image', metadata.image),
    meta('property', 'og:image:secure_url', metadata.image),
    meta('property', 'og:image:alt', metadata.imageAlt),
    meta('property', 'og:site_name', metadata.siteName),
    meta('property', 'og:locale', 'sr_RS'),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', metadata.title),
    meta('name', 'twitter:description', metadata.description),
    meta('name', 'twitter:image', metadata.image),
    meta('name', 'twitter:image:alt', metadata.imageAlt),
    metadata.publishedAt ? meta('property', 'article:published_time', metadata.publishedAt) : '',
    metadata.modifiedAt ? meta('property', 'article:modified_time', metadata.modifiedAt) : '',
    `<script type="application/ld+json" data-seo-jsonld="true">${safeJson(metadata.structuredData)}</script>`,
  ].filter(Boolean).join('\n    ');

  html = html.replace(/<\/head>/i, `    ${tags}\n  </head>`);
  return html;
}

export function createSitemapXml(newsItems, siteUrl, buildDate = new Date()) {
  const site = requireHttpsUrl(siteUrl, 'PUBLIC_SITE_URL');
  const today = buildDate.toISOString().slice(0, 10);
  const routes = [
    ...STATIC_ROUTES.map((route) => ({ ...route, lastmod: today })),
    ...publishedNews(newsItems).map((news) => ({
      path: `/vesti/${normalizeSlug(news.slug)}`,
      lastmod: dateOnly(news.updatedAt || news.publishedAt || news.createdAt),
      changefreq: 'monthly',
      priority: '0.8',
    })),
  ];

  const entries = routes.map((route) => {
    const location = new URL(route.path, site).href;
    return [
      '  <url>',
      `    <loc>${escapeXml(location)}</loc>`,
      ...(route.lastmod ? [`    <lastmod>${route.lastmod}</lastmod>`] : []),
      `    <changefreq>${route.changefreq}</changefreq>`,
      `    <priority>${route.priority}</priority>`,
      '  </url>',
    ].join('\n');
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

export async function writeStaticSeoArtifacts(options) {
  const outputDir = path.resolve(options.outputDir);
  const indexPath = path.join(outputDir, 'index.html');
  const appShell = options.appShell ?? await readFile(indexPath, 'utf8');
  const newsItems = publishedNews(options.newsItems);
  const writtenRoutes = [];

  for (const news of newsItems) {
    const metadata = createNewsMetadata(news, options);
    if (!metadata) {
      continue;
    }

    const renderedHtml = renderNewsHtml(appShell, metadata);
    assertCrawlerMetadata(renderedHtml, metadata);
    const routeDirectory = path.join(outputDir, 'vesti', metadata.slug);
    await mkdir(routeDirectory, { recursive: true });
    await writeFile(path.join(routeDirectory, 'index.html'), renderedHtml, 'utf8');
    writtenRoutes.push(`/vesti/${metadata.slug}`);
  }

  await writeFile(path.join(outputDir, 'sitemap.xml'), createSitemapXml(newsItems, options.siteUrl), 'utf8');
  await writeFile(
    path.join(outputDir, 'static-news-seo-manifest.json'),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), routes: writtenRoutes }, null, 2)}\n`,
    'utf8',
  );

  return writtenRoutes;
}

export function assertCrawlerMetadata(rawHtml, metadata) {
  const requiredFragments = [
    meta('property', 'og:title', metadata.title),
    meta('property', 'og:description', metadata.description),
    meta('property', 'og:image', metadata.image),
    `<link rel="canonical" href="${escapeAttribute(metadata.canonical)}" />`,
  ];

  if (requiredFragments.some((fragment) => !rawHtml.includes(fragment))) {
    throw new Error(`Generated raw HTML validation failed for /vesti/${metadata.slug}.`);
  }
}

export function publishedNews(items) {
  if (!Array.isArray(items)) {
    throw new Error('Published news must be an array.');
  }

  const slugs = new Set();
  return items.filter((news) => {
    const slug = normalizeSlug(news?.slug);
    if (!slug || news?.published === false || slugs.has(slug)) {
      return false;
    }
    slugs.add(slug);
    return true;
  });
}

export function plainText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return decodeHtmlEntities(
    value
      .replace(/<(script|style|template|iframe|object|embed|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
      .replace(/<[^>]*>/g, ' '),
  ).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function resolveImageUrl(value, siteUrl, fallback) {
  const site = requireHttpsUrl(siteUrl, 'PUBLIC_SITE_URL');
  const candidate = typeof value === 'string' ? value.trim() : '';
  if (!candidate) {
    return fallback;
  }

  try {
    const url = candidate.startsWith('/') && !candidate.startsWith('//')
      ? new URL(candidate, site)
      : new URL(candidate);
    return url.protocol === 'https:' && url.hostname ? url.href : fallback;
  } catch {
    return fallback;
  }
}

function requireHttpsUrl(value, label) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
      throw new Error();
    }
    return url;
  } catch {
    throw new Error(`${label} must be an absolute HTTPS URL without embedded credentials.`);
  }
}

function normalizeSlug(value) {
  const slug = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : '';
}

function isManagedMetaTag(tag) {
  const match = tag.match(/\b(?:name|property)\s*=\s*(["'])([^"']+)\1/i);
  return match ? META_KEYS.has(match[2].toLowerCase()) : false;
}

function meta(attribute, key, value) {
  return `<meta ${attribute}="${escapeAttribute(key)}" content="${escapeAttribute(value)}" />`;
}

function truncate(value, maxLength) {
  const normalized = value.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

function isoDate(value) {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function dateOnly(value) {
  const iso = isoDate(value);
  return iso?.slice(0, 10);
}

function positiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function decodeHtmlEntities(value) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, code) => {
    if (code[0] === '#') {
      const radix = code[1].toLowerCase() === 'x' ? 16 : 10;
      const raw = radix === 16 ? code.slice(2) : code.slice(1);
      const point = Number.parseInt(raw, radix);
      return Number.isInteger(point) && point >= 0 && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : entity;
    }
    return named[code.toLowerCase()] ?? entity;
  });
}

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function escapeXml(value) {
  return escapeAttribute(value);
}

function safeJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
