import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo/seo.service';
import { TranslationService } from '../../i18n/translation.service';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="page-hero not-found-page">
      <div>
        <p class="eyebrow">404</p>
        <h1>{{ i18n.t('common.notFoundTitle') }}</h1>
        <p>{{ i18n.t('common.notFoundText') }}</p>
        <div class="hero-actions">
          <a class="btn" routerLink="/">{{ i18n.t('nav.home') }}</a>
          <a class="btn btn-ghost" routerLink="/vesti">{{ i18n.t('nav.news') }}</a>
        </div>
      </div>
      <aside class="page-hero-card">
        <span>KMF Crvena Zvezda</span>
        <strong>404</strong>
        <small>Stranica nije dostupna</small>
      </aside>
    </main>
  `
})
export class NotFoundPageComponent implements OnInit {
  constructor(
    readonly i18n: TranslationService,
    private readonly seo: SeoService
  ) {}

  ngOnInit(): void {
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
