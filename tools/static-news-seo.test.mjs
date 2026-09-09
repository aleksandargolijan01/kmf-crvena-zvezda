import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  createNewsMetadata,
  plainText,
  renderNewsHtml,
  writeStaticSeoArtifacts,
} from './static-news-seo.mjs';

const options = {
  siteUrl: 'https://kmfcrvenazvezda.rs',
  siteName: 'KMF Crvena zvezda',
  defaultImage: '/images/social-share-default.png',
  publisherLogo: '/images/logo-kmf-crvena-zvezda.png',
};
const shell = '<!doctype html><html><head><title>Generic</title><meta name="description" content="Generic"><meta property="og:title" content="Generic"><meta property="og:image" content="/generic.jpg"></head><body><app-root></app-root><script src="main.js"></script></body></html>';

test('A: raw HTML contains article metadata and absolute cover image', () => {
  const metadata = createNewsMetadata({
    slug: 'pobeda-crveno-belih',
    title_sr: 'Pobeda crveno-belih',
    excerpt_sr: 'Izveštaj sa utakmice.',
    coverImage: 'https://project.supabase.co/storage/v1/object/public/news/win.jpg',
    publishedAt: '2026-08-20T12:00:00Z',
    updatedAt: '2026-08-21T12:00:00Z',
  }, options);
  const rawHtml = renderNewsHtml(shell, metadata);

  assert.match(rawHtml, /<meta property="og:title" content="Pobeda crveno-belih"/);
  assert.match(rawHtml, /<meta property="og:description" content="Izveštaj sa utakmice\."/);
  assert.match(rawHtml, /<meta property="og:image" content="https:\/\/project\.supabase\.co\//);
  assert.match(rawHtml, /<link rel="canonical" href="https:\/\/kmfcrvenazvezda\.rs\/vesti\/pobeda-crveno-belih"/);
  assert.match(rawHtml, /"@type":"NewsArticle"/);
  assert.equal((rawHtml.match(/property="og:title"/g) ?? []).length, 1);
});

test('B: missing cover image uses an absolute HTTPS fallback', () => {
  const metadata = createNewsMetadata({ slug: 'bez-slike', title_sr: 'Vest bez slike', excerpt_sr: 'Opis.' }, options);
  assert.equal(metadata.image, 'https://kmfcrvenazvezda.rs/images/social-share-default.png');
});

test('C: missing excerpt produces safe plain-text content description', () => {
  const metadata = createNewsMetadata({
    slug: 'bez-opisa',
    title_sr: 'Vest bez opisa',
    content_sr: '<p>Prvi <strong>važan</strong> pasus.</p><script>alert(1)</script><p>Drugi pasus.</p>',
  }, options);
  assert.equal(metadata.description, 'Prvi važan pasus. Drugi pasus.');
  assert.equal(plainText('<img src=x onerror=alert(1)>Bezbedno'), 'Bezbedno');
  assert.doesNotMatch(renderNewsHtml(shell, metadata), /<script>alert\(1\)<\/script>/);
});

test('CMS values cannot break out of metadata attributes or JSON-LD scripts', () => {
  const metadata = createNewsMetadata({
    slug: 'bezbedna-vest',
    title_sr: '"><script>alert(1)</script> Naslov',
    excerpt_sr: '"><img src=x onerror=alert(1)> Opis',
    coverImage: 'javascript:alert(1)',
  }, options);
  const rawHtml = renderNewsHtml(shell, metadata);

  assert.doesNotMatch(rawHtml, /<script>alert\(1\)<\/script>/);
  assert.doesNotMatch(rawHtml, /<img src=x onerror/);
  assert.doesNotMatch(rawHtml, /javascript:alert/);
  assert.match(rawHtml, /https:\/\/kmfcrvenazvezda\.rs\/images\/social-share-default\.png/);
  assert.match(rawHtml, /&quot;&gt; Naslov/);
});

test('D/E: nonexistent and explicitly unpublished slugs do not get static crawler pages', async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), 'kmf-static-seo-'));
  try {
    await writeFile(path.join(outputDir, 'index.html'), shell, 'utf8');
    const routes = await writeStaticSeoArtifacts({
      ...options,
      outputDir,
      newsItems: [
        { slug: 'objavljena-vest', title_sr: 'Objavljena vest', excerpt_sr: 'Opis.' },
        { slug: 'draft-vest', title_sr: 'Draft vest', excerpt_sr: 'Ne sme biti javno.', published: false },
      ],
    });

    assert.deepEqual(routes, ['/vesti/objavljena-vest']);
    const rawHtml = await readFile(path.join(outputDir, 'vesti', 'objavljena-vest', 'index.html'), 'utf8');
    assert.match(rawHtml, /Objavljena vest/);
    await assert.rejects(readFile(path.join(outputDir, 'vesti', 'draft-vest', 'index.html'), 'utf8'));
    await assert.rejects(readFile(path.join(outputDir, 'vesti', 'nepostojeca', 'index.html'), 'utf8'));
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});
