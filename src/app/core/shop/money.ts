const maxMinor = 2147483647n;

// Public display also accepts cart totals larger than one Product's database Int.
export function formatShopPrice(minor: number): string {
  if (!Number.isSafeInteger(minor) || minor < 0) throw new RangeError('Износ није исправан.');
  const amount = BigInt(minor);
  const whole = new Intl.NumberFormat('sr-RS').format(amount / 100n);
  const fraction = amount % 100n;
  return `${whole}${fraction ? ',' + String(fraction).padStart(2, '0') : ''} RSD`;
}

export function parseRsd(value: string): number | null {
  const match = /^(\d+)(?:[,.](\d{1,2}))?$/.exec(value.trim());
  if (!match || match[1].length > 8) return null;
  const minor = BigInt(match[1]) * 100n + BigInt((match[2] ?? '').padEnd(2, '0'));
  return minor <= maxMinor ? Number(minor) : null;
}

export function minorToInput(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value > Number(maxMinor)) throw new RangeError('Износ није исправан.');
  const minor = BigInt(value);
  return `${minor / 100n},${String(minor % 100n).padStart(2, '0')}`;
}

export function formatRsd(value: number): string {
  const [whole, fraction] = minorToInput(value).split(',');
  return `${new Intl.NumberFormat('sr-RS').format(BigInt(whole))},${fraction} дин.`;
}
