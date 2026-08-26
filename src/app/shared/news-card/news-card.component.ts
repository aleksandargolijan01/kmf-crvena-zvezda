import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NewsItem } from '../../data/site.models';
import { TranslationService } from '../../i18n/translation.service';
import { ImageFallbackDirective } from '../image-fallback.directive';

@Component({
  selector: 'app-news-card',
  standalone: true,
  imports: [RouterLink, ImageFallbackDirective],
  template: `
    <article class="news-card premium-dark-card">
      <a class="news-card-media" [routerLink]="['/vesti', item.slug]" [attr.aria-label]="i18n.t('common.readMore') + ': ' + i18n.text(item.title)">
        <img appImageFallback [src]="item.image" [alt]="i18n.text(item.title)" width="640" height="420" loading="lazy" decoding="async" />
      </a>

      <div class="news-card-body">
        <div class="news-meta">
          <span>{{ i18n.text(item.category) }}</span>
          <time>{{ item.date }}</time>
        </div>

        <h3>
          <a [routerLink]="['/vesti', item.slug]">{{ i18n.text(item.title) }}</a>
        </h3>
        <p>{{ i18n.text(item.excerpt) }}</p>

        <a class="read-more-link" [routerLink]="['/vesti', item.slug]" [attr.aria-label]="i18n.t('common.readMore') + ': ' + i18n.text(item.title)">
          {{ i18n.t('common.readMore') }}
        </a>
      </div>
    </article>
  `
})
export class NewsCardComponent {
  readonly i18n = inject(TranslationService);
  @Input({ required: true }) item!: NewsItem;
}
