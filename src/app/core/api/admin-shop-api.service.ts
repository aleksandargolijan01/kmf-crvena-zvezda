import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { PageResponse } from './admin-api.models';
import { AdminProduct, ProductQuery, ProductWrite } from './shop-api.models';

@Injectable({ providedIn: 'root' })
export class AdminShopApiService {
  private readonly url = `${environment.apiUrl.replace(/\/$/, '')}/admin/shop/products`;
  constructor(private readonly http: HttpClient) {}

  list(query: ProductQuery) {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    });
    return this.http.get<PageResponse<AdminProduct>>(this.url, { params });
  }
  detail(id: string) { return this.http.get<AdminProduct>(`${this.url}/${id}`); }
  create(payload: ProductWrite) { return this.http.post<AdminProduct>(this.url, payload); }
  update(id: string, payload: Partial<ProductWrite>) { return this.http.patch<AdminProduct>(`${this.url}/${id}`, payload); }
  remove(id: string) { return this.http.delete<{ success: boolean }>(`${this.url}/${id}`); }
}
