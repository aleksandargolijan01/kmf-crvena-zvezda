import { LanguageCode, TranslationKey, translations } from '../../i18n/translations';
import { CartEntry } from './public-shop.models';
export type OrderStatus = 'NEW' | 'CONFIRMED' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
export type OrderSource = 'WEBSITE' | 'INSTAGRAM' | 'PHONE' | 'IN_PERSON' | 'ADMIN';
export const orderStatusKeys = { NEW: 'shop.statusNew', CONFIRMED: 'shop.statusConfirmed', SHIPPED: 'shop.statusShipped', COMPLETED: 'shop.statusCompleted', CANCELLED: 'shop.statusCancelled' } as const;
export const orderSourceKeys = { WEBSITE: 'shop.sourceWebsite', INSTAGRAM: 'shop.sourceInstagram', PHONE: 'shop.phone', IN_PERSON: 'shop.sourceInPerson', ADMIN: 'shop.sourceAdmin' } as const;
export const orderStatusLabels: Record<OrderStatus, string> = { NEW: 'Нова', CONFIRMED: 'Потврђена', SHIPPED: 'Послата', COMPLETED: 'Завршена', CANCELLED: 'Отказана' };
export const orderSourceLabels: Record<OrderSource, string> = { WEBSITE: 'Сајт', INSTAGRAM: 'Инстаграм', PHONE: 'Телефон', IN_PERSON: 'Лично', ADMIN: 'Администрација' };
export interface Customer { firstName: string; lastName: string; phone: string; email: string; address: string; city: string; postalCode: string; note: string; }
export interface QuoteItem extends CartEntry { productId: string; productName: string; productSlug: string; sku: string | null; size: string; unitPriceMinor: number; subtotalMinor: number; discountMinor: number; finalMinor: number; }
export interface Quote { items: QuoteItem[]; subtotalMinor: number; discountPercent: number; discountMinor: number; totalMinor: number; shippingMinor: null; shippingCalculated: false; currency: 'RSD'; quoteToken: string; expiresAt: string; }
export interface OrderRequest { items: CartEntry[]; customer: Customer; quoteToken: string; seasonTicketToken?: string; idempotencyKey: string; source?: OrderSource; }
export interface Receipt { orderNumber: string; status: OrderStatus; totalMinor: number; createdAt: string; receiptToken: string; }
export interface OrderSummary { id: string; orderNumber: string; firstName: string; lastName: string; createdAt: string; totalMinor: number; discountPercent: number; discountMinor: number; status: OrderStatus; source: OrderSource; }
export interface OrderDetail extends OrderSummary, Customer {
  subtotalMinor: number; shippingMinor: number | null; shippingCalculated: boolean; items: QuoteItem[]; allowedStatuses: OrderStatus[];
  statusHistory: Array<{ id: string; status: OrderStatus; createdAt: string; changedBy: { firstName: string; lastName: string } | null }>;
  emails: Array<{ id: string; kind: 'CLUB' | 'CUSTOMER'; status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED'; attempts: number; lastError: string | null; nextAttemptAt: string | null; sentAt: string | null }>;
}
export type VerificationMethod = 'LAST_NAME' | 'PHONE_LAST4' | 'PIN';
export interface SeasonTicket { id: string; seasonKey: string; cardNumber: string; active: boolean; verificationMethod: VerificationMethod | null; validFrom: string | null; validUntil: string | null; }
export const checkoutMessageKeys: Record<string, TranslationKey> = {
  PRICE_CHANGED: 'shop.priceChanged',
  VARIANT_UNAVAILABLE: 'shop.variantUnavailable',
  PRODUCT_UNAVAILABLE: 'shop.productUnavailable',
  SEASON_TICKET_INVALID: 'shop.ticketInvalid',
  QUOTE_EXPIRED: 'shop.quoteExpired',
  IDEMPOTENCY_CONFLICT: 'shop.idempotencyConflict',
  RATE_LIMITED: 'shop.rateLimited',
  INVALID_STATUS: 'shop.invalidStatus',
  SHOP_NOT_CONFIGURED: 'shop.checkoutUnavailable',
};
export function checkoutErrorKey(error: unknown): TranslationKey {
  const code = (error as { error?: { code?: string } })?.error?.code;
  return code && checkoutMessageKeys[code] || 'shop.requestFailed';
}

export const checkoutMessages = Object.fromEntries(Object.entries(checkoutMessageKeys).map(([code, key]) => [code, translations.sr[key]]));
export function checkoutError(error: unknown, language: LanguageCode = 'sr'): string { return translations[language][checkoutErrorKey(error)]; }
