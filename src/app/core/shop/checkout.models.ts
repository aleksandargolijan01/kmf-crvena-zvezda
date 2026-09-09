import { CartEntry } from './public-shop.models';
export type OrderStatus = 'NEW' | 'CONFIRMED' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
export type OrderSource = 'WEBSITE' | 'INSTAGRAM' | 'PHONE' | 'IN_PERSON' | 'ADMIN';
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
export const checkoutMessages: Record<string, string> = {
  PRICE_CHANGED: 'Цена једног или више производа је промењена. Проверите нови износ и поново потврдите поруџбину.',
  VARIANT_UNAVAILABLE: 'Један или више производа више није доступан у изабраној величини. Проверите корпу.',
  PRODUCT_UNAVAILABLE: 'Један или више производа више није у понуди. Проверите корпу.',
  SEASON_TICKET_INVALID: 'Сезонска карта није пронађена или није важећа. Проверите унете податке.',
  QUOTE_EXPIRED: 'Обрачун је истекао. Освежите га и поново потврдите поруџбину.',
  IDEMPOTENCY_CONFLICT: 'Овај покушај је већ повезан са другом поруџбином. Проверите претходну потврду.',
  RATE_LIMITED: 'Превише покушаја. Сачекајте минут и покушајте поново.',
  INVALID_STATUS: 'Ова промена статуса није дозвољена.',
  SHOP_NOT_CONFIGURED: 'Поручивање тренутно није доступно.',
};
export function checkoutError(error: unknown): string {
  const code = (error as { error?: { code?: string } })?.error?.code;
  return code && checkoutMessages[code] || 'Захтев није успео. Проверите податке и покушајте поново.';
}
