import { Component, DestroyRef, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SeoService } from '../../core/seo/seo.service';
import { TranslationService } from '../../i18n/translation.service';
import { NewsCardComponent } from '../../shared/news-card/news-card.component';
import { PublicNewsResult, PublicNewsService } from '../../core/api/public-news.service';

@Component({
  selector: 'app-news-page',
  standalone: true,
  imports: [NewsCardComponent],
  templateUrl: './news-page.component.html'
})
export class NewsPageComponent implements OnInit {
  readonly newsState = signal<PublicNewsResult>({ loading: true, error: false, items: [], total: 0 });

  constructor(
    readonly i18n: TranslationService,
    private readonly seo: SeoService,
    private readonly publicNews: PublicNewsService,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.seo.set({
      title: this.i18n.t('seo.news.title'),
      description: this.i18n.t('seo.news.description'),
      titleKey: 'seo.news.title',
      descriptionKey: 'seo.news.description',
      path: '/vesti',
      image: '/images/match-trophy-team.jpg',
      schema: [
        this.seo.organizationSchema(),
        this.seo.breadcrumbSchema([
          { name: this.i18n.t('nav.home'), path: '/' },
          { name: this.i18n.t('nav.news'), path: '/vesti' }
        ])
      ]
    });

    this.publicNews.listState(1, 24)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => this.newsState.set(state));
  }
}
