import { writeFile } from 'node:fs/promises';
import { createSitemapXml, fetchPublishedNews } from './static-news-seo.mjs';
import { appendShopSitemap, fetchActiveProducts } from './static-shop-seo.mjs';

const siteUrl = process.env.PUBLIC_SITE_URL || 'https://kmfcrvenazvezda.rs';
const apiBaseUrl = process.env.API_BASE_URL || process.env.API_URL || 'https://api.kmfcrvenazvezda.rs';

const [newsItems, products] = await Promise.all([fetchPublishedNews(apiBaseUrl), fetchActiveProducts(apiBaseUrl)]);
await writeFile('public/sitemap.xml', appendShopSitemap(createSitemapXml(newsItems, siteUrl), products, siteUrl), 'utf8');
console.log(`Generated sitemap with ${newsItems.length} published news routes, Shop catalog and ${products.length} active product routes.`);
