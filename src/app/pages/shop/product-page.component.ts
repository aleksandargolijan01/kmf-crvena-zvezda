import { AsyncPipe, isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, ElementRef, PLATFORM_ID, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of, switchMap, tap, Subject, merge } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { PublicShopApiService } from '../../core/api/public-shop-api.service';
import { CartService } from '../../core/shop/cart.service';
import { CatalogProduct, formatShopPrice } from '../../core/shop/public-shop.models';
import { SeoService } from '../../core/seo/seo.service';
import { ImageFallbackDirective } from '../../shared/image-fallback.directive';
import { QuantitySelectorComponent } from '../../shared/shop/quantity-selector.component';
import { ToastService } from '../../admin/shared/toast.service';
import { productSeo } from '../../core/shop/shop-seo';
import { environment } from '../../../environments/environment';

@Component({
  standalone: true, imports: [RouterLink, ImageFallbackDirective, QuantitySelectorComponent, AsyncPipe],
  templateUrl: './product-page.component.html', styleUrl: './shop.scss'
})
export class ProductPageComponent {
  private readonly api = inject(PublicShopApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly seo = inject(SeoService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private initialRequest = true;
  readonly retryRequest = new Subject<void>();
  readonly cart = inject(CartService);
  readonly toasts = inject(ToastService);
  readonly product = signal<CatalogProduct | null>(null);
  readonly loading = signal(true);
  readonly missing = signal(false);
  readonly error = signal(false);
  readonly selectedVariant = signal('');
  readonly quantity = signal(1);
  readonly validation = signal('');
  readonly activeImage = signal(0);
  readonly gallery = viewChild<ElementRef<HTMLElement>>('gallery');
  readonly money = formatShopPrice;
  readonly images = computed(() => {
    const product = this.product();
    if (!product) return [];
    const images = [
      ...(product.coverImage ? [{ url: product.coverImage.url, alt: product.name.sr }] : []),
      ...product.gallery.map((image) => ({ url: image.url, alt: image.alt.sr || product.name.sr }))
    ];
    return images.length ? images.filter((image, index) => images.findIndex((entry) => entry.url === image.url) === index) : [{ url: '/images/logo-kmf-crvena-zvezda.png', alt: product.name.sr }];
  });
  constructor() {
    this.seo.set({ title: 'Производ | КМФ Црвена звезда', description: 'Званична колекција КМФ Црвена звезда.', path: `/prodavnica/${this.route.snapshot.paramMap.get('slug')}`, robots: 'noindex, nofollow', schema: [] });
      merge(this.route.paramMap, this.retryRequest).pipe(
        tap(() => { this.loading.set(true); this.product.set(null); this.error.set(false); this.missing.set(false); this.selectedVariant.set(''); this.quantity.set(1); this.validation.set(''); this.activeImage.set(0); }),
        switchMap(() => { const prerender = this.initialRequest; this.initialRequest = false; return this.api.product(this.route.snapshot.paramMap.get('slug') ?? '', prerender).pipe(catchError((error: HttpErrorResponse) => { if (!this.browser) throw new Error('Product prerender failed: public product unavailable.'); this.missing.set(error.status === 404); this.error.set(error.status !== 404); return of(null); })); }),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe((product) => {
        this.product.set(product); this.loading.set(false);
        this.seo.set(product ? productSeo(product, environment.publicSiteUrl) : { title: 'Производ није доступан | КМФ Црвена звезда', description: 'Погледајте званичну колекцију КМФ Црвена звезда.', path: `/prodavnica/${this.route.snapshot.paramMap.get('slug')}`, robots: 'noindex, nofollow', schema: [] });
      });
    afterNextRender(() => { if (!this.loading()) this.retryRequest.next(); });
  }
  selectImage(index: number) {
    const el = this.gallery()?.nativeElement;
    el?.scrollTo({ left: index * el.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    this.activeImage.set(index);
  }
  galleryScrolled() { const el = this.gallery()?.nativeElement; if (el?.clientWidth) this.activeImage.set(Math.round(el.scrollLeft / el.clientWidth)); }
  add() {
    const product = this.product();
    if (!product) return;
    const error = this.cart.add(product, this.selectedVariant(), this.quantity());
    this.validation.set(error ?? '');
    if (!error) this.toasts.success('Производ је додат у корпу.');
  }
}
