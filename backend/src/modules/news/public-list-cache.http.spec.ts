import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { SponsorsController } from '../sponsors/sponsors.controller';
import { SponsorsService } from '../sponsors/sponsors.service';

describe('Public list HTTP revalidation (no database)', () => {
  let app: INestApplication;
  const news = { findPublished: jest.fn() };
  const sponsors = { findPublicGrouped: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [NewsController, SponsorsController],
      providers: [{ provide: NewsService, useValue: news }, { provide: SponsorsService, useValue: sponsors }],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => { await app.close(); });

  it.each(['/news', '/sponsors/grouped'])('%s revalidates cached responses and returns updated data', async (path) => {
    const method = path === '/news' ? news.findPublished : sponsors.findPublicGrouped;
    method.mockReturnValueOnce([{ id: 'old' }]).mockReturnValueOnce([{ id: 'new' }]);
    const first = await request(app.getHttpServer()).get(path).expect(200)
      .expect('Cache-Control', 'public, max-age=0, must-revalidate');
    const updated = await request(app.getHttpServer()).get(path).set('If-None-Match', first.headers['etag']).expect(200);
    expect(updated.body).toEqual([{ id: 'new' }]);
    expect(updated.headers['etag']).not.toEqual(first.headers['etag']);
  });
});
