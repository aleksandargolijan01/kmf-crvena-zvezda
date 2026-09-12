import { HttpException } from '@nestjs/common';
export const shopMessages = {
  PRICE_CHANGED: 'Цена једног или више производа је промењена. Проверите нови износ и поново потврдите поруџбину.',
  VARIANT_UNAVAILABLE: 'Један или више производа више није доступан у изабраној величини. Проверите корпу.',
  PRODUCT_UNAVAILABLE: 'Један или више производа више није у понуди. Проверите корпу.',
  SEASON_TICKET_INVALID: 'Подаци сезонске карте нису исправни или карта није активна.',
  QUOTE_EXPIRED: 'Обрачун је истекао. Освежите га и поново потврдите поруџбину.',
  IDEMPOTENCY_CONFLICT: 'Овај покушај је већ повезан са другом поруџбином. Проверите претходну потврду.',
  INVALID_INPUT: 'Проверите унете податке.',
  INVALID_STATUS: 'Ова промена статуса није дозвољена.',
  SHOP_NOT_CONFIGURED: 'Поручивање тренутно није доступно.',
  RECEIPT_EXPIRED: 'Потврда више није доступна у овом прегледачу. Проверите примљени имејл.',
} as const;
export type ShopErrorCode = keyof typeof shopMessages;
export function shopError(code: ShopErrorCode, status = 409, extra: Record<string, unknown> = {}): never {
  throw new HttpException({ code, message: shopMessages[code], ...extra }, status);
}
