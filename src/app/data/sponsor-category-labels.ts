import { LanguageCode } from '../i18n/translations';

interface CategoryLabelSource {
  slug?: string;
  name_sr: string;
  name_en?: string | null;
  name_ru?: string | null;
}

// Existing database identifiers remain unchanged. These are display labels only.
const categories = [
  { slug: 'zlatni-sponzori', aliases: ['Златни спонзор', 'Златни спонзори', 'Главни партнер'], sr: 'Главни партнер', en: 'Main partner', ru: 'Главный партнёр' },
  { slug: 'srebrni-sponzori', aliases: ['Сребрни спонзор', 'Сребрни спонзори', 'Премијум партнер'], sr: 'Премијум партнер', en: 'Premium partner', ru: 'Премиум-партнёр' },
  { slug: 'bronzani-sponzori', aliases: ['Бронзани спонзор', 'Бронзани спонзори', 'Званични партнер'], sr: 'Званични партнер', en: 'Official partner', ru: 'Официальный партнёр' },
  { slug: 'prijatelji-kluba', aliases: ['Пријатељи клуба', 'Клупски партнери'], sr: 'Клупски партнери', en: 'Club partners', ru: 'Клубные партнёры' },
];

export function isRetiredSponsorCategory(category: CategoryLabelSource): boolean {
  return category.slug === 'naslovni-sponzor' || category.name_sr === 'Насловни спонзор';
}

export function sponsorCategoryLabel(category: CategoryLabelSource, language: LanguageCode = 'sr'): string {
  if (isRetiredSponsorCategory(category)) return { sr: 'Архивска категорија', en: 'Legacy category', ru: 'Архивная категория' }[language];
  const known = categories.find(item => item.slug === category.slug || item.aliases.includes(category.name_sr));
  return known?.[language] || category[`name_${language}`] || category.name_sr;
}
