import { TranslationService } from '../../i18n/translation.service';
import { inject, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ImageFallbackDirective } from '../image-fallback.directive';
import { CatalogProduct, formatShopPrice, productBadge } from '../../core/shop/public-shop.models';

@Component({
  selector: 'app-product-card', standalone: true, imports: [RouterLink, ImageFallbackDirective],
  template: `
    <article class="product-card" [class.sold-out]="product().availability === 'SOLD_OUT'">
      <a [routerLink]="['/prodavnica', product().slug]">
        <div class="product-photo">
          <img appImageFallback="/images/logo-kmf-crvena-zvezda.png" [src]="product().coverImage?.url || product().gallery[0]?.url || '/images/logo-kmf-crvena-zvezda.png'" [alt]="i18n.text(product().name)" width="640" height="800" loading="lazy" decoding="async" />
          @if (badge(); as label) { <span class="product-badge">{{ label }}</span> }
        </div>
        <div class="product-copy"><h3>{{ i18n.text(product().name) }}</h3><p>{{ money(product().priceMinor) }}</p><span class="product-link">{{ i18n.t('shop.viewProduct') }} <span aria-hidden="true">→</span></span></div>
      </a>
    </article>
  `,
  styles: [`
    :host { display: block; min-width: 0; height: 100%; }
    .product-card { height: 100%; border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; background: white; box-shadow: var(--shadow-soft); }
    a { display: flex; flex-direction: column; height: 100%; }
    a:focus-visible { outline: 3px solid var(--red); outline-offset: -3px; }
    .product-photo { position: relative; background: #f1f1f3; }
    img { width: 100%; aspect-ratio: 4/5; height: auto; object-fit: contain; transition: transform 200ms ease; }
    a:hover img { transform: scale(1.025); }
    .sold-out .product-photo { background: #e8e8ea; }
    .product-badge { position: absolute; left: 16px; top: 16px; background: var(--red); color: white; font-size: 12px; font-weight: 800; padding: 7px 12px; border-radius: var(--radius-sm); }
    .sold-out .product-badge { background: var(--black); }
    .product-copy { display: flex; flex-direction: column; flex: 1; padding: 23px; }
    h3 { font-size: 21px; line-height: 1.2; overflow-wrap: anywhere; }
    p { font-size: 20px; font-weight: 800; }
    .product-link { font-size: 12px; font-weight: 800; color: var(--red); margin-top: auto; }
    @media (prefers-reduced-motion: reduce) { img { transition: none; } a:hover img { transform: none; } }
  `]
})
export class ProductCardComponent {
  readonly i18n = inject(TranslationService);
  readonly product = input.required<CatalogProduct>();
  readonly badge = computed(() => productBadge(this.product(), this.i18n.currentLanguage()));
  readonly money = formatShopPrice;
}
