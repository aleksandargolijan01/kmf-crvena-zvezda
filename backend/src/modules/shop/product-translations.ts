import { TranslationField, TranslationService } from '../translation/translation.service';

export const productTextFields = ['nameSr', 'nameEn', 'nameRu', 'descriptionSr', 'descriptionEn', 'descriptionRu'] as const;
type ProductText = Partial<Record<typeof productTextFields[number], unknown>>;
const hasText = (value: unknown): value is string => typeof value === 'string' && !!value.trim();

// Adapt the existing camelCase Product schema to the shared CMS translator's keys.
export async function translateProduct(
  translator: TranslationService, incoming: ProductText, existing?: ProductText,
  regenerate?: 'missing' | 'all',
) {
  const source: Record<string, unknown> = {};
  const fields: TranslationField[] = [];
  const keys: Record<string, string> = {};
  for (const base of ['name', 'description'] as const) {
    const sr = `${base}Sr` as const;
    source[`${base}_sr`] = incoming[sr] ?? existing?.[sr];
    const changed = incoming[sr] !== undefined && incoming[sr] !== existing?.[sr];
    for (const lang of ['en', 'ru'] as const) {
      const key = `${base}${lang === 'en' ? 'En' : 'Ru'}` as const;
      const old = existing?.[key];
      const manual = hasText(incoming[key]);
      const copied = hasText(old) && old.trim() === String(existing?.[sr] ?? '').trim();
      const eligible = regenerate ? regenerate === 'all' || !hasText(old) || copied
        : !manual && (changed || !hasText(old));
      if (!eligible) continue;
      const targetKey = `${base}_${lang}`;
      keys[targetKey] = key;
      fields.push({ sourceKey: `${base}_sr`, targetKey, label: `shop product ${base}`, maxLength: base === 'name' ? 180 : 20000, preserveHtml: base === 'description' });
    }
  }
  const result = await translator.translateMissingFieldsWithResult({ entityName: 'shop product', source, fields, targets: ['en', 'ru'] });
  return { translations: Object.fromEntries(Object.entries(result.translations).filter(([key]) => keys[key]).map(([key, value]) => [keys[key], value])), errors: result.errors };
}
