import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID, computed, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { LanguageCode, TranslationKey, translations } from './translations';
import { LocalizedText } from '../data/site.models';

const storageKey = 'kmf-czv-language';
const defaultLanguage: LanguageCode = 'sr';

@Injectable({ providedIn: 'root' })
export class TranslationService {
  readonly languages: LanguageCode[] = ['sr', 'en', 'ru'];
  readonly currentLanguage = signal<LanguageCode>(defaultLanguage);
  readonly activeLabel = computed(() => this.currentLanguage().toUpperCase());

  constructor(
    @Inject(PLATFORM_ID) private readonly platformId: object,
    @Inject(DOCUMENT) private readonly document: Document,
    private readonly title: Title,
    private readonly meta: Meta
  ) {
    const savedLanguage = this.readSavedLanguage();
    this.setLanguage(savedLanguage, false);
  }

  setLanguage(language: LanguageCode, persist = true): void {
    this.currentLanguage.set(language);
    this.document.documentElement.lang = language === 'sr' ? 'sr-Cyrl' : language;

    if (persist && isPlatformBrowser(this.platformId)) {
      localStorage.setItem(storageKey, language);
    }
  }

  t(key: TranslationKey): string {
    const language = this.currentLanguage();
    return translations[language][key] ?? translations.sr[key] ?? key;
  }

  text(value: LocalizedText | string): string {
    if (typeof value === 'string') {
      return value;
    }

    const language = this.currentLanguage();
    return value[language] || value.sr;
  }

  updateMeta(titleKey: TranslationKey, descriptionKey: TranslationKey): void {
    this.title.setTitle(this.t(titleKey));
    this.meta.updateTag({ name: 'description', content: this.t(descriptionKey) });
  }

  updateArticleMeta(title: LocalizedText | string, description: LocalizedText | string): void {
    this.title.setTitle(`${this.text(title)} | ${this.t('brand.name')}`);
    this.meta.updateTag({ name: 'description', content: this.text(description) });
  }

  private readSavedLanguage(): LanguageCode {
    if (!isPlatformBrowser(this.platformId)) {
      return defaultLanguage;
    }

    const saved = localStorage.getItem(storageKey);
    return this.isLanguage(saved) ? saved : defaultLanguage;
  }

  private isLanguage(value: string | null): value is LanguageCode {
    return value === 'sr' || value === 'en' || value === 'ru';
  }
}
