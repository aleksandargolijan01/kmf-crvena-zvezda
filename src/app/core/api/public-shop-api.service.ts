import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, expand, map, reduce, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CatalogPage, CatalogProduct, featuredProducts } from '../shop/public-shop.models';

@Injectable({ providedIn: 'root' })
export class PublicShopApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl.replace(/\/$/, '')}/shop/products`;

  private page(page: number, featured = false, prerender = false) {
    return this.http.get<CatalogPage>(this.url, {
      params: { page, limit: featured ? 10 : 50, order: 'asc', ...(featured ? { featured: true } : {}) },
      transferCache: prerender, cache: 'no-store'
    }).pipe(timeout(12000));
  }
  catalog(prerender = false) {
    // Read every API page without introducing pagination controls or cached cart prices.
    return this.page(1, false, prerender).pipe(
      expand((page) => page.meta.page < page.meta.totalPages ? this.page(page.meta.page + 1, false, prerender) : EMPTY),
      reduce((all, page) => [...all, ...page.data], [] as CatalogProduct[])
    );
  }
  featured() { return this.page(1, true).pipe(map((page) => featuredProducts(page.data))); }
  product(slug: string, prerender = false) {
    return this.http.get<CatalogProduct>(`${this.url}/${encodeURIComponent(slug)}`, { transferCache: prerender, cache: 'no-store' }).pipe(timeout(12000));
  }
}
