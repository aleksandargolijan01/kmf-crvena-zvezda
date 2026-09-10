import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import '@angular/compiler';
import { computed } from '@angular/core';
import { moduleUrl } from './typescript-test-loader.mjs';

const root = new URL('../src/app/', import.meta.url);
const load = async path => import(await moduleUrl(new URL(path, root)));
const { translations } = await load('i18n/translations.ts');
const { TranslationService } = await load('i18n/translation.service.ts');
const { productSeo } = await load('core/shop/shop-seo.ts');
const { productBadge } = await load('core/shop/public-shop.models.ts');
const { checkoutErrorKey } = await load('core/shop/checkout.models.ts');
const product = { slug: 'majica', name: { sr: 'Мајица', en: 'Shirt', ru: 'Футболка' }, description: { sr: '<p>Памук</p>', en: '<p>Cotton</p>', ru: '<p>Хлопок</p>' }, priceMinor: 320050, availability: 'AVAILABLE', isNew: true, coverImage: null, gallery: [] };

test('all Shop keys have complete SR/EN/RU dictionaries and every used key exists', async () => {
  const keys = Object.keys(translations.sr).filter(key => key.startsWith('shop.')).sort();
  assert.ok(keys.length > 150);
  for (const language of ['sr', 'en', 'ru']) {
    assert.deepEqual(Object.keys(translations[language]).filter(key => key.startsWith('shop.')).sort(), keys);
    for (const key of keys.filter(key => key !== 'shop.empty')) {
      assert.ok(translations[language][key].trim(), `${language}: ${key}`);
      assert.doesNotMatch(translations[language][key], /\?\?\?|�/, `${language}: ${key}`);
    }
  }
  for (const dir of ['pages/shop/', 'shared/shop/']) {
    for (const file of (await readdir(new URL(dir, root))).filter(file => /\.(ts|html)$/.test(file))) {
      const source = await readFile(new URL(dir + file, root), 'utf8');
      for (const [, key] of source.matchAll(/['"](shop\.[\w]+)['"]/g)) assert.ok(keys.includes(key), file + ': ' + key);
      assert.doesNotMatch(source, /lang="sr-Cyrl"|\.name\.sr|\.description\.sr|[А-Яа-яЂђЋћЈјЉљЊњЏџ]/, file);
    }
  }
});

test('real Angular signals switch product content, badges, static copy, persistent errors and SEO without reload', () => {
  const doc = { documentElement: { lang: '' } };
  const i18n = new TranslationService('server', doc, {}, {});
  const name = computed(() => i18n.text(product.name));
  const badge = computed(() => productBadge(product, i18n.currentLanguage()));
  const buy = computed(() => i18n.t('shop.addToCart'));
  const errorKey = checkoutErrorKey({ error: { code: 'PRICE_CHANGED' } });
  const error = computed(() => i18n.t(errorKey));
  const seo = computed(() => productSeo(product, 'https://kmfcrvenazvezda.rs', i18n.currentLanguage()));
  for (const language of ['sr', 'en', 'ru', 'sr']) {
    i18n.setLanguage(language, false);
    assert.equal(name(), product.name[language]);
    assert.equal(badge(), translations[language]['shop.new']);
    assert.equal(buy(), translations[language]['shop.addToCart']);
    assert.equal(error(), translations[language]['shop.priceChanged']);
    assert.equal(doc.documentElement.lang, language === 'sr' ? 'sr-Cyrl' : language);
    assert.ok(seo().title.startsWith(product.name[language]));
    assert.equal(seo().description, product.description[language].replace(/<[^>]+>/g, ''));
    const schema = seo().schema.find(item => item['@type'] === 'Product');
    assert.equal(schema.name, name()); assert.equal(schema.description, seo().description);
    assert.equal(schema.offers.price, '3200.50'); assert.equal(schema.offers.url, 'https://kmfcrvenazvezda.rs/prodavnica/majica');
  }
  i18n.setLanguage('ru', false);
  assert.equal(i18n.text({ sr: 'Резервни текст', en: '', ru: '' }), 'Резервни текст');
  assert.ok(productSeo({ ...product, name: { sr: 'Мајица' }, description: { sr: 'Памук' } }, 'https://kmfcrvenazvezda.rs', 'en').title.startsWith('Мајица'));
});
