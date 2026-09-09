import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, SeasonTicket, SeasonTicketVerificationMethod } from '@prisma/client';
import bcrypt from 'bcrypt';
import { createHmac } from 'crypto';
import sanitizeHtml from 'sanitize-html';
import { PrismaService } from '../../../database/prisma.service';
import { ShopTokensService } from '../checkout/shop-tokens.service';
import { shopError } from '../checkout/shop-errors';
import { ShopListDto, TicketValidationDto, TicketWriteDto } from '../checkout/checkout.dto';
import { buildPaginatedResponse } from '../../../common/pagination';

const safeSelect = { id: true, seasonKey: true, cardNumber: true, active: true, validFrom: true, validUntil: true, verificationMethod: true, createdAt: true, updatedAt: true } satisfies Prisma.SeasonTicketSelect;
@Injectable()
export class SeasonTicketsService {
  private readonly dummyHash = bcrypt.hash('unusable-dummy-verifier', 12);
  constructor(private readonly db: PrismaService, private readonly config: ConfigService, private readonly tokens: ShopTokensService) {}
  private key(version: number): string | undefined {
    try { const keys = JSON.parse(this.config.get<string>('SHOP_VERIFIER_KEYS', '{}')) as Record<string, string>; const key = keys[String(version)]; return typeof key === 'string' && key.length >= 32 ? key : undefined; } catch { return undefined; }
  }
  private normalize(method: SeasonTicketVerificationMethod, value: string) {
    const text = value.normalize('NFKC').trim();
    if (method === 'LAST_NAME') return text.toLocaleLowerCase('sr').replace(/\s+/g, ' ');
    if (method === 'PHONE_LAST4') return /^\d{4}$/.test(text) ? text : '';
    return text;
  }
  private prehash(method: SeasonTicketVerificationMethod, value: string, key: string) { return createHmac('sha256', key).update(`${method}\0${this.normalize(method, value)}`).digest('base64'); }
  private valid(ticket: SeasonTicket | null, at = new Date()): ticket is SeasonTicket {
    return !!ticket && ticket.active && !!ticket.verifierHash && !!ticket.verificationMethod && (!ticket.validFrom || ticket.validFrom <= at) && (!ticket.validUntil || ticket.validUntil >= at);
  }
  async validate(dto: TicketValidationDto) {
    const seasonKey = this.config.get<string>('SHOP_ACTIVE_SEASON');
    const ticket = seasonKey ? await this.db.seasonTicket.findUnique({ where: { seasonKey_cardNumber: { seasonKey, cardNumber: dto.cardNumber.trim() } } }) : null;
    const method = ticket?.verificationMethod ?? 'PIN';
    const key = this.key(ticket?.verifierKeyVersion ?? 1);
    const candidate = this.prehash(method, dto.verificationValue, key ?? 'invalid-unconfigured-verifier-key');
    const matches = await bcrypt.compare(candidate, ticket?.verifierHash ?? await this.dummyHash).catch(() => false);
    if (!key || !matches || !this.normalize(method, dto.verificationValue) || !this.valid(ticket)) shopError('SEASON_TICKET_INVALID', 400);
    return { valid: true, discountPercent: 20, seasonTicketToken: this.tokens.sign('season-ticket', { id: ticket.id, version: ticket.version }, 600), expiresIn: 600 };
  }
  async context(tx: Prisma.TransactionClient, token?: string) {
    if (!token) return null;
    const claims = this.tokens.verify(token, 'season-ticket', 'SEASON_TICKET_INVALID');
    if (typeof claims.id !== 'string') shopError('SEASON_TICKET_INVALID');
    await tx.$queryRaw`SELECT "id" FROM "SeasonTicket" WHERE "id" = ${claims.id} FOR SHARE`;
    const ticket = await tx.seasonTicket.findUnique({ where: { id: claims.id } });
    if (!this.valid(ticket) || ticket.version !== claims.version || ticket.seasonKey !== this.config.get<string>('SHOP_ACTIVE_SEASON')) shopError('SEASON_TICKET_INVALID');
    return { id: ticket.id, version: ticket.version };
  }
  async list(query: ShopListDto) {
    const where = query.search ? { OR: [{ cardNumber: { contains: query.search, mode: 'insensitive' as const } }, { seasonKey: { contains: query.search, mode: 'insensitive' as const } }] } : {};
    const [data, count] = await this.db.$transaction([this.db.seasonTicket.findMany({ where, select: safeSelect, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (query.page - 1) * query.limit, take: query.limit }), this.db.seasonTicket.count({ where })]);
    return buildPaginatedResponse(data, count, query.page, query.limit);
  }
  async write(dto: TicketWriteDto, id?: string) {
    const clean = (value: string) => sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
    if (!clean(dto.cardNumber) || !clean(dto.seasonKey)) shopError('INVALID_INPUT', 400);
    if (dto.validFrom && dto.validUntil && new Date(dto.validUntil) < new Date(dto.validFrom)) shopError('INVALID_INPUT', 400);
    return this.db.$transaction(async (tx) => {
      if (id) await tx.$queryRaw`SELECT "id" FROM "SeasonTicket" WHERE "id" = ${id} FOR UPDATE`;
      const previous = id ? await tx.seasonTicket.findUnique({ where: { id } }) : null;
      if (id && !previous) shopError('INVALID_INPUT', 404);
      const method = dto.verificationMethod ?? null;
      const value = dto.verificationValue?.trim();
      if (previous && method !== previous.verificationMethod && !value && method !== null) shopError('INVALID_INPUT', 400);
      let verifierHash = previous?.verifierHash ?? null;
      let verifierKeyVersion = previous?.verifierKeyVersion ?? null;
      if (!method) { verifierHash = null; verifierKeyVersion = null; }
      else if (value) {
        verifierKeyVersion = Number(this.config.get('SHOP_VERIFIER_KEY_VERSION', 1));
        const key = this.key(verifierKeyVersion);
        if (!key) shopError('SHOP_NOT_CONFIGURED', 503);
        if (!this.normalize(method, value)) shopError('INVALID_INPUT', 400);
        verifierHash = await bcrypt.hash(this.prehash(method, value, key), 12);
      }
      if (dto.active && (!method || !verifierHash)) shopError('INVALID_INPUT', 400);
      const data = { cardNumber: clean(dto.cardNumber), seasonKey: clean(dto.seasonKey), active: dto.active, verificationMethod: method, verifierHash, verifierKeyVersion, validFrom: dto.validFrom ? new Date(dto.validFrom) : null, validUntil: dto.validUntil ? new Date(dto.validUntil) : null };
      return id ? tx.seasonTicket.update({ where: { id }, data: { ...data, version: { increment: 1 } }, select: safeSelect }) : tx.seasonTicket.create({ data, select: safeSelect });
    }, { timeout: 15000 }).catch((error: unknown) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') shopError('INVALID_INPUT', 409);
      throw error;
    });
  }
}
