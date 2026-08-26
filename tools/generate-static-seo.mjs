import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchPublishedNews, writeStaticSeoArtifacts } from './static-news-seo.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siteUrl = requiredEnv('PUBLIC_SITE_URL');
const apiBaseUrl = process.env.API_BASE_URL || process.env.API_URL;

if (!apiBaseUrl) {
  throw new Error('API_BASE_URL is required for the production SEO build.');
}

const newsItems = await fetchPublishedNews(apiBaseUrl);
const outputDir = path.join(projectRoot, 'dist', 'kmf-crvena-zvezda-site', 'browser');
const routes = await writeStaticSeoArtifacts({
  outputDir,
  newsItems,
  siteUrl,
  siteName: 'KMF Crvena Zvezda',
  defaultImage: '/images/social-share-default.png',
  publisherLogo: '/images/logo-kmf-crvena-zvezda.png',
});

console.log(`Generated crawler-ready HTML for ${routes.length} published news routes.`);
console.log(`Generated a fresh sitemap in ${outputDir}.`);

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for the production SEO build.`);
  }
  return value;
}
