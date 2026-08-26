import { writeFile } from 'node:fs/promises';
import { createSitemapXml, fetchPublishedNews } from './static-news-seo.mjs';

const siteUrl = requiredEnv('PUBLIC_SITE_URL');
const apiBaseUrl = process.env.API_BASE_URL || process.env.API_URL;

if (!apiBaseUrl) {
  throw new Error('API_BASE_URL is required to generate a fresh production sitemap.');
}

const newsItems = await fetchPublishedNews(apiBaseUrl);
await writeFile('public/sitemap.xml', createSitemapXml(newsItems, siteUrl), 'utf8');
console.log(`Generated sitemap with ${newsItems.length} published news routes.`);

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required to generate a fresh production sitemap.`);
  }
  return value;
}
