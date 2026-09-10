import { TranslationService } from '../../i18n/translation.service';
import { Component, DestroyRef, PLATFORM_ID, afterNextRender, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PublicShopApiService } from '../../core/api/public-shop-api.service';
import { CatalogProduct } from '../../core/shop/public-shop.models';
import { SeoService } from '../../core/seo/seo.service';
import { ProductCardComponent } from '../../shared/shop/product-card.component';

@Component({
  standalone: true, imports: [ProductCardComponent], styleUrl: './shop.scss',
  template: `<main>
    <header class="section shop-hero"><p class="eyebrow">{{ i18n.t('shop.officialCollection') }}</p><h1>{{ i18n.t('shop.catalogHeading') }}</h1><p>{{ i18n.t('shop.catalogDescription') }}</p></header>
    <section class="section shop-content" [attr.aria-label]="i18n.t('shop.catalogAria')">
      <h2 class="shop-visually-hidden">{{ i18n.t('shop.products') }}</h2>
      <aside class="shop-benefit"><div><span>{{ i18n.t('shop.seasonTicket') }}</span><strong>{{ i18n.t('shop.discount20') }}</strong></div><p>{{ i18n.t('shop.validTicketBenefit') }}</p></aside>
      @if (loading()) { <p class="shop-state" role="status">{{ i18n.t('shop.loadingProducts') }}</p> }
      @else if (error()) { <div class="shop-state" role="alert"><p>{{ i18n.t('shop.productsUnavailable') }}</p><button class="btn btn-primary" (click)="load()">{{ i18n.t('shop.retry') }}</button></div> }
      @else if (!products().length) { <div class="shop-state"><h2>{{ i18n.t('shop.comingSoon') }}</h2><p>{{ i18n.t('shop.noProducts') }}</p></div> }
      @else { <div class="shop-grid">@for (product of products(); track product.id) { <app-product-card [product]="product" /> }</div> }
    </section>
  </main>`
})
export class CatalogPageComponent {
  readonly i18n = inject(TranslationService);
  private readonly api = inject(PublicShopApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly products = signal<CatalogProduct[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  constructor() {
    inject(SeoService).set({ title: '', description: '', titleKey: 'shop.seoTitle', descriptionKey: 'shop.seoDescription', path: '/prodavnica', robots: 'index, follow', schema: [] });
    this.load(true);
    afterNextRender(() => { if (!this.loading()) this.load(); });
  }
  load(prerender = false) {
    this.loading.set(true); this.error.set(false);
    this.api.catalog(prerender).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (products) => { this.products.set(products); this.loading.set(false); }, error: () => { if (!this.browser) throw new Error('Shop catalog prerender failed: public API unavailable.'); this.error.set(true); this.loading.set(false); } });
  }
}
