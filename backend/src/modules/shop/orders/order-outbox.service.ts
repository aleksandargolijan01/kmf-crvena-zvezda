import { Injectable } from '@nestjs/common';
import { OrderEmailKind, Prisma } from '@prisma/client';

@Injectable()
export class OrderOutboxService {
  // Future order service calls this inside its order transaction. No SMTP here.
  enqueue(tx: Prisma.TransactionClient, orderId: string, customerHasEmail: boolean) {
    const kinds: OrderEmailKind[] = [OrderEmailKind.CLUB];
    if (customerHasEmail) kinds.push(OrderEmailKind.CUSTOMER);
    return tx.orderEmail.createMany({
      data: kinds.map((kind) => ({ orderId, kind, nextAttemptAt: new Date() })),
      skipDuplicates: true,
    });
  }
}
