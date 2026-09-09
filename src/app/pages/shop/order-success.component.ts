import { Component, afterNextRender, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CheckoutApiService } from '../../core/api/checkout-api.service';
import { CheckoutSessionService } from '../../core/shop/checkout-session.service';
import { Receipt, orderStatusLabels } from '../../core/shop/checkout.models';
import { formatShopPrice } from '../../core/shop/public-shop.models';
import { SeoService } from '../../core/seo/seo.service';
@Component({ standalone: true, imports: [RouterLink], styleUrl: './shop.scss', template: `<main lang="sr-Cyrl"><header class="section shop-hero"><h1>ПОТВРДА ПОРУЏБИНЕ</h1></header><section class="section shop-content"><div class="shop-state">
  @if (loading()) { <p role="status">Провера потврде…</p> }
  @else if (receipt(); as receipt) { <h2>ПОРУЏБИНА ЈЕ УСПЕШНО ПРИМЉЕНА</h2><p>Хвала вам на поруџбини. Клуб је примио ваше податке и поруџбину ће обрадити у најкраћем року.</p><p>Број поруџбине: <strong>{{ receipt.orderNumber }}</strong></p><p>Статус: {{ labels[receipt.status] }}</p><p>Укупно за производе: <strong>{{ money(receipt.totalMinor) }}</strong></p><p>Плаћање поузећем. Трошак доставе није укључен и обрачунава се накнадно.</p><p>Потврду шаљемо на унету имејл адресу.</p> }
  @else { <p>Потврда није доступна или је истекла. Ако сте већ послали поруџбину, проверите имејл пре новог поручивања.</p><button class="btn btn-primary" (click)="load()">ПОКУШАЈ ПОНОВО</button> }
  <a class="btn btn-primary" routerLink="/prodavnica">ПОГЛЕДАЈ ПРОДАВНИЦУ</a> <a class="btn" routerLink="/">ВРАТИ СЕ НА ПОЧЕТНУ</a></div></section></main>` })
export class OrderSuccessComponent {
  private readonly api = inject(CheckoutApiService);
  private readonly session = inject(CheckoutSessionService);
  readonly receipt = signal<Receipt | null>(null);
  readonly loading = signal(true);
  readonly labels = orderStatusLabels;
  readonly money = formatShopPrice;
  constructor() { inject(SeoService).set({ title: 'Потврда поруџбине | КМФ Црвена звезда', description: 'Потврда пријема поруџбине.', path: '/porudzbina/uspesno', robots: 'noindex, nofollow', schema: [] }); afterNextRender(() => { void this.load(); }); }
  async load() { this.loading.set(true); try { const token = this.session.receipt(); this.receipt.set(token ? await firstValueFrom(this.api.receipt(token)) : null); } catch { this.receipt.set(null); } finally { this.loading.set(false); } }
}
