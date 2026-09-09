import { Component, DestroyRef, afterNextRender, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../core/shop/cart.service';
import { formatShopPrice } from '../../core/shop/public-shop.models';
import { SeoService } from '../../core/seo/seo.service';
import { ImageFallbackDirective } from '../../shared/image-fallback.directive';
import { QuantitySelectorComponent } from '../../shared/shop/quantity-selector.component';

@Component({
  standalone: true, imports: [RouterLink, ImageFallbackDirective, QuantitySelectorComponent], templateUrl: './cart-page.component.html', styleUrl: './shop.scss'
})
export class CartPageComponent {
  readonly cart = inject(CartService);
  readonly money = formatShopPrice;
  private readonly destroyRef = inject(DestroyRef);
  constructor() {
    inject(SeoService).set({ title: 'Корпа | КМФ Црвена звезда', description: 'Ваша корпа званичне клупске продавнице.', path: '/korpa', robots: 'noindex, nofollow', schema: [] });
    afterNextRender(() => {
      void this.cart.refresh();
      const refresh = () => { if (!document.hidden) void this.cart.refresh(); };
      window.addEventListener('focus', refresh);
      document.addEventListener('visibilitychange', refresh);
      this.destroyRef.onDestroy(() => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); });
    });
  }
}
