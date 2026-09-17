import assert from 'node:assert/strict';
import test from 'node:test';
import '@angular/compiler';
import { of, lastValueFrom } from 'rxjs';
import { moduleUrl } from './typescript-test-loader.mjs';
const load = file => moduleUrl(new URL('../src/app/' + file, import.meta.url)).then(url => import(url));
const { sponsorCategoryLabel, isRetiredSponsorCategory } = await load('data/sponsor-category-labels.ts');
const { PublicSponsorsService } = await load('core/api/public-sponsors.service.ts');
const { translations } = await load('i18n/translations.ts');
const slugs = ['zlatni-sponzori', 'srebrni-sponzori', 'bronzani-sponzori', 'prijatelji-kluba'];
const expected = { sr: ['Главни партнер', 'Премијум партнер', 'Званични партнер', 'Клупски партнери'], en: ['Main partner', 'Premium partner', 'Official partner', 'Club partners'], ru: ['Главный партнёр', 'Премиум-партнёр', 'Официальный партнёр', 'Клубные партнёры'] };
for (const language of ['sr', 'en', 'ru']) test(`${language}: stable category identifiers map to current labels`, () => {
  const categories = slugs.map((slug, index) => ({ id: String(index), slug, name_sr: 'old', name_en: 'old', order: index, sponsors: [{ id: 'partner' + index }] }));
  const before = JSON.stringify(categories);
  assert.deepEqual(categories.map(category => sponsorCategoryLabel(category, language)), expected[language]);
  assert.equal(JSON.stringify(categories), before);
  assert.notEqual(translations[language]['nav.friends'], expected[language][3]);
});
test('fallback aliases support nested API categories; custom categories retain their names', () => {
  assert.equal(sponsorCategoryLabel({ name_sr: 'Златни спонзори' }), 'Главни партнер');
  assert.equal(sponsorCategoryLabel({ name_sr: 'Посебна категорија', name_en: 'Custom category' }, 'en'), 'Custom category');
  assert.equal(isRetiredSponsorCategory({ name_sr: 'Насловни спонзор' }), true);
});
test('public presentation hides only empty retired category and preserves partner IDs/order/logos', async () => {
  const retired = { id: 'title', slug: 'naslovni-sponzor', name_sr: 'Насловни спонзор', sponsors: [] };
  const current = slugs.map(slug => ({ slug, name_sr: slug, sponsors: [{ id: slug, logoUrl: '/test.png' }] }));
  const service = new PublicSponsorsService({ sponsors: () => of([retired, ...current]) });
  assert.deepEqual((await lastValueFrom(service.groupedState())).categories, current);
  retired.sponsors.push({ id: 'historical-partner' });
  assert.deepEqual((await lastValueFrom(service.groupedState())).categories, [retired, ...current]);
});
test('public SR terminology and current package count are exact', () => {
  assert.equal(translations.sr['nav.friends'], 'Партнери клуба');
  assert.equal(translations.sr['friends.hero.title'], 'Партнери клуба');
  assert.equal(translations.sr['home.sponsors.title'], 'Партнери');
  assert.equal(translations.sr['friends.hero.cta'], 'ПОСТАНИ ПАРТНЕР');
  assert.equal(translations.sr['friends.hero.packageValue'], '4 пакета');
});
