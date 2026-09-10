import { TranslationKey } from '../../i18n/translations';
import { TranslationService } from '../../i18n/translation.service';
import { AsyncPipe, isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, ElementRef, PLATFORM_ID, afterNextRender, computed, effect, inject, signal, viewChild } from '@angular/core';
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
  readonly i18n = inject(TranslationService);
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
  readonly validation = signal<TranslationKey | ''>('');
  readonly activeImage = signal(0);
  readonly gallery = viewChild<ElementRef<HTMLElement>>('gallery');
  readonly money = formatShopPrice;
  readonly images = computed(() => {
    const product = this.product();
    if (!product) return [];
    const images = [
      ...(product.coverImage ? [{ url: product.coverImage.url, alt: this.i18n.text(product.name) }] : []),
      ...product.gallery.map((image) => ({ url: image.url, alt: this.i18n.text(image.alt) || this.i18n.text(product.name) }))
    ];
    return images.length ? images.filter((image, index) => images.findIndex((entry) => entry.url === image.url) === index) : [{ url: '/images/logo-kmf-crvena-zvezda.png', alt: this.i18n.text(product.name) }];
  });
  constructor() {
    effect(() => this.updateSeo());
      merge(this.route.paramMap, this.retryRequest).pipe(
        tap(() => { this.loading.set(true); this.product.set(null); this.error.set(false); this.missing.set(false); this.selectedVariant.set(''); this.quantity.set(1); this.validation.set(''); this.activeImage.set(0); }),
        switchMap(() => { const prerender = this.initialRequest; this.initialRequest = false; return this.api.product(this.route.snapshot.paramMap.get('slug') ?? '', prerender).pipe(catchError((error: HttpErrorResponse) => { if (!this.browser) throw new Error('Product prerender failed: public product unavailable.'); this.missing.set(error.status === 404); this.error.set(error.status !== 404); return of(null); })); }),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe((product) => {
        this.product.set(product); this.loading.set(false);
        this.updateSeo();
      });
    afterNextRender(() => { if (!this.loading()) this.retryRequest.next(); });
  }
  private updateSeo() {
    const product = this.product();
    this.seo.set(product ? productSeo(product, environment.publicSiteUrl, this.i18n.currentLanguage()) : {
      title: '', description: '', titleKey: this.loading() ? 'shop.productTitle' : 'shop.productUnavailableTitle', descriptionKey: 'shop.browseCollection',
      path: `/prodavnica/${this.route.snapshot.paramMap.get('slug')}`, robots: 'noindex, nofollow', schema: []
    });
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
    if (!error) this.toasts.success('shop.addedToCart');
  }
}
