import { Component, DestroyRef, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { PublicShopApiService } from '../../core/api/public-shop-api.service';
import { CatalogProduct } from '../../core/shop/public-shop.models';
import { ProductCardComponent } from './product-card.component';

@Component({
  selector: 'app-shop-carousel', standalone: true, imports: [ProductCardComponent, RouterLink],
  template: `@if (products().length) {
    <section class="section shop-home" aria-labelledby="shop-home-title" lang="sr-Cyrl">
      <div class="section-heading"><p class="eyebrow">Званична колекција КМФ Црвена звезда</p><h2 id="shop-home-title">ЗВЕЗДИНА ПРОДАВНИЦА</h2></div>
      <p class="benefit">Власници сезонских карата остварују 20% попуста на целу понуду.</p>
      <div class="carousel-controls"><button type="button" aria-label="Претходни производи" [disabled]="atStart()" (click)="move(-1)">←</button><button type="button" aria-label="Следећи производи" [disabled]="atEnd()" (click)="move(1)">→</button></div>
      <div class="shop-track" #track tabindex="0" aria-label="Истакнути производи" (scroll)="measure()" (keydown.arrowright)="keyboardMove($event, 1)" (keydown.arrowleft)="keyboardMove($event, -1)">
        @for (product of products(); track product.id) { <app-product-card [product]="product" /> }
        <a routerLink="/prodavnica" class="collection-card"><span>КОМПЛЕТНА КОЛЕКЦИЈА</span><h3>Још много тога те чека.</h3><p>Погледај комплетну понуду званичне клупске одеће.</p><strong>ПОГЛЕДАЈ ПРОДАВНИЦУ →</strong></a>
      </div>
      <div class="all-products"><a class="btn btn-primary" routerLink="/prodavnica">СВИ ПРОИЗВОДИ</a></div>
    </section>
  }`,
  styles: [`
    :host { display: block; min-width: 0; } .shop-home { background: var(--paper); }
    .benefit { color: var(--muted); max-width: 680px; }
    .shop-track { display: grid; grid-auto-flow: column; grid-auto-columns: calc((100% - 48px) / 3); gap: 24px; overflow-x: auto; scroll-snap-type: x mandatory; overscroll-behavior-x: contain; padding: 8px 0 24px; scrollbar-color: var(--red) var(--line); }
    .shop-track > * { scroll-snap-align: start; min-width: 0; }
    .carousel-controls { display: flex; justify-content: end; gap: 10px; margin-bottom: 12px; }
    .carousel-controls button { width: 44px; height: 44px; border: 1px solid var(--line); background: white; border-radius: var(--radius); font-size: 22px; cursor: pointer; }
    .carousel-controls button:disabled { color: #888; cursor: not-allowed; }
    .collection-card { display: flex; flex-direction: column; justify-content: center; padding: 30px; color: white; background: linear-gradient(140deg, var(--wine), var(--red-dark)); border-radius: var(--radius); }
    .collection-card span, .collection-card strong { font-size: 12px; font-weight: 800; } .collection-card h3 { font-size: 34px; line-height: 1.05; margin-top: 28px; } .collection-card strong { margin-top: 25px; }
    .all-products { display: flex; justify-content: center; margin-top: 24px; }
    :focus-visible { outline: 3px solid var(--red); outline-offset: -3px; }
    @media (max-width: 1080px) { .shop-track { grid-auto-columns: calc((100% - 24px) / 2); } }
    @media (max-width: 720px) { .shop-track { grid-auto-columns: 100%; } .collection-card { min-height: 430px; } }
    @media (prefers-reduced-motion: reduce) { .shop-track { scroll-behavior: auto; } }
  `]
})
export class ShopCarouselComponent {
  private readonly api = inject(PublicShopApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly products = signal<CatalogProduct[]>([]);
  readonly track = viewChild<ElementRef<HTMLElement>>('track');
  readonly atStart = signal(true);
  readonly atEnd = signal(false);
  constructor() {
    afterNextRender(() => {
      this.api.featured().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (products) => { this.products.set(products); requestAnimationFrame(() => this.measure()); }, error: () => this.products.set([]) });
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
