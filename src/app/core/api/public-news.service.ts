import { Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { LocalizedText, NewsItem } from '../../data/site.models';
import { PublicApiService } from './public-api.service';

export interface PublicNewsState {
  items: NewsItem[];
  total: number;
}

export interface PublicNewsResult {
  loading: boolean;
  error: boolean;
  items: NewsItem[];
  total: number;
}

interface PublicNewsResponse<T> {
  data: T[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface CmsNewsItem {
  id: string;
  slug: string;
  title_sr: string;
  title_en?: string | null;
  title_ru?: string | null;
  excerpt_sr?: string | null;
  excerpt_en?: string | null;
  excerpt_ru?: string | null;
  content_sr?: string | null;
  content_en?: string | null;
  content_ru?: string | null;
  coverImage?: string | null;
  publishedAt?: string | null;
  featured?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

type PublicNewsListParams = {
  featured?: boolean;
};

const defaultNewsImage = '/images/social-share-default.png';
const category: LocalizedText = { sr: 'Vesti', en: 'News', ru: 'Новости' };
const allowedContentTags = new Set(['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a']);
const blockedContentTags = new Set(['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'template']);

@Injectable({ providedIn: 'root' })
export class PublicNewsService {
  constructor(private readonly api: PublicApiService) {}

  list(page = 1, limit = 10, params?: PublicNewsListParams): Observable<PublicNewsState> {
    return this.api.news<PublicNewsResponse<CmsNewsItem>>(page, limit, params).pipe(
      map((response) => ({
        items: (response.data ?? []).map((item) => this.toNewsItem(item)),
        total: response.meta?.total ?? response.data?.length ?? 0
      }))
    );
  }

  listState(page = 1, limit = 10, params?: PublicNewsListParams): Observable<PublicNewsResult> {
    return this.list(page, limit, params).pipe(
      map((state) => ({ loading: false, error: false, items: state.items, total: state.total })),
      catchError(() => of({ loading: false, error: true, items: [], total: 0 }))
    );
  }

  article(slug: string): Observable<NewsItem> {
    return this.api.newsArticle<CmsNewsItem>(slug).pipe(map((item) => this.toNewsItem(item)));
  }

  private toNewsItem(item: CmsNewsItem): NewsItem {
    const content = this.localized(item.content_sr, item.content_en, item.content_ru);

    return {
      id: item.id,
      slug: item.slug,
      date: this.formatDate(item.publishedAt ?? item.createdAt),
      publishedAt: item.publishedAt ?? item.createdAt,
      updatedAt: item.updatedAt ?? item.publishedAt ?? item.createdAt,
      category,
      title: this.localized(item.title_sr, item.title_en, item.title_ru),
      excerpt: this.localized(item.excerpt_sr || this.excerpt(item.content_sr), item.excerpt_en || this.excerpt(item.content_en), item.excerpt_ru || this.excerpt(item.content_ru)),
      image: item.coverImage || defaultNewsImage,
      fullContent: this.paragraphs(content),
      galleryImages: [],
      featured: Boolean(item.featured)
    };
  }

  private localized(sr?: string | null, en?: string | null, ru?: string | null): LocalizedText {
    return {
      sr: sr?.trim() || '',
      en: en?.trim() || sr?.trim() || '',
      ru: ru?.trim() || sr?.trim() || ''
    };
  }

  private paragraphs(content: LocalizedText): LocalizedText[] {
    const sr = this.splitParagraphs(content.sr);
    const en = this.splitParagraphs(content.en);
    const ru = this.splitParagraphs(content.ru);
    const count = Math.max(sr.length, en.length, ru.length);

    return Array.from({ length: count }, (_, index) => ({
      sr: sr[index] ?? '',
      en: en[index] ?? sr[index] ?? '',
      ru: ru[index] ?? sr[index] ?? ''
    })).filter((paragraph) => paragraph.sr || paragraph.en || paragraph.ru);
  }

  private splitParagraphs(value?: string): string[] {
    return (value ?? '')
      .split(/\r?\n+/)
      .map((paragraph) => this.prepareContentHtml(paragraph.trim()))
      .filter(Boolean);
  }

  private prepareContentHtml(value: string): string {
    if (!globalThis.document?.createElement) {
      return value;
    }

    const template = globalThis.document.createElement('template');
    template.innerHTML = value;
    this.sanitizeContentNodes(template.content, globalThis.document);
    this.linkifyTextNodes(template.content, globalThis.document);
    return template.innerHTML;
  }

  private sanitizeContentNodes(parent: ParentNode, ownerDocument: Document): void {
    Array.from(parent.childNodes).forEach((node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
      }

      const element = node as Element;
      const tagName = element.tagName.toLowerCase();

      if (!allowedContentTags.has(tagName)) {
        if (blockedContentTags.has(tagName)) {
          element.remove();
          return;
        }

        element.replaceWith(ownerDocument.createTextNode(element.textContent ?? ''));
        return;
      }

      const href = tagName === 'a' ? element.getAttribute('href')?.trim() : null;
      Array.from(element.attributes).forEach((attribute) => element.removeAttribute(attribute.name));

      if (tagName === 'a' && href && this.isSafeHref(href)) {
        element.setAttribute('href', href);
        element.setAttribute('target', '_blank');
        element.setAttribute('rel', 'noopener noreferrer');
      }

      this.sanitizeContentNodes(element, ownerDocument);
    });
  }

  private linkifyTextNodes(parent: ParentNode, ownerDocument: Document, insideAnchor = false): void {
    Array.from(parent.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && !insideAnchor) {
        this.linkifyTextNode(node, ownerDocument);
        return;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        this.linkifyTextNodes(element, ownerDocument, insideAnchor || element.tagName.toLowerCase() === 'a');
      }
    });
  }

  private linkifyTextNode(node: ChildNode, ownerDocument: Document): void {
    const text = node.textContent ?? '';
    const pattern = /\b((?:https?:\/\/|mailto:)[^\s<>"']+)/gi;
    const fragment = ownerDocument.createDocumentFragment();
    let lastIndex = 0;
    let hasSafeLink = false;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const rawHref = match[0];
      const startIndex = match.index;
      const { href, suffix } = this.trimTrailingPunctuation(rawHref);

      fragment.append(ownerDocument.createTextNode(text.slice(lastIndex, startIndex)));

      if (this.isSafeHref(href)) {
        const anchor = ownerDocument.createElement('a');
        anchor.setAttribute('href', href);
        anchor.setAttribute('target', '_blank');
        anchor.setAttribute('rel', 'noopener noreferrer');
        anchor.textContent = href;
        fragment.append(anchor);
        fragment.append(ownerDocument.createTextNode(suffix));
        hasSafeLink = true;
      } else {
        fragment.append(ownerDocument.createTextNode(rawHref));
      }

      lastIndex = startIndex + rawHref.length;
    }

    if (!hasSafeLink) {
      return;
    }

    fragment.append(ownerDocument.createTextNode(text.slice(lastIndex)));
    node.replaceWith(fragment);
  }

  private trimTrailingPunctuation(value: string): { href: string; suffix: string } {
    const trailingMatch = value.match(/[),.;:!?]+$/);

    if (!trailingMatch) {
      return { href: value, suffix: '' };
    }

    return {
      href: value.slice(0, -trailingMatch[0].length),
      suffix: trailingMatch[0],
    };
  }

  private isSafeHref(value: string): boolean {
    const trimmed = value.trim();

    if (/[\u0000-\u001f\u007f\s]/.test(trimmed)) {
      return false;
    }

    const normalized = trimmed.toLowerCase();
    return (
      /^https?:\/\//i.test(normalized) ||
      /^mailto:[^@<>"']+@[^@<>"']+$/i.test(normalized) ||
      (trimmed.startsWith('/') && !trimmed.startsWith('//'))
    );
  }

  private excerpt(value?: string | null): string {
    const text = (value ?? '').replace(/\s+/g, ' ').trim();
    return text.length > 160 ? `${text.slice(0, 157).trim()}...` : text;
  }

  private formatDate(value?: string | null): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }
}
