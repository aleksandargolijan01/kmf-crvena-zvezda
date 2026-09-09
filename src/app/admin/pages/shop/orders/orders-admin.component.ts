import { Component, afterNextRender, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CheckoutApiService } from '../../../../core/api/checkout-api.service';
import { OrderDetail, OrderStatus, OrderSummary, checkoutError, orderSourceLabels, orderStatusLabels } from '../../../../core/shop/checkout.models';
import { formatShopPrice } from '../../../../core/shop/public-shop.models';
@Component({ standalone: true, imports: [FormsModule, RouterLink, DatePipe], templateUrl: './orders-admin.component.html', styleUrl: '../shop-operations.scss' })
export class OrdersAdminComponent {
  private readonly api = inject(CheckoutApiService);
  readonly orders = signal<OrderSummary[]>([]);
  readonly detail = signal<OrderDetail | null>(null);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly page = signal(1);
  readonly pages = signal(1);
  readonly total = signal(0);
  search = inject(ActivatedRoute).snapshot.queryParamMap.get('search') ?? '';
  status = '';
  readonly labels = orderStatusLabels;
  readonly sources = orderSourceLabels;
  readonly statuses = Object.keys(orderStatusLabels) as OrderStatus[];
  readonly emailLabels = { PENDING: 'Чека слање', PROCESSING: 'Слање у току', SENT: 'Послата', FAILED: 'Слање није успело' };
  readonly money = formatShopPrice;
  constructor() { afterNextRender(() => { void this.load(); }); }
  async load(page = 1) {
    if (this.busy()) return;
    this.busy.set(true); this.error.set('');
    try { const result = await firstValueFrom(this.api.orders(page, this.search.trim(), this.status)); this.orders.set(result.data); this.pages.set(result.meta?.totalPages ?? 1); this.total.set(result.meta?.total ?? result.data.length); this.page.set(page); }
    catch (error) { this.error.set(checkoutError(error)); }
    finally { this.busy.set(false); }
  }
  async open(id: string) {
    if (this.busy()) return;
    this.busy.set(true); this.error.set(''); this.detail.set(null);
    try { this.detail.set(await firstValueFrom(this.api.order(id))); }
    catch (error) { this.error.set(checkoutError(error)); }
    finally { this.busy.set(false); }
  }
  async change(status: OrderStatus) {
    const order = this.detail(); if (!order || this.busy()) return;
    this.busy.set(true); this.error.set('');
    try { const updated = await firstValueFrom(this.api.status(order.id, status)); this.detail.set(updated); this.orders.update(rows => rows.map(row => row.id === order.id ? { ...row, status: updated.status } : row)); }
    catch (error) { this.error.set(checkoutError(error)); }
    finally { this.busy.set(false); }
  }
  async retry(id: string) {
    const order = this.detail(); if (!order || this.busy()) return;
    this.busy.set(true); this.error.set('');
    try { await firstValueFrom(this.api.retryEmail(order.id, id)); this.detail.set(await firstValueFrom(this.api.order(order.id))); }
    catch (error) { this.error.set(checkoutError(error)); }
    finally { this.busy.set(false); }
  }
}
