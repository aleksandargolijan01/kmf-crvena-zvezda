import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminProductsController } from './admin-products.controller';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('Shop HTTP auth and role protection', () => {
  let app: INestApplication;
  const jwt = new JwtService({ secret: 'shop-test-only-secret-never-used-in-production' });
  const service = {
    findAdmin: jest.fn().mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } }),
    findAdminById: jest.fn().mockResolvedValue({ id: 'p' }), create: jest.fn().mockResolvedValue({ id: 'p' }),
    update: jest.fn().mockResolvedValue({ id: 'p' }), remove: jest.fn().mockResolvedValue({ success: true }),
    regenerateTranslations: jest.fn().mockResolvedValue({ product: { id: 'p' }, translatedFields: [], errors: [] }),
    findPublic: jest.fn().mockResolvedValue({ data: [] }), findPublicBySlug: jest.fn().mockResolvedValue({ slug: 'majica' }),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AdminProductsController, ProductsController],
      providers: [JwtAuthGuard, RolesGuard,
        { provide: ProductsService, useValue: service }, { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: { getOrThrow: () => 'shop-test-only-secret-never-used-in-production' } },
        { provide: PrismaService, useValue: { user: { findUnique: jest.fn(({ where }) => ({ id: where.id, role: where.id, isActive: where.id !== 'INACTIVE' })) } } },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });
  afterAll(async () => { await app.close(); });

  it.each(['SUPER_ADMIN', 'ADMIN'])('allows %s on every product endpoint', async (role) => {
    const token = jwt.sign({ sub: role, type: 'access' });
    await request(app.getHttpServer()).get('/admin/shop/products').auth(token, { type: 'bearer' }).expect(200);
    await request(app.getHttpServer()).get('/admin/shop/products/p').auth(token, { type: 'bearer' }).expect(200);
    await request(app.getHttpServer()).post('/admin/shop/products').auth(token, { type: 'bearer' }).send({ nameSr: 'Мајица', descriptionSr: 'Опис', priceMinor: 320000 }).expect(201);
    await request(app.getHttpServer()).patch('/admin/shop/products/p').auth(token, { type: 'bearer' }).send({ active: false }).expect(200);
    await request(app.getHttpServer()).post('/admin/shop/products/p/translations/regenerate').auth(token, { type: 'bearer' }).send({ force: false }).expect(201);
    await request(app.getHttpServer()).post('/admin/shop/products/p/translations/regenerate').auth(token, { type: 'bearer' }).send({ force: 'true' }).expect(400);
    await request(app.getHttpServer()).delete('/admin/shop/products/p').auth(token, { type: 'bearer' }).expect(200);
  });
  it('denies EDITOR for reads and all writes', async () => {
    const token = jwt.sign({ sub: 'EDITOR', type: 'access' });
    await request(app.getHttpServer()).post('/admin/shop/products/p/translations/regenerate').auth(token, { type: 'bearer' }).send({ force: true }).expect(403);
    for (const method of ['get', 'post', 'patch', 'delete'] as const) {
      const path = ['patch', 'delete'].includes(method) ? '/admin/shop/products/p' : '/admin/shop/products';
      await request(app.getHttpServer())[method](path).auth(token, { type: 'bearer' }).expect(403);
    }
  });
  it('rejects unauthenticated, inactive, expired and refresh tokens', async () => {
    await request(app.getHttpServer()).post('/admin/shop/products/p/translations/regenerate').send({}).expect(401);
    await request(app.getHttpServer()).get('/admin/shop/products').expect(401);
    for (const token of [jwt.sign({ sub: 'INACTIVE', type: 'access' }), jwt.sign({ sub: 'ADMIN', type: 'refresh' }), jwt.sign({ sub: 'ADMIN', type: 'access' }, { expiresIn: -1 })]) {
      await request(app.getHttpServer()).get('/admin/shop/products').auth(token, { type: 'bearer' }).expect(401);
    }
  });
  it('keeps the public catalog open and rejects inactive-filter bypass', async () => {
    await request(app.getHttpServer()).get('/shop/products').expect(200);
    await request(app.getHttpServer()).get('/shop/products/majica').expect(200);
    await request(app.getHttpServer()).get('/shop/products?active=false').expect(400);
  });
});
