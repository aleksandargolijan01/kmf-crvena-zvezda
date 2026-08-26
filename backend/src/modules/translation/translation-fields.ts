import { TranslationField } from './translation.service';

export const NEWS_TRANSLATION_FIELDS: TranslationField[] = [
  {
    sourceKey: 'title_sr',
    targetKey: 'title_en',
    label: 'news title in English',
    maxLength: 180,
  },
  {
    sourceKey: 'title_sr',
    targetKey: 'title_ru',
    label: 'news title in Russian',
    maxLength: 180,
  },
  {
    sourceKey: 'excerpt_sr',
    targetKey: 'excerpt_en',
    label: 'news excerpt in English',
    maxLength: 500,
    sourceNullable: true,
  },
  {
    sourceKey: 'excerpt_sr',
    targetKey: 'excerpt_ru',
    label: 'news excerpt in Russian',
    maxLength: 500,
    sourceNullable: true,
  },
  {
    sourceKey: 'content_sr',
    targetKey: 'content_en',
    label: 'news body in English',
    preserveHtml: true,
  },
  {
    sourceKey: 'content_sr',
    targetKey: 'content_ru',
    label: 'news body in Russian',
    preserveHtml: true,
  },
];

export const PLAYER_TRANSLATION_FIELDS: TranslationField[] = [
  {
    sourceKey: 'bio_sr',
    targetKey: 'bio_en',
    label: 'player biography in English',
    preserveHtml: true,
    sourceNullable: true,
  },
  {
    sourceKey: 'bio_sr',
    targetKey: 'bio_ru',
    label: 'player biography in Russian',
    preserveHtml: true,
    sourceNullable: true,
  },
];

export const MANAGEMENT_TRANSLATION_FIELDS: TranslationField[] = [
  {
    sourceKey: 'role_sr',
    targetKey: 'role_en',
    label: 'member role in English',
    maxLength: 180,
  },
  {
    sourceKey: 'role_sr',
    targetKey: 'role_ru',
    label: 'member role in Russian',
    maxLength: 180,
  },
  {
    sourceKey: 'bio_sr',
    targetKey: 'bio_en',
    label: 'member biography in English',
    preserveHtml: true,
    sourceNullable: true,
  },
  {
    sourceKey: 'bio_sr',
    targetKey: 'bio_ru',
    label: 'member biography in Russian',
    preserveHtml: true,
    sourceNullable: true,
  },
];

export const STAFF_TRANSLATION_FIELDS: TranslationField[] = [
  {
    sourceKey: 'role_sr',
    targetKey: 'role_en',
    label: 'staff role in English',
    maxLength: 180,
  },
  {
    sourceKey: 'role_sr',
    targetKey: 'role_ru',
    label: 'staff role in Russian',
    maxLength: 180,
  },
  {
    sourceKey: 'bio_sr',
    targetKey: 'bio_en',
    label: 'staff biography in English',
    preserveHtml: true,
    sourceNullable: true,
  },
  {
    sourceKey: 'bio_sr',
    targetKey: 'bio_ru',
    label: 'staff biography in Russian',
    preserveHtml: true,
    sourceNullable: true,
  },
];

export const SPONSOR_CATEGORY_TRANSLATION_FIELDS: TranslationField[] = [
  {
    sourceKey: 'name_sr',
    targetKey: 'name_en',
    label: 'sponsor category name in English',
    maxLength: 180,
  },
  {
    sourceKey: 'name_sr',
    targetKey: 'name_ru',
    label: 'sponsor category name in Russian',
    maxLength: 180,
  },
  {
    sourceKey: 'description_sr',
    targetKey: 'description_en',
    label: 'sponsor category description in English',
    preserveHtml: true,
    sourceNullable: true,
  },
  {
    sourceKey: 'description_sr',
    targetKey: 'description_ru',
    label: 'sponsor category description in Russian',
    preserveHtml: true,
    sourceNullable: true,
  },
];

export const SPONSOR_TRANSLATION_FIELDS: TranslationField[] = [
  {
    sourceKey: 'description_sr',
    targetKey: 'description_en',
    label: 'sponsor description in English',
    preserveHtml: true,
    sourceNullable: true,
  },
  {
    sourceKey: 'description_sr',
    targetKey: 'description_ru',
    label: 'sponsor description in Russian',
    preserveHtml: true,
    sourceNullable: true,
  },
];
