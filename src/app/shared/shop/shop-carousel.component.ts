import { TranslationService } from '../../i18n/translation.service';
import { Component, DestroyRef, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { map, of, switchMap } from 'rxjs';
import { PublicShopApiService } from '../../core/api/public-shop-api.service';
import { CatalogProduct } from '../../core/shop/public-shop.models';
import { ProductCardComponent } from './product-card.component';

@Component({
  selector: 'app-shop-carousel', standalone: true, imports: [ProductCardComponent, RouterLink],
  template: `@if (products().length) {
    <section class="section shop-home" aria-labelledby="shop-home-title">
      <div class="section-heading"><p class="eyebrow">{{ i18n.t('shop.collectionEyebrow') }}</p><h2 id="shop-home-title">{{ i18n.t('shop.zvezdaShop') }}</h2></div>
      <p class="benefit">{{ i18n.t('shop.ticketBenefit') }}</p>
      <div class="carousel-controls"><button type="button" [attr.aria-label]="i18n.t('shop.previousProducts')" [disabled]="atStart()" (click)="move(-1)">←</button><button type="button" [attr.aria-label]="i18n.t('shop.nextProducts')" [disabled]="atEnd()" (click)="move(1)">→</button></div>
      <div class="shop-track" #track tabindex="0" [attr.aria-label]="i18n.t('shop.productsAria')" (scroll)="measure()" (keydown.arrowright)="keyboardMove($event, 1)" (keydown.arrowleft)="keyboardMove($event, -1)">
        @for (product of products(); track product.id) { <app-product-card [product]="product" /> }
        <a routerLink="/prodavnica" class="collection-card">
          <img class="collection-crest" src="/images/logo-kmf-crvena-zvezda.png" alt="" aria-hidden="true" width="256" height="256" loading="lazy" decoding="async" />
          <span class="collection-eyebrow">{{ i18n.t('shop.officialShop') }}</span>
          <div class="collection-copy">
            <h3>{{ i18n.t('shop.wearZvezda') }}<br />{{ i18n.t('shop.joinClub') }}</h3>
            <p>{{ i18n.t('shop.clubGear') }}</p>
            <span class="collection-action">{{ i18n.t('shop.viewAll') }} <span aria-hidden="true">→</span></span>
          </div>
        </a>
      </div>
      <div class="all-products"><a class="btn btn-primary" routerLink="/prodavnica">{{ i18n.t('shop.allProducts') }}</a></div>
    </section>
  }`,
  styles: [`
    :host { display: block; min-width: 0; } .shop-home { background: var(--paper); }
    .benefit { color: var(--muted); max-width: 680px; }
    .shop-track { display: grid; grid-auto-flow: column; grid-auto-columns: calc((100% - 48px) / 3); gap: 24px; overflow-x: auto; scroll-snap-type: x mandatory; overscroll-behavior-x: contain; padding: 8px 0 24px; scrollbar-width: none; }
    .shop-track::-webkit-scrollbar { display: none; width: 0; height: 0; }
    .shop-track > * { scroll-snap-align: start; min-width: 0; }
    .carousel-controls { display: flex; justify-content: end; gap: 10px; margin-bottom: 12px; }
    .carousel-controls button { width: 44px; height: 44px; border: 1px solid var(--line); background: white; border-radius: var(--radius); font-size: 22px; cursor: pointer; }
    .carousel-controls button:disabled { color: #888; cursor: not-allowed; }
    .collection-card { position: relative; isolation: isolate; overflow: hidden; display: flex; flex-direction: column; padding: 30px; color: white; border: 1px solid #ffffff24; background: linear-gradient(155deg, #650d21 0%, #270711 48%, #110c10 100%); border-radius: var(--radius); box-shadow: var(--shadow-soft); }
    .collection-card::before { content: ''; position: absolute; inset: 0; z-index: -1; pointer-events: none; background: linear-gradient(132deg, transparent 26%, #ed17372b 26.2%, #ed173710 43%, transparent 43.2%), linear-gradient(132deg, transparent 47%, #ffffff12 47.2%, transparent 47.5%); }
    .collection-crest { position: absolute; z-index: -1; top: 55px; right: -45px; width: 95%; max-width: 370px; height: auto; opacity: .14; pointer-events: none; user-select: none; transform: rotate(-12deg); transition: transform 220ms ease; }
    .collection-eyebrow { font-size: 11px; font-weight: 800; letter-spacing: .1em; line-height: 1.5; }
    .collection-eyebrow::before { content: ''; display: block; width: 38px; height: 3px; margin-bottom: 14px; background: #ef2344; }
    .collection-copy { margin-top: auto; padding-top: 150px; }
    .collection-card h3 { margin: 0; color: white; font-size: clamp(32px, 2.8vw, 42px); line-height: 1.08; letter-spacing: -.025em; overflow-wrap: anywhere; }
    .collection-card p { margin: 18px 0 26px; max-width: 25ch; color: #f1e5e9; font-size: 15px; line-height: 1.6; }
    .collection-action { display: inline-flex; align-items: center; justify-content: space-between; gap: 24px; min-height: 46px; padding: 12px 16px; border: 1px solid #ffffff6b; border-radius: var(--radius-sm); background: #ffffff0d; font-size: 12px; font-weight: 800; line-height: 1.5; }
    .collection-action > span { font-size: 20px; line-height: 1; transition: transform 220ms ease; }
    .collection-card:focus-visible { outline: 3px solid white; outline-offset: -6px; }
    @media (hover: hover) { .collection-card:hover .collection-crest { transform: rotate(-9deg) scale(1.035); } .collection-card:hover .collection-action > span { transform: translateX(4px); } }
    .all-products { display: flex; justify-content: center; margin-top: 24px; }
    :focus-visible { outline: 3px solid var(--red); outline-offset: -3px; }
    @media (max-width: 1080px) { .shop-track { grid-auto-columns: calc((100% - 24px) / 2); } }
    @media (max-width: 720px) { .shop-track { grid-auto-columns: 100%; } .collection-card { min-height: 430px; padding: 26px; } .collection-card h3 { font-size: clamp(30px, 9vw, 38px); } }
    @media (prefers-reduced-motion: reduce) { .shop-track { scroll-behavior: auto; } .collection-crest, .collection-action > span { transition: none; } .collection-card:hover .collection-crest { transform: rotate(-12deg); } .collection-card:hover .collection-action > span { transform: none; } }
  `]
})
export class ShopCarouselComponent {
  readonly i18n = inject(TranslationService);
  private readonly api = inject(PublicShopApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly products = signal<CatalogProduct[]>([]);
  readonly track = viewChild<ElementRef<HTMLElement>>('track');
  readonly atStart = signal(true);
  readonly atEnd = signal(false);
  constructor() {
    afterNextRender(() => {
      this.api.featured().pipe(
        switchMap(products => products.length ? of(products) : this.api.catalog().pipe(map(catalog => catalog.slice(0, 10)))),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({ next: (products) => { this.products.set(products); requestAnimationFrame(() => this.measure()); }, error: () => this.products.set([]) });
      const onResize = () => this.measure();
      window.addEventListener('resize', onResize);
      this.destroyRef.onDestroy(() => window.removeEventListener('resize', onResize));
    });
  }
  measure() { const el = this.track()?.nativeElement; if (el) { this.atStart.set(el.scrollLeft < 2); this.atEnd.set(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2); } }
  keyboardMove(event: Event, direction: number) { if (event.target === this.track()?.nativeElement) { event.preventDefault(); this.move(direction); } }
  move(direction: number) {
    const el = this.track()?.nativeElement;
    if (el) el.scrollBy({ left: direction * (el.firstElementChild!.getBoundingClientRect().width + 24), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
}
