import { TranslationService } from '../../i18n/translation.service';
import { Component, afterNextRender, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CheckoutApiService } from '../../core/api/checkout-api.service';
import { CheckoutSessionService } from '../../core/shop/checkout-session.service';
import { Receipt, orderStatusKeys } from '../../core/shop/checkout.models';
import { formatShopPrice } from '../../core/shop/public-shop.models';
import { SeoService } from '../../core/seo/seo.service';
@Component({ standalone: true, imports: [RouterLink], styleUrl: './shop.scss', template: `<main><header class="section shop-hero"><h1>{{ i18n.t('shop.confirmation') }}</h1></header><section class="section shop-content"><div class="shop-state">
  @if (loading()) { <p role="status">{{ i18n.t('shop.checkingReceipt') }}</p> }
  @else if (receipt(); as receipt) { <h2>{{ i18n.t('shop.orderReceived') }}</h2><p>{{ i18n.t('shop.orderThanks') }}</p><p>{{ i18n.t('shop.orderNumber') }} <strong>{{ receipt.orderNumber }}</strong></p><p>{{ i18n.t('shop.status') }} {{ i18n.t(labels[receipt.status]) }}</p><p>{{ i18n.t('shop.productTotalLabel') }} <strong>{{ money(receipt.totalMinor) }}</strong></p><p>{{ i18n.t('shop.receiptPayment') }}</p><p>{{ i18n.t('shop.confirmationEmail') }}</p> }
  @else { <p>{{ i18n.t('shop.receiptUnavailable') }}</p><button class="btn btn-primary" (click)="load()">{{ i18n.t('shop.retry') }}</button> }
  <a class="btn btn-primary" routerLink="/prodavnica">{{ i18n.t('shop.viewShop') }}</a> <a class="btn" routerLink="/">{{ i18n.t('shop.backHome') }}</a></div></section></main>` })
export class OrderSuccessComponent {
  readonly i18n = inject(TranslationService);
  private readonly api = inject(CheckoutApiService);
  private readonly session = inject(CheckoutSessionService);
  readonly receipt = signal<Receipt | null>(null);
  readonly loading = signal(true);
  readonly labels = orderStatusKeys;
  readonly money = formatShopPrice;
  constructor() { inject(SeoService).set({ title: '', description: '', titleKey: 'shop.confirmationTitle', descriptionKey: 'shop.confirmationDescription', path: '/porudzbina/uspesno', robots: 'noindex, nofollow', schema: [] }); afterNextRender(() => { void this.load(); }); }
  async load() { this.loading.set(true); try { const token = this.session.receipt(); this.receipt.set(token ? await firstValueFrom(this.api.receipt(token)) : null); } catch { this.receipt.set(null); } finally { this.loading.set(false); } }
}
