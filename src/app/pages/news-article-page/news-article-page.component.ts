import { Component, DestroyRef, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';
import { PublicNewsService } from '../../core/api/public-news.service';
import { SeoService } from '../../core/seo/seo.service';
import { LocalizedText, NewsItem } from '../../data/site.models';
import { TranslationService } from '../../i18n/translation.service';
import { ImageFallbackDirective } from '../../shared/image-fallback.directive';
import { NewsCardComponent } from '../../shared/news-card/news-card.component';

@Component({
  selector: 'app-news-article-page',
  standalone: true,
  imports: [RouterLink, NewsCardComponent, ImageFallbackDirective],
  templateUrl: './news-article-page.component.html'
})
export class NewsArticlePageComponent implements OnInit {
  readonly defaultNewsImage = '/images/match-trophy-team.jpg';
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly notFound = signal(false);
  article?: NewsItem;
  relatedNews: NewsItem[] = [];

  constructor(
    private readonly route: ActivatedRoute,
    readonly i18n: TranslationService,
    private readonly seo: SeoService,
    private readonly publicNews: PublicNewsService,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap((params) => {
        const slug = params.get('slug') ?? '';
        this.loading.set(true);
        this.error.set(false);
        this.notFound.set(false);
        this.article = undefined;
        this.relatedNews = [];

        return this.publicNews.article(slug).pipe(
          switchMap((article) => this.publicNews.list(1, 4).pipe(
            catchError(() => of({ items: [], total: 0 })),
            switchMap((state) => of({ article, related: this.resolveRelatedNews(article, state.items) }))
          )),
          catchError(() => {
            this.error.set(true);
            return of({ article: undefined, related: [] });
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(({ article, related }) => {
      this.loading.set(false);
      this.article = article;
      this.relatedNews = related;

      if (article) {
        this.setArticleSeo(article);
      } else {
        this.notFound.set(true);
        this.setNotFoundSeo();
      }
    });
  }

  private resolveRelatedNews(article: NewsItem, items: NewsItem[]): NewsItem[] {
    return items.filter((item) => item.slug !== article.slug).slice(0, 3);
  }

  articleImage(article: NewsItem): string {
    return article.image || this.defaultNewsImage;
  }

  private setArticleSeo(article: NewsItem): void {
    const path = `/vesti/${article.slug}`;
    const seoTitle = this.articleSeoTitle(article.title);
    const description = this.articleDescription(article);
    const config = {
      title: seoTitle,
      description,
      descriptionMaxLength: 160,
      path,
      image: this.articleImage(article),
      imageAlt: this.i18n.text(article.title),
      type: 'article' as const,
      publishedAt: article.publishedAt,
      modifiedAt: article.updatedAt || article.publishedAt,
      schema: [
        this.seo.organizationSchema(),
        this.seo.breadcrumbSchema([
          { name: this.i18n.t('nav.home'), path: '/' },
          { name: this.i18n.t('nav.news'), path: '/vesti' },
          { name: this.i18n.text(article.title), path }
        ])
      ]
    };

    this.seo.set({
      ...config,
      schema: [
        ...(config.schema || []),
        this.seo.newsArticleSchema({ ...config, title: article.title })
      ]
    });
  }

  private articleDescription(article: NewsItem): LocalizedText | string {
    if (typeof article.excerpt === 'string') {
      return this.hasText(article.excerpt)
        ? article.excerpt
        : article.fullContent.map((paragraph) => this.i18n.text(paragraph)).join(' ');
    }

    const content = (language: keyof LocalizedText) => article.fullContent
      .map((paragraph) => paragraph[language] || paragraph.sr)
      .join(' ');

    return {
      sr: this.hasText(article.excerpt.sr) ? article.excerpt.sr : content('sr'),
      en: this.hasText(article.excerpt.en) ? article.excerpt.en : content('en'),
      ru: this.hasText(article.excerpt.ru) ? article.excerpt.ru : content('ru')
    };
  }

  private articleSeoTitle(title: LocalizedText | string): LocalizedText | string {
    const withBrand = (value: string) => {
      const branded = `${value} | KMF Crvena zvezda`;
      return branded.length <= 65 ? branded : value;
    };

    if (typeof title === 'string') {
      return withBrand(title);
    }

    return {
      sr: withBrand(title.sr),
      en: title.en ? withBrand(title.en) : withBrand(title.sr),
      ru: title.ru ? withBrand(title.ru) : withBrand(title.sr)
    };
  }

  private hasText(value?: string): boolean {
    return Boolean(value?.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').trim());
  }

  private setNotFoundSeo(): void {
    this.seo.set({
      title: this.i18n.t('seo.articleNotFound.title'),
      description: this.i18n.t('seo.articleNotFound.description'),
      titleKey: 'seo.articleNotFound.title',
      descriptionKey: 'seo.articleNotFound.description',
      path: '/404',
      robots: 'noindex, follow',
      schema: [this.seo.organizationSchema()]
    });
  }

}
