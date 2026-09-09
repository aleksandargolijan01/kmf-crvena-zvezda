import { ConfigService } from '@nestjs/config';
import { ShopTokensService } from './shop-tokens.service';
describe('Shop purpose-bound signed tokens', () => {
  const tokens = new ShopTokensService(new ConfigService({ SHOP_TOKEN_SECRET: 'isolated-test-secret-with-at-least-32-characters' }));
  it('accepts only unmodified, unexpired tokens for the same purpose', () => {
    const token = tokens.sign('quote', { fingerprint: 'test' }, 300);
    expect(tokens.verify(token, 'quote', 'QUOTE_EXPIRED').fingerprint).toBe('test');
    for (const invalid of [token + 'x', token.replace(/^./, 'x'), 'malformed', tokens.sign('quote', {}, -1)]) expect(() => tokens.verify(invalid, 'quote', 'QUOTE_EXPIRED')).toThrow();
    expect(() => tokens.verify(token, 'receipt', 'RECEIPT_EXPIRED')).toThrow();
  });
  it('separates key hashes by domain and fails closed without config', () => {
    expect(tokens.hash('idempotency', 'key')).not.toBe(tokens.hash('order-request', 'key'));
    expect(() => new ShopTokensService(new ConfigService()).sign('quote', {}, 300)).toThrow();
  });
});
