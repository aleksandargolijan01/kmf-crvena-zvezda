import { ConflictException, Logger } from '@nestjs/common';
import { MediaService } from './media.service';

describe('Media usage with Shop', () => {
  let service: MediaService;
  let db: any;
  let storageRemove: jest.Mock;
  beforeEach(() => {
    storageRemove = jest.fn().mockResolvedValue({ error: null });
    db = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      mediaFile: {
        findUnique: jest.fn().mockResolvedValue({ id: 'm', bucket: 'images', storagePath: 'image.jpg', deletingAt: null }),
        update: jest.fn(), deleteMany: jest.fn(),
      },
    };
    for (const model of ['news', 'player', 'u19Player', 'managementMember', 'boardMember', 'staffMember', 'sponsor', 'product', 'productImage']) db[model] = { count: jest.fn().mockResolvedValue(0) };
    db.$transaction = jest.fn((callback) => callback(db));
    // No live Storage configuration or network access is required by this test.
    service = Object.create(MediaService.prototype) as MediaService;
    Object.assign(service, { prisma: db, logger: { log: jest.fn() } as unknown as Logger, supabase: { storage: { from: () => ({ remove: storageRemove }) } } });
  });
  it.each(['product', 'productImage', 'news', 'player', 'u19Player', 'managementMember', 'boardMember', 'staffMember', 'sponsor'])('blocks deletion when referenced by %s', async (model) => {
    db[model].count.mockResolvedValue(1);
    await expect(service.remove('m')).rejects.toBeInstanceOf(ConflictException);
    expect(storageRemove).not.toHaveBeenCalled();
    expect(db.mediaFile.deleteMany).not.toHaveBeenCalled();
  });
  it('reserves an unused file before storage deletion', async () => {
    await expect(service.remove('m')).resolves.toEqual({ success: true });
    expect(db.mediaFile.update).toHaveBeenCalledWith({ where: { id: 'm' }, data: { deletingAt: expect.any(Date) } });
    expect(db.mediaFile.update.mock.invocationCallOrder[0]).toBeLessThan(storageRemove.mock.invocationCallOrder[0]);
    expect(storageRemove.mock.invocationCallOrder[0]).toBeLessThan(db.mediaFile.deleteMany.mock.invocationCallOrder[0]);
  });
  it('retains a retryable marker if storage fails', async () => {
    storageRemove.mockResolvedValue({ error: { message: 'offline' } });
    await expect(service.remove('m')).rejects.toThrow();
    expect(db.mediaFile.deleteMany).not.toHaveBeenCalled();
    expect(db.mediaFile.update).toHaveBeenCalledTimes(1);
  });
});
