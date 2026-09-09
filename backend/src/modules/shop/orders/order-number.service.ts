import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrderNumberService {
  // Must be called with the SAME interactive transaction that inserts the order.
  async next(tx: Prisma.TransactionClient, at = new Date()): Promise<string> {
    const year = Number(new Intl.DateTimeFormat('en', {
      year: 'numeric', timeZone: 'Europe/Belgrade',
    }).format(at));
    const [counter] = await tx.$queryRaw<Array<{ lastValue: number }>>`
      INSERT INTO "OrderNumberCounter" ("year", "lastValue") VALUES (${year}, 1)
      ON CONFLICT ("year") DO UPDATE
      SET "lastValue" = "OrderNumberCounter"."lastValue" + 1
      RETURNING "lastValue"
    `;
    return `CZ-${year}-${String(counter.lastValue).padStart(4, '0')}`;
  }
}
