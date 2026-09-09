import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { ShopErrorCode, shopError } from './shop-errors';
interface SignedClaims { purpose: string; exp: number; [key: string]: unknown; }
@Injectable()
export class ShopTokensService {
  constructor(private readonly config: ConfigService) {}
  hash(domain: string, value: string) {
    const secret = this.config.get<string>('SHOP_TOKEN_SECRET');
    if (!secret || secret.length < 32) shopError('SHOP_NOT_CONFIGURED', 503);
    return createHmac('sha256', secret).update(`${domain}\0${value}`).digest('hex');
  }
  sign(purpose: string, claims: Record<string, unknown>, seconds: number) {
    const payload = Buffer.from(JSON.stringify({ ...claims, purpose, exp: Math.floor(Date.now() / 1000) + seconds })).toString('base64url');
    return `${payload}.${this.hash('token', payload)}`;
  }
  verify(token: string, purpose: string, code: ShopErrorCode): SignedClaims {
    const [payload, signature, extra] = token.split('.');
    const expected = this.hash('token', payload ?? '');
    try {
      if (extra || !signature || !/^[a-f0-9]{64}$/.test(signature) || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error();
      const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SignedClaims;
      if (claims.purpose !== purpose || !Number.isInteger(claims.exp) || claims.exp <= Date.now() / 1000) throw new Error();
      return claims;
    } catch { return shopError(code); }
  }
}
