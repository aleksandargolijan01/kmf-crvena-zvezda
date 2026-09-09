import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../database/prisma.service';
import { MailService } from '../../mail/mail.service';
import { orderEmailText } from './order-email.template';

@Injectable()
export class OrderEmailWorkerService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private readonly logger = new Logger(OrderEmailWorkerService.name);
  constructor(private readonly db: PrismaService, private readonly config: ConfigService, private readonly mail: MailService) {}
  onModuleInit() {
    if (String(this.config.get('SHOP_EMAIL_WORKER_ENABLED', false)) !== 'true') return;
    this.timer = setInterval(() => { void this.tick(); }, 5000);
    this.timer.unref();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const lockToken = randomUUID();
      const rows = await this.db.$queryRaw<Array<{ id: string }>>`
        UPDATE "OrderEmail" SET "status" = 'PROCESSING', "lockedAt" = NOW(), "lockToken" = ${lockToken}, "attempts" = "attempts" + 1, "updatedAt" = NOW()
        WHERE "id" = (
          SELECT "id" FROM "OrderEmail"
          WHERE ("status" = 'PENDING' AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= NOW()))
             OR ("status" = 'PROCESSING' AND ("lockedAt" IS NULL OR "lockedAt" < NOW() - INTERVAL '5 minutes'))
          ORDER BY "createdAt", "id" FOR UPDATE SKIP LOCKED LIMIT 1
        ) RETURNING "id"
      `;
      if (!rows.length) return;
      const email = await this.db.orderEmail.findUnique({ where: { id: rows[0].id }, include: { order: { include: { items: true } } } });
      if (!email || email.lockToken !== lockToken) return;
      const where = { id: email.id, lockToken, status: 'PROCESSING' as const };
      try {
        if (email.attempts > 5) throw new Error('Retry limit');
        const club = email.kind === 'CLUB';
        const to = club ? this.config.get<string>('SHOP_ORDER_RECIPIENT_EMAIL') : email.order.email;
        const from = this.config.get<string>('SHOP_ORDER_FROM_EMAIL') || this.config.get<string>('SPONSOR_INQUIRY_FROM_EMAIL') || this.config.get<string>('SMTP_USER');
        if (!to || !from || /[\r\n]/.test(to + from) || !this.config.get('SMTP_HOST') || !this.config.get('SMTP_USER') || !this.config.get('SMTP_PASS')) throw new Error('Mail is not configured');
        await this.mail.send({ to, from, subject: `${club ? 'Нова поруџбина' : 'Потврда поруџбине'} — ${email.order.orderNumber}`, text: orderEmailText(email.order, club), messageId: `<shop-${email.id}@orders.invalid>` });
        await this.db.orderEmail.updateMany({ where, data: { status: 'SENT', sentAt: new Date(), lockedAt: null, lockToken: null, lastError: null, nextAttemptAt: null } });
      } catch {
        await this.db.orderEmail.updateMany({ where, data: { status: email.attempts >= 5 ? 'FAILED' : 'PENDING', lastError: 'Слање није успело. Проверите подешавања и поновите слање.', nextAttemptAt: email.attempts >= 5 ? null : new Date(Date.now() + Math.min(3600000, 30000 * 2 ** (email.attempts - 1))), lockedAt: null, lockToken: null } });
      }
    } catch { this.logger.error('Order email processing failed; details omitted to protect customer data.'); }
    finally { this.running = false; }
  }
}
