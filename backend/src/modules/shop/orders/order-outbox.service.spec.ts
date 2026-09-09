import { Prisma } from '@prisma/client';
import { OrderOutboxService } from './order-outbox.service';

describe('OrderOutboxService', () => {
  it.each([true, false])('enqueues once per kind on the caller transaction, customer email=%s', async (customerHasEmail) => {
    const createMany = jest.fn();
    const tx = { orderEmail: { createMany } } as unknown as Prisma.TransactionClient;
    await new OrderOutboxService().enqueue(tx, 'order', customerHasEmail);
    const options = createMany.mock.calls[0][0];
    expect(options.skipDuplicates).toBe(true);
    expect(options.data.map((item: { kind: string }) => item.kind)).toEqual(customerHasEmail ? ['CLUB', 'CUSTOMER'] : ['CLUB']);
    expect(options.data.every((item: { orderId: string }) => item.orderId === 'order')).toBe(true);
  });
});
