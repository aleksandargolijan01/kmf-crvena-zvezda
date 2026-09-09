import { Prisma } from '@prisma/client';
import { OrderNumberService } from './order-number.service';

describe('OrderNumberService transaction contract', () => {
  it('uses one atomic upsert on the provided transaction, with Belgrade year', async () => {
    const query = jest.fn().mockResolvedValue([{ lastValue: 42 }]);
    const tx = { $queryRaw: query } as unknown as Prisma.TransactionClient;
    expect(await new OrderNumberService().next(tx, new Date('2026-12-31T23:30:00Z'))).toBe('CZ-2027-0042');
    expect(query.mock.calls[0][0].join('?')).toContain('ON CONFLICT ("year") DO UPDATE');
    expect(query.mock.calls[0][1]).toBe(2027);
    expect(query).toHaveBeenCalledTimes(1);
  });
  it('does not truncate numbers after 9999', async () => {
    const tx = { $queryRaw: jest.fn().mockResolvedValue([{ lastValue: 10000 }]) } as unknown as Prisma.TransactionClient;
    expect(await new OrderNumberService().next(tx, new Date('2026-09-08'))).toBe('CZ-2026-10000');
  });
});
