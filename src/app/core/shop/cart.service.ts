import { Injectable, computed, inject, signal, DestroyRef } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PublicShopApiService } from '../api/public-shop-api.service';
import { CART_KEY, CartEntry, CatalogProduct, MAX_CART_LINES, MAX_QUANTITY, StoredCart, cartTotal, readCart, resolveCart, validQuantity } from './public-shop.models';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly api = inject(PublicShopApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly entries = signal<CartEntry[]>([]);
  private readonly products = signal<CatalogProduct[]>([]);
  private requestVersion = 0;
  private initialized = false;
  readonly items = this.entries.asReadonly();
  readonly count = computed(() => this.entries().reduce((sum, entry) => sum + entry.quantity, 0));
  readonly rows = computed(() => resolveCart(this.entries(), this.products()));
  readonly loading = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly totalMinor = computed(() => this.loading() || this.error() ? null : cartTotal(this.rows()));

  // Called only from browser lifecycle/events, so prerender never reads storage.
  initialize() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;
    this.restore();
    const synchronize = (event: StorageEvent) => {
      if (event.key !== CART_KEY && event.key !== null) return;
      this.restore();
      void this.refresh();
    };
    window.addEventListener('storage', synchronize);
    this.destroyRef.onDestroy(() => window.removeEventListener('storage', synchronize));
  }
  private restore() {
    try {
      const result = readCart(localStorage.getItem(CART_KEY));
      this.entries.set(result.items);
      if (result.recovered) {
        this.notice.set('Сачувана корпа није исправна или је из старије верзије. Можете поново додати производе.');
        this.persist();
      }
    } catch { this.notice.set('Чување корпе није доступно у овом прегледачу. Корпа важи док је страница отворена.'); }
  }
  private persist() {
    const value: StoredCart = { version: 1, items: this.entries(), updatedAt: new Date().toISOString() };
    try { localStorage.setItem(CART_KEY, JSON.stringify(value)); }
    catch { this.notice.set('Корпа није сачувана у прегледачу. Не затварајте страницу ако желите да задржите избор.'); }
  }

  add(product: CatalogProduct, variantId: string, quantity: number): string | null {
    this.initialize();
    const variant = product.variants.find((variant) => variant.id === variantId);
    if (!variant) return 'Изаберите величину.';
    if (!variant.available || product.availability === 'SOLD_OUT') return 'Изабрана величина тренутно није доступна.';
    if (!validQuantity(quantity)) return 'Количина мора бити између 1 и 99.';
    const existing = this.entries().find((entry) => entry.variantId === variantId);
    if ((existing?.quantity ?? 0) + quantity > MAX_QUANTITY) return 'У корпи може бити највише 99 комада исте величине.';
    if (!existing && this.entries().length >= MAX_CART_LINES) return 'Корпа је попуњена. Уклоните артикал пре додавања новог.';
    this.products.update((products) => [...products.filter((entry) => entry.id !== product.id), product]);
    this.entries.update((items) => existing ? items.map((entry) => entry.variantId === variantId ? { ...entry, quantity: entry.quantity + quantity } : entry) : [...items, { variantId, quantity }]);
    this.persist();
    return null;
  }
  remove(variantId: string) { this.entries.update((items) => items.filter((entry) => entry.variantId !== variantId)); this.persist(); }
  clear() { this.entries.set([]); this.products.set([]); this.notice.set(''); this.persist(); }
  updateQuantity(variantId: string, quantity: number) {
    if (!validQuantity(quantity)) return;
    this.entries.update((items) => items.map((entry) => entry.variantId === variantId ? { ...entry, quantity } : entry));
    this.persist();
  }
  async refresh() {
    this.initialize();
    const version = ++this.requestVersion;
    this.loading.set(true);
    this.error.set('');
    try {
      const products = this.entries().length ? await firstValueFrom(this.api.catalog()) : [];
      if (version !== this.requestVersion) return;
      if (this.products().some((old) => products.some((fresh) => fresh.id === old.id && fresh.priceMinor !== old.priceMinor))) this.notice.set('Цена је промењена. Преглед корпе приказује актуелне цене.');
      this.products.set(products);
    } catch {
      if (version === this.requestVersion) this.error.set('Не можемо да проверимо актуелне цене и доступност. Покушајте поново.');
    } finally { if (version === this.requestVersion) this.loading.set(false); }
  }
}
