import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID, effect } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { TranslationService } from '../../i18n/translation.service';
import { LanguageCode, TranslationKey } from '../../i18n/translations';
import { LocalizedText } from '../../data/site.models';
import { socialLinks } from '../../data/social-links.data';

type RobotsDirective = 'index, follow' | 'noindex, follow' | 'noindex, nofollow';

export interface SeoConfig {
  title: LocalizedText | string;
  description: LocalizedText | string;
  titleKey?: TranslationKey;
  descriptionKey?: TranslationKey;
  path: string;
  image?: string | null;
  imageAlt?: LocalizedText | string;
  type?: 'website' | 'article';
  robots?: RobotsDirective;
  schema?: Array<Record<string, unknown>>;
  publishedAt?: string;
  modifiedAt?: string;
  author?: string;
}

const themeColor = '#d50012';
const supportedLanguages: LanguageCode[] = ['sr', 'en', 'ru'];

@Injectable({ providedIn: 'root' })
export class SeoService {
  private currentConfig?: SeoConfig;

  constructor(
    @Inject(DOCUMENT) private readonly document: Document,
    @Inject(PLATFORM_ID) private readonly platformId: object,
    private readonly title: Title,
    private readonly meta: Meta,
    private readonly i18n: TranslationService
  ) {
    effect(() => {
      this.i18n.currentLanguage();
      if (this.currentConfig) {
        this.apply(this.currentConfig);
      }
    });
  }

  set(config: SeoConfig): void {
    this.currentConfig = config;
    this.apply(config);
  }

