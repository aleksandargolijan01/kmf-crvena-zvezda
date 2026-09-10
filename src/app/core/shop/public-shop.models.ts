import { LanguageCode, translations } from '../../i18n/translations';
import { LocalizedText } from '../../data/site.models';
import { ProductAvailability } from '../api/shop-api.models';
export { formatShopPrice } from './money';

export interface CatalogVariant { id: string; size: string; available: boolean; }
export interface CatalogProduct {
  id: string; slug: string; name: LocalizedText; description: LocalizedText;
  priceMinor: number; compareAtPriceMinor: number | null; currency: 'RSD';
  availability: ProductAvailability; featured: boolean; isNew: boolean;
  coverImage: { id: string; url: string; altText: string | null } | null;
  gallery: Array<{ id: string; url: string; alt: LocalizedText }>;
  variants: CatalogVariant[]; availableForOrder: boolean;
}
export interface CatalogPage {
  data: CatalogProduct[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
export interface CartEntry { variantId: string; quantity: number; }
export interface StoredCart { version: 1; items: CartEntry[]; updatedAt: string; }

export function productBadge(product: CatalogProduct, language: LanguageCode = 'sr'): string | null {
  return product.availability === 'SOLD_OUT' ? translations[language]['shop.soldOut'] : product.isNew ? translations[language]['shop.new'] : product.featured ? translations[language]['shop.featured'] : null;
}

// The public API already sorts by featuredOrder; keep its stable order.
export function featuredProducts(products: CatalogProduct[]): CatalogProduct[] {
  return products.filter((product) => product.featured).slice(0, 10);
}

export const CART_KEY = 'kmf_shop_cart';
export const MAX_QUANTITY = 99;
export const MAX_CART_LINES = 100;
export function validQuantity(value: number): boolean { return Number.isInteger(value) && value >= 1 && value <= MAX_QUANTITY; }

export function readCart(raw: string | null): { items: CartEntry[]; recovered: boolean } {
  if (!raw) return { items: [], recovered: false };
  try {
    const value = JSON.parse(raw) as StoredCart;
    if (value.version !== 1 || !Array.isArray(value.items) || value.items.length > MAX_CART_LINES || typeof value.updatedAt !== 'string' || !Number.isFinite(Date.parse(value.updatedAt))) throw new Error();
    const ids = new Set<string>();
    const items = value.items.map((item) => {
      if (!item || typeof item.variantId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(item.variantId) || !validQuantity(item.quantity) || ids.has(item.variantId)) throw new Error();
      ids.add(item.variantId);
      return { variantId: item.variantId, quantity: item.quantity };
    });
    return { items, recovered: false };
  } catch { return { items: [], recovered: true }; }
}

export function resolveCart(items: CartEntry[], products: CatalogProduct[]) {
  return items.map((entry) => {
    const product = products.find((product) => product.variants.some((variant) => variant.id === entry.variantId));
    const variant = product?.variants.find((variant) => variant.id === entry.variantId);
    const available = !!product && !!variant?.available && product.availability !== 'SOLD_OUT';
    return { ...entry, product, variant, available, lineMinor: available ? Number(BigInt(product!.priceMinor) * BigInt(entry.quantity)) : null };
  });
}

export function cartTotal(rows: ReturnType<typeof resolveCart>): number | null {
  if (rows.some((row) => row.lineMinor === null)) return null;
  const total = rows.reduce((sum, row) => sum + BigInt(row.lineMinor!), 0n);
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(total);
}
