import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { PrismaService } from '../../../database/prisma.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CheckoutController } from './checkout.controller';
import { AdminCheckoutController } from './admin-checkout.controller';
import { ShopPricingService } from './shop-pricing.service';
import { ShopOrdersService } from '../orders/shop-orders.service';
import { SeasonTicketsService } from '../season-tickets/season-tickets.service';
import { shopError } from './shop-errors';
import { TicketValidationDto, TicketWriteDto } from './checkout.dto';

describe('Checkout HTTP validation, privacy, roles and throttling', () => {
  let app: INestApplication;
  const jwt = new JwtService({ secret: 'isolated-http-test-secret' });
  const orders = { remove: jest.fn().mockResolvedValue({ success: true }), list: jest.fn().mockResolvedValue({ data: [] }), detail: jest.fn().mockResolvedValue({ id: 'test' }), create: jest.fn().mockResolvedValue({ orderNumber: 'CZ-TEST' }), status: jest.fn().mockResolvedValue({ status: 'CONFIRMED' }), retryEmail: jest.fn().mockResolvedValue({ success: true }), readReceipt: jest.fn().mockResolvedValue({}), recover: jest.fn().mockResolvedValue({ found: false }) };
  const pricing = { quote: jest.fn().mockResolvedValue({ totalMinor: 100 }) };
  const tickets = { remove: jest.fn().mockResolvedValue({ success: true }), list: jest.fn().mockResolvedValue({ data: [] }), write: jest.fn().mockResolvedValue({ id: 'ticket' }), validate: jest.fn(() => shopError('SEASON_TICKET_INVALID', 400)) };
  const customer = { firstName: 'Тест', lastName: 'Купац', phone: '+381 601234567', email: 'test@example.invalid', address: 'Тест 1', city: 'Београд', postalCode: '11000' };
  const payload = { customer, items: [{ variantId: 'v1', quantity: 1 }], quoteToken: 'test', idempotencyKey: 'a'.repeat(32) };
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 1000 }])], controllers: [CheckoutController, AdminCheckoutController], providers: [
      { provide: APP_GUARD, useClass: ThrottlerGuard }, JwtAuthGuard, RolesGuard,
      { provide: ShopPricingService, useValue: pricing }, { provide: ShopOrdersService, useValue: orders }, { provide: SeasonTicketsService, useValue: tickets },
      { provide: JwtService, useValue: jwt }, { provide: ConfigService, useValue: { getOrThrow: () => 'isolated-http-test-secret' } },
      { provide: PrismaService, useValue: { user: { findUnique: jest.fn(({ where }) => ({ id: where.id, role: where.id, isActive: true })) } } },
    ] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });
  afterAll(async () => { await app.close(); });
  it('accepts only string ASCII card numbers, preserves zeros and rejects legacy credential fields', async () => {
    const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
    for (const metatype of [TicketValidationDto, TicketWriteDto]) {
      const base = { fullName: 'Тест Купац', ...(metatype === TicketWriteDto ? { seasonKey: 'TEST', active: true } : {}) };
      expect(await pipe.transform({ ...base, cardNumber: '000123' }, { type: 'body', metatype })).toMatchObject({ cardNumber: '000123' });
      for (const cardNumber of ['', 'A123', '12 34', ' 123', '123 ', '12-34', '１２３', 123]) await expect(pipe.transform({ ...base, cardNumber }, { type: 'body', metatype })).rejects.toThrow();
      for (const extra of [{ verificationValue: '1234' }, { verificationMethod: 'PIN' }, { fullName: '   ' }]) await expect(pipe.transform({ ...base, cardNumber: '000123', ...extra }, { type: 'body', metatype })).rejects.toThrow();
    }
  });
  it.each(['ADMIN', 'SUPER_ADMIN'])('allows %s on every order and ticket endpoint', async (role) => {
    const token = jwt.sign({ sub: role, type: 'access' });
    for (const path of ['/admin/shop/orders', '/admin/shop/orders/test', '/admin/shop/season-tickets']) await request(app.getHttpServer()).get(path).auth(token, { type: 'bearer' }).expect(200);
    await request(app.getHttpServer()).post('/admin/shop/orders').auth(token, { type: 'bearer' }).send({ ...payload, source: 'PHONE' }).expect(201);
    expect(orders.create).toHaveBeenLastCalledWith(expect.objectContaining({ source: 'PHONE' }), 'PHONE', role);
    await request(app.getHttpServer()).patch('/admin/shop/orders/test/status').auth(token, { type: 'bearer' }).send({ status: 'CONFIRMED' }).expect(200);
    await request(app.getHttpServer()).post('/admin/shop/orders/test/emails/email/retry').auth(token, { type: 'bearer' }).expect(201);
    for (const kind of ['orders', 'season-tickets']) await request(app.getHttpServer()).delete(`/admin/shop/${kind}/c${'a'.repeat(24)}`).auth(token, { type: 'bearer' }).expect(200);
    const ticket = { cardNumber: '000123', fullName: 'Тест Купац', seasonKey: 'TEST', active: false };
    await request(app.getHttpServer()).post('/admin/shop/season-tickets').auth(token, { type: 'bearer' }).send(ticket).expect(201);
    await request(app.getHttpServer()).patch('/admin/shop/season-tickets/test').auth(token, { type: 'bearer' }).send(ticket).expect(200);
  });
  it('rejects guests and EDITOR on all CMS routes', async () => {
    const token = jwt.sign({ sub: 'EDITOR', type: 'access' });
    for (const [method, path] of [['delete', 'orders/c' + 'a'.repeat(24)], ['delete', 'season-tickets/c' + 'a'.repeat(24)], ['get', 'orders'], ['get', 'orders/id'], ['post', 'orders'], ['patch', 'orders/id/status'], ['post', 'orders/id/emails/id/retry'], ['get', 'season-tickets'], ['post', 'season-tickets'], ['patch', 'season-tickets/id']] as const) {
      await request(app.getHttpServer())[method](`/admin/shop/${path}`).expect(401);
      await request(app.getHttpServer())[method](`/admin/shop/${path}`).auth(token, { type: 'bearer' }).expect(403);
    }
  });
  it('validates DELETE IDs, returns 404 for missing rows and exposes no public DELETE', async () => {
    const token = jwt.sign({ sub: 'ADMIN', type: 'access' });
    for (const [kind, service] of [['orders', orders], ['season-tickets', tickets]] as const) {
      for (const id of ['bad', 'x'.repeat(200), 'invalid%20id']) await request(app.getHttpServer()).delete(`/admin/shop/${kind}/${id}`).auth(token, { type: 'bearer' }).expect(400);
      service.remove.mockImplementationOnce(() => { shopError('INVALID_INPUT', 404); });
      await request(app.getHttpServer()).delete(`/admin/shop/${kind}/c${'b'.repeat(24)}`).auth(token, { type: 'bearer' }).expect(404);
      await request(app.getHttpServer()).delete(`/shop/${kind}/c${'b'.repeat(24)}`).expect(404);
    }
  });
  it('requires customer email, valid phone/postal code and rejects client prices/source', async () => {
    for (const body of [{ ...payload, customer: { ...customer, email: '' } }, { ...payload, customer: null }, { ...payload, customer: { ...customer, postalCode: 'abcde' } }, { ...payload, customer: { ...customer, phone: '-------' } }, { ...payload, totalMinor: 1 }, { ...payload, source: 'ADMIN' }]) {
      const response = await request(app.getHttpServer()).post('/shop/orders').send(body).expect(400);
      expect(response.body.code).toBe('INVALID_INPUT');
      expect(JSON.stringify(response.body)).not.toContain(customer.email);
    }
    await request(app.getHttpServer()).post('/shop/orders').send(payload).expect(201);
    await request(app.getHttpServer()).post('/shop/cart/quote').send({ items: payload.items }).expect(201).expect('Cache-Control', 'no-store');
    await request(app.getHttpServer()).post('/shop/cart/quote').send({ items: [{ variantId: 'v1', quantity: 1, priceMinor: 1 }] }).expect(400);
    await request(app.getHttpServer()).post('/shop/cart/quote').send({ items: payload.items, discountPercent: 20 }).expect(400);
    await request(app.getHttpServer()).post('/shop/orders').send({ ...payload, discountPercent: 20 }).expect(400);
  });
  it('returns a generic ticket error and throttles the sixth attempt per IP', async () => {
    for (let index = 0; index < 5; index++) {
      const response = await request(app.getHttpServer()).post('/shop/season-ticket/validate').send({ cardNumber: '000123', fullName: 'Тест Купац' }).expect(400);
      expect(response.body.code).toBe('SEASON_TICKET_INVALID');
      expect(JSON.stringify(response.body)).not.toMatch(/000123|Купац|hash/);
    }
    const response = await request(app.getHttpServer()).post('/shop/season-ticket/validate').send({ cardNumber: '000123', fullName: 'Тест Купац' }).expect(429);
    expect(response.body.code).toBe('RATE_LIMITED'); expect(tickets.validate).toHaveBeenCalledTimes(5);
  });
  it('contains unexpected database errors without leaking customer data or stack', async () => {
    pricing.quote.mockRejectedValueOnce(new Error('private@example.invalid +381601234567 private note SQL'));
    const response = await request(app.getHttpServer()).post('/shop/cart/quote').send({ items: payload.items }).expect(503);
    expect(response.body).toEqual({ code: 'SHOP_NOT_CONFIGURED', message: expect.any(String) });
    expect(JSON.stringify(response.body)).not.toMatch(/private|SQL|stack/);
  });
});