  organizationSchema(): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@type': 'SportsOrganization',
      name: environment.defaultSiteName,
      alternateName: 'KMF Crvena Zvezda',
      url: this.absoluteUrl('/'),
      logo: this.absoluteUrl('/images/logo-kmf-crvena-zvezda.png'),
      image: this.absoluteUrl(environment.defaultOgImage),
      sport: 'Futsal',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'RS',
        addressLocality: 'Beograd'
      },
      sameAs: socialLinks.map((link) => link.url).filter(Boolean)
    };
  }

  websiteSchema(): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: environment.defaultSiteName,
      url: this.absoluteUrl('/'),
      inLanguage: ['sr-Cyrl', 'en', 'ru'],
      publisher: {
        '@type': 'SportsOrganization',
        name: environment.defaultSiteName,
        logo: this.absoluteUrl('/images/logo-kmf-crvena-zvezda.png')
      }
    };
  }

  breadcrumbSchema(items: Array<{ name: string; path: string }>): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: this.absoluteUrl(item.path)
      }))
    };
  }

  newsArticleSchema(config: SeoConfig): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: this.configTitle(config),
      description: this.configDescription(config),
      image: [this.absoluteImageUrl(config.image)],
      datePublished: config.publishedAt,
      dateModified: config.modifiedAt || config.publishedAt,
      author: {
        '@type': 'Organization',
        name: config.author || environment.defaultSiteName
      },
      publisher: {
        '@type': 'Organization',
        name: environment.defaultSiteName,
        logo: {
          '@type': 'ImageObject',
          url: this.absoluteUrl('/images/logo-kmf-crvena-zvezda.png')
        }
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': this.absoluteUrl(config.path)
      }
    };
  }

  absoluteUrl(path = '/'): string {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    const base = environment.publicSiteUrl.replace(/\/$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${normalizedPath}`;
  }

  private apply(config: SeoConfig): void {
    const title = this.configTitle(config);
    const description = this.configDescription(config);
    const canonical = this.absoluteUrl(this.cleanPath(config.path));
    const image = this.absoluteImageUrl(config.image);
    const imageAlt = config.imageAlt ? this.text(config.imageAlt) : title;
    const locale = this.locale(this.i18n.currentLanguage());

    this.title.setTitle(title);
    this.upsertMeta('name', 'description', description);
    this.upsertMeta('name', 'robots', config.robots || 'index, follow');
    this.upsertMeta('name', 'theme-color', themeColor);
    this.upsertMeta('property', 'og:title', title);
    this.upsertMeta('property', 'og:description', description);
    this.upsertMeta('property', 'og:image', image);
    this.upsertMeta('property', 'og:image:secure_url', image.startsWith('https://') ? image : '');
    this.upsertMeta('property', 'og:image:alt', imageAlt);
    this.upsertMeta('property', 'og:url', canonical);
    this.upsertMeta('property', 'og:type', config.type || 'website');
    this.upsertMeta('property', 'og:site_name', environment.defaultSiteName);
    this.upsertMeta('property', 'og:locale', locale);
    this.upsertMeta('name', 'twitter:card', 'summary_large_image');
    this.upsertMeta('name', 'twitter:title', title);
    this.upsertMeta('name', 'twitter:description', description);
    this.upsertMeta('name', 'twitter:image', image);
    this.upsertMeta('name', 'twitter:image:alt', imageAlt);

    if (config.type === 'article') {
      this.upsertMeta('property', 'article:published_time', config.publishedAt || '');
      this.upsertMeta('property', 'article:modified_time', config.modifiedAt || config.publishedAt || '');
    } else {
      this.upsertMeta('property', 'article:published_time', '');
      this.upsertMeta('property', 'article:modified_time', '');
    }

    this.setCanonical(canonical);
    this.setHreflang(config.path);
    this.setStructuredData(config.schema || []);
  }

  private text(value: LocalizedText | string): string {
    const template = this.document.createElement('template');
    template.innerHTML = this.i18n.text(value);
    template.content
      .querySelectorAll('script, style, template, iframe, object, embed, svg, math')
      .forEach((node) => node.remove());
    return (template.content.textContent || '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private absoluteImageUrl(value?: string | null): string {
    const base = environment.publicSiteUrl.replace(/\/$/, '');
    const fallback = new URL(environment.defaultOgImage, `${base}/`).href;
    const candidate = value?.trim();

    if (!candidate) {
      return fallback;
    }

    try {
      const url = candidate.startsWith('/') && !candidate.startsWith('//')
        ? new URL(candidate, `${base}/`)
        : new URL(candidate);
      const allowedProtocol = environment.production ? url.protocol === 'https:' : /^https?:$/.test(url.protocol);
      return allowedProtocol && url.hostname ? url.href : fallback;
    } catch {
      return fallback;
    }
  }

  private configTitle(config: SeoConfig): string {
    return config.titleKey ? this.i18n.t(config.titleKey) : this.text(config.title);
  }

  private configDescription(config: SeoConfig): string {
    return config.descriptionKey ? this.i18n.t(config.descriptionKey) : this.text(config.description);
  }

  private cleanPath(path: string): string {
    return path.split('?')[0].replace(/\/$/, '') || '/';
  }

  private locale(language: LanguageCode): string {
    return language === 'sr' ? 'sr_RS' : language === 'ru' ? 'ru_RU' : 'en_US';
  }

  private upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
    const selector = `${attr}="${key}"`;
    if (!content) {
      this.meta.removeTag(selector);
      return;
    }
    this.meta.updateTag({ [attr]: key, content }, selector);
  }

  private setCanonical(url: string): void {
    this.setLink('canonical', url);
  }

  private setHreflang(path: string): void {
    for (const language of supportedLanguages) {
      this.setLink('alternate', this.absoluteUrl(this.cleanPath(path)), language);
    }
    this.setLink('alternate', this.absoluteUrl(this.cleanPath(path)), 'x-default');
  }

  private setLink(rel: string, href: string, hreflang?: string): void {
    const selector = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]`;
    const existing = this.document.head.querySelector<HTMLLinkElement>(selector);
    const link = existing || this.document.createElement('link');
    link.setAttribute('rel', rel);
    link.setAttribute('href', href);
    if (hreflang) {
      link.setAttribute('hreflang', hreflang);
    }
    if (!existing) {
      this.document.head.appendChild(link);
    }
  }

  private setStructuredData(schema: Array<Record<string, unknown>>): void {
    if (!isPlatformBrowser(this.platformId) && !this.document.head) {
      return;
    }

    this.document.head.querySelectorAll('script[data-seo-jsonld="true"]').forEach((node) => node.remove());
    for (const item of schema) {
      const script = this.document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo-jsonld', 'true');
      script.textContent = JSON.stringify(item);
      this.document.head.appendChild(script);
    }
  }
}
