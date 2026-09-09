import { Component, DestroyRef, PLATFORM_ID, afterNextRender, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PublicShopApiService } from '../../core/api/public-shop-api.service';
import { CatalogProduct } from '../../core/shop/public-shop.models';
import { SeoService } from '../../core/seo/seo.service';
import { ProductCardComponent } from '../../shared/shop/product-card.component';
import { SHOP_TITLE, SHOP_DESCRIPTION } from '../../core/shop/shop-seo';

@Component({
  standalone: true, imports: [ProductCardComponent], styleUrl: './shop.scss',
  template: `<main lang="sr-Cyrl">
    <header class="section shop-hero"><p class="eyebrow">ЗВАНИЧНА КОЛЕКЦИЈА</p><h1>ПРОДАВНИЦА КМФ ЦРВЕНА ЗВЕЗДА</h1><p>Званична одећа и клупска опрема КМФ Црвена звезда.</p></header>
    <section class="section shop-content" aria-label="Званична понуда">
      <h2 class="shop-visually-hidden">Производи</h2>
      <aside class="shop-benefit"><div><span>СЕЗОНСКА КАРТА</span><strong>20% ПОПУСТА</strong></div><p>Власници важећих сезонских карата остварују 20% попуста на целу понуду.</p></aside>
      @if (loading()) { <p class="shop-state" role="status">Учитавање производа…</p> }
      @else if (error()) { <div class="shop-state" role="alert"><p>Производи тренутно нису доступни. Покушајте поново.</p><button class="btn btn-primary" (click)="load()">ПОКУШАЈ ПОНОВО</button></div> }
      @else if (!products().length) { <div class="shop-state"><h2>КОЛЕКЦИЈА УСКОРО СТИЖЕ</h2><p>Тренутно нема производа у понуди.</p></div> }
      @else { <div class="shop-grid">@for (product of products(); track product.id) { <app-product-card [product]="product" /> }</div> }
    </section>
  </main>`
})
export class CatalogPageComponent {
  private readonly api = inject(PublicShopApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly products = signal<CatalogProduct[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  constructor() {
    inject(SeoService).set({ title: SHOP_TITLE, description: SHOP_DESCRIPTION, path: '/prodavnica', robots: 'index, follow', schema: [] });
    this.load(true);
    afterNextRender(() => { if (!this.loading()) this.load(); });
  }
  load(prerender = false) {
    this.loading.set(true); this.error.set(false);
    this.api.catalog(prerender).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (products) => { this.products.set(products); this.loading.set(false); }, error: () => { if (!this.browser) throw new Error('Shop catalog prerender failed: public API unavailable.'); this.error.set(true); this.loading.set(false); } });
  }
}
