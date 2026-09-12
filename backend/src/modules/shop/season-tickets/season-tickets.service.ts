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

const safeSelect = { id: true, seasonKey: true, cardNumber: true, fullName: true, active: true, validFrom: true, validUntil: true, verificationMethod: true, createdAt: true, updatedAt: true } satisfies Prisma.SeasonTicketSelect;
const normalizedName = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('sr');
@Injectable()
export class SeasonTicketsService {
  private readonly dummyHash = bcrypt.hash('unusable-dummy-verifier', 12);
  constructor(private readonly db: PrismaService, private readonly config: ConfigService, private readonly tokens: ShopTokensService) {}
  private key(version: number): string | undefined {
    try { const keys = JSON.parse(this.config.get<string>('SHOP_VERIFIER_KEYS', '{}')) as Record<string, string>; const key = keys[String(version)]; return typeof key === 'string' && key.length >= 32 ? key : undefined; } catch { return undefined; }
  }
  private normalize(method: SeasonTicketVerificationMethod, value: string) {
    if (method === 'FULL_NAME') return normalizedName(value);
    const text = value.normalize('NFKC').trim();
    if (method === 'LAST_NAME') return text.toLocaleLowerCase('sr').replace(/\s+/g, ' ');
    if (method === 'PHONE_LAST4') return /^\d{4}$/.test(text) ? text : '';
    return text;
  }
  private prehash(method: SeasonTicketVerificationMethod, value: string, key: string) { return createHmac('sha256', key).update(`${method}\0${this.normalize(method, value)}`).digest('base64'); }
  private valid(ticket: SeasonTicket | null, at = new Date()): ticket is SeasonTicket {
    return !!ticket && ticket.active && !!ticket.fullName?.trim() && /^[0-9]+(?![\s\S])/.test(ticket.cardNumber)
      && ticket.verificationMethod === 'FULL_NAME' && !!ticket.verifierHash
      && (!ticket.validFrom || ticket.validFrom <= at) && (!ticket.validUntil || ticket.validUntil >= at);
  }
  async validate(dto: TicketValidationDto) {
    const seasonKey = this.config.get<string>('SHOP_ACTIVE_SEASON');
    const ticket = seasonKey && typeof dto.cardNumber === 'string' && /^[0-9]{1,100}(?![\s\S])/.test(dto.cardNumber)
      ? await this.db.seasonTicket.findUnique({ where: { seasonKey_cardNumber: { seasonKey, cardNumber: dto.cardNumber } } }) : null;
    const method = SeasonTicketVerificationMethod.FULL_NAME;
    const key = this.key(ticket?.verifierKeyVersion ?? 1);
    const fullName = typeof dto.fullName === 'string' && dto.fullName.length <= 200 ? dto.fullName : '';
    const candidate = this.prehash(method, fullName, key ?? 'invalid-unconfigured-verifier-key');
    const matches = await bcrypt.compare(candidate, ticket?.verifierHash ?? await this.dummyHash).catch(() => false);
    if (!key || !matches || !normalizedName(fullName) || !this.valid(ticket)
      || normalizedName(fullName) !== normalizedName(ticket.fullName!)) shopError('SEASON_TICKET_INVALID', 400);
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
    const where = query.search ? { OR: [{ fullName: { contains: query.search, mode: 'insensitive' as const } }, { cardNumber: { contains: query.search, mode: 'insensitive' as const } }, { seasonKey: { contains: query.search, mode: 'insensitive' as const } }] } : {};
    const [data, count] = await this.db.$transaction([this.db.seasonTicket.findMany({ where, select: safeSelect, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (query.page - 1) * query.limit, take: query.limit }), this.db.seasonTicket.count({ where })]);
    return buildPaginatedResponse(data, count, query.page, query.limit);
  }
  async remove(id: string) {
    return this.db.$transaction(async tx => {
      // Serializes with ticket edits and quote/order eligibility checks.
      await tx.$queryRaw`SELECT "id" FROM "SeasonTicket" WHERE "id" = ${id} FOR UPDATE`;
      if (!await tx.seasonTicket.findUnique({ where: { id }, select: { id: true } })) shopError('INVALID_INPUT', 404);
      // Nullable Restrict FK: detach only the reference, retaining all money snapshots.
      await tx.order.updateMany({ where: { seasonTicketId: id }, data: { seasonTicketId: null } });
      await tx.seasonTicket.delete({ where: { id } });
      return { success: true };
    }, { timeout: 15000 });
  }
  async write(dto: TicketWriteDto, id?: string) {
    const clean = (value: string) => sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
    if (typeof dto.cardNumber !== 'string' || !/^[0-9]{1,100}(?![\s\S])/.test(dto.cardNumber)
      || typeof dto.fullName !== 'string' || dto.fullName.length > 200 || !clean(dto.fullName) || !clean(dto.seasonKey)) shopError('INVALID_INPUT', 400);
    const fullName = clean(dto.fullName).replace(/\s+/g, ' ');
    if (dto.validFrom && dto.validUntil && new Date(dto.validUntil) < new Date(dto.validFrom)) shopError('INVALID_INPUT', 400);
    return this.db.$transaction(async (tx) => {
      if (id) await tx.$queryRaw`SELECT "id" FROM "SeasonTicket" WHERE "id" = ${id} FOR UPDATE`;
      const previous = id ? await tx.seasonTicket.findUnique({ where: { id } }) : null;
      if (id && !previous) shopError('INVALID_INPUT', 404);
      const method = SeasonTicketVerificationMethod.FULL_NAME;
      const verifierKeyVersion = Number(this.config.get('SHOP_VERIFIER_KEY_VERSION', 1));
      const key = this.key(verifierKeyVersion);
      if (!key) shopError('SHOP_NOT_CONFIGURED', 503);
      const verifierHash = await bcrypt.hash(this.prehash(method, fullName, key), 12);
      const data = { cardNumber: dto.cardNumber, fullName, seasonKey: clean(dto.seasonKey), active: dto.active, verificationMethod: method, verifierHash, verifierKeyVersion, validFrom: dto.validFrom ? new Date(dto.validFrom) : null, validUntil: dto.validUntil ? new Date(dto.validUntil) : null };
      return id ? tx.seasonTicket.update({ where: { id }, data: { ...data, version: { increment: 1 } }, select: safeSelect }) : tx.seasonTicket.create({ data, select: safeSelect });
    }, { timeout: 15000 }).catch((error: unknown) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') shopError('INVALID_INPUT', 409);
      throw error;
    });
  }
}
