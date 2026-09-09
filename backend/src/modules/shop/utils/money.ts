// All persisted amounts are integer paras (1 RSD = 100 paras).
export const MAX_MONEY_MINOR = 2_147_483_647;

export function assertMinor(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > MAX_MONEY_MINOR) {
    throw new RangeError('Износ мора бити ненегативан цео број пара у дозвољеном опсегу.');
  }
  return value;
}

export function lineSubtotal(unitPriceMinor: number, quantity: number): number {
  assertMinor(unitPriceMinor);
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new RangeError('Количина мора бити позитиван цео број.');
  }
  return assertMinor(Number(BigInt(unitPriceMinor) * BigInt(quantity)));
}

// Round half up once on the eligible subtotal; no binary decimal arithmetic.
export function percentageDiscount(subtotalMinor: number, percent: number): number {
  assertMinor(subtotalMinor);
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) {
    throw new RangeError('Проценат попуста није исправан.');
  }
  return Number((BigInt(subtotalMinor) * BigInt(percent) + 50n) / 100n);
}

export function totalAfterDiscount(subtotalMinor: number, discountMinor: number): number {
  assertMinor(subtotalMinor);
  assertMinor(discountMinor);
  return assertMinor(subtotalMinor - discountMinor);
}
