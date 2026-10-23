// Deliberately stale build-time content. Browser tests return newer content from the API.
export const snapshotNews = [16, 15, 14].map(day => ({
  id: `old-${day}`, slug: `old-${day}`, title_sr: `September ${day}`, title_en: `September EN ${day}`, title_ru: `September RU ${day}`,
  excerpt_sr: 'Prerender snapshot', content_sr: 'Snapshot content', publishedAt: `2026-09-${day}T12:00:00.000Z`, featured: true,
  coverImage: '/images/social-share-default.png'
}));
export const currentNews = [23, 22, 21].map(day => ({
  ...snapshotNews[0], id: `new-${day}`, slug: `new-${day}`, title_sr: `October ${day}`, title_en: `October EN ${day}`, title_ru: `October RU ${day}`,
  publishedAt: `2026-10-${day}T12:00:00.000Z`, featured: false
}));
export const partners = (count, version = 'old') => [{
  id: 'category', slug: 'zlatni-sponzori', name_sr: 'Partners', name_en: 'Partners', name_ru: 'Partners', active: true, order: 0,
  sponsors: Array.from({ length: count }, (_, i) => ({
    id: `partner-${i}`, name: `Partner ${i}`, active: true, featured: false, order: i,
    logoUrl: `/fixture-logos/${version}-${i}.svg`, websiteUrl: 'https://example.invalid/'
  }))
}];
export const pageResponse = data => ({ data, meta: { page: 1, limit: 24, total: data.length, totalPages: 1 } });
