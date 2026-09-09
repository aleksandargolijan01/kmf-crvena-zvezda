import { assertMinor, lineSubtotal, MAX_MONEY_MINOR, percentageDiscount, totalAfterDiscount } from './money';

describe('integer money', () => {
  it.each([-1, 0.1, NaN, Infinity, MAX_MONEY_MINOR + 1])('rejects invalid amount %s', (value) => {
    expect(() => assertMinor(value)).toThrow();
  });
  it('accepts zero and stores 3200 RSD as 320000 paras', () => {
    expect(assertMinor(0)).toBe(0);
    expect(lineSubtotal(320000, 3)).toBe(960000);
  });
  it('rejects overflow and invalid quantities', () => {
    expect(() => lineSubtotal(MAX_MONEY_MINOR, 2)).toThrow();
    expect(() => lineSubtotal(100, 0)).toThrow();
    expect(() => lineSubtotal(100, 1.5)).toThrow();
  });
  it('rounds at the para and keeps arithmetic exact', () => {
    expect(percentageDiscount(320000, 20)).toBe(64000);
    expect(percentageDiscount(3, 20)).toBe(1);
    expect(percentageDiscount(1, 50)).toBe(1);
    expect(totalAfterDiscount(320000, 64000)).toBe(256000);
    expect(() => totalAfterDiscount(100, 101)).toThrow();
  });
});
