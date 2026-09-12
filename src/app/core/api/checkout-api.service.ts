import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CartEntry } from '../shop/public-shop.models';
import { OrderDetail, OrderRequest, OrderStatus, OrderSummary, Quote, Receipt, SeasonTicket } from '../shop/checkout.models';
import { PageResponse } from './admin-api.models';
@Injectable({ providedIn: 'root' })
export class CheckoutApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl.replace(/\/$/, '');
  quote(items: CartEntry[], seasonTicketToken?: string) { return this.http.post<Quote>(`${this.base}/shop/cart/quote`, { items, ...(seasonTicketToken ? { seasonTicketToken } : {}) }).pipe(timeout(20000)); }
  validateTicket(cardNumber: string, fullName: string) { return this.http.post<{ valid: boolean; discountPercent: number; seasonTicketToken: string }>(`${this.base}/shop/season-ticket/validate`, { cardNumber, fullName }).pipe(timeout(20000)); }
  create(request: OrderRequest, manual = false) { return this.http.post<Receipt>(`${this.base}/${manual ? 'admin/' : ''}shop/orders`, request).pipe(timeout(30000)); }
  recover(idempotencyKey: string) { return this.http.post<Receipt & { found: boolean }>(`${this.base}/shop/orders/recover`, { idempotencyKey }).pipe(timeout(20000)); }
  receipt(receiptToken: string) { return this.http.post<Receipt>(`${this.base}/shop/orders/receipt`, { receiptToken }).pipe(timeout(20000)); }
  orders(page: number, search: string, status: string) { return this.http.get<PageResponse<OrderSummary>>(`${this.base}/admin/shop/orders`, { params: { page, limit: 20, ...(search ? { search } : {}), ...(status ? { status } : {}) }, transferCache: false }); }
  order(id: string) { return this.http.get<OrderDetail>(`${this.base}/admin/shop/orders/${id}`, { transferCache: false }); }
  status(id: string, status: OrderStatus) { return this.http.patch<OrderDetail>(`${this.base}/admin/shop/orders/${id}/status`, { status }); }
  retryEmail(id: string, emailId: string) { return this.http.post(`${this.base}/admin/shop/orders/${id}/emails/${emailId}/retry`, {}); }
  tickets(page: number, search: string) { return this.http.get<PageResponse<SeasonTicket>>(`${this.base}/admin/shop/season-tickets`, { params: { page, limit: 20, search }, transferCache: false }); }
  saveTicket(data: { cardNumber: string; fullName: string; seasonKey: string; active: boolean; validFrom: string | null; validUntil: string | null }, id?: string) { return id ? this.http.patch<SeasonTicket>(`${this.base}/admin/shop/season-tickets/${id}`, data) : this.http.post<SeasonTicket>(`${this.base}/admin/shop/season-tickets`, data); }
}
