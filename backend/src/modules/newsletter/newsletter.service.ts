import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { buildPaginatedResponse } from '../../common/pagination';
import { PrismaService } from '../../database/prisma.service';
import { NewsletterSubscribersQueryDto } from './dto/newsletter-subscribers-query.dto';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';
import { UpdateNewsletterSubscriberDto } from './dto/update-newsletter-subscriber.dto';
import {
  sanitizeSubscribeInput,
  sanitizeUpdateSubscriberInput,
} from './utils/newsletter-sanitizer';

@Injectable()
export class NewsletterService {
  private readonly subscriberSelect = {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    phone: true,
    source: true,
    consent: true,
    isActive: true,
    consentGivenAt: true,
    unsubscribedAt: true,
    createdAt: true,
    updatedAt: true,
  } satisfies Prisma.NewsletterSubscriberSelect;

  constructor(private readonly prisma: PrismaService) {}

  async subscribe(dto: SubscribeNewsletterDto) {
    const data = sanitizeSubscribeInput(dto);

    if (data.website) {
      return this.publicSubscribeResponse();
    }

    if (!data.consent) {
      throw new BadRequestException('Consent is required.');
    }

    const email = data.email.toLowerCase().trim();
    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (existing?.isActive) {
      return this.publicSubscribeResponse('already_subscribed');
    }

    if (existing) {
      await this.prisma.newsletterSubscriber.update({
        where: { id: existing.id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          source: data.source,
          consent: true,
          isActive: true,
          consentGivenAt: new Date(),
          unsubscribedAt: null,
          unsubscribeToken: await this.createUniqueUnsubscribeToken(),
        },
      });

      return this.publicSubscribeResponse('subscribed');
    }

    try {
      await this.prisma.newsletterSubscriber.create({
        data: {
          email,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          source: data.source,
          consent: true,
          isActive: true,
          consentGivenAt: new Date(),
          unsubscribeToken: await this.createUniqueUnsubscribeToken(),
        },
      });
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }
    }

    return this.publicSubscribeResponse('subscribed');
  }

  async unsubscribe(token: string) {
    if (!this.isValidUnsubscribeToken(token)) {
      throw new NotFoundException('Newsletter subscription not found.');
    }

    const subscriber = await this.prisma.newsletterSubscriber.findUnique({
      where: { unsubscribeToken: token },
      select: { id: true },
    });

    if (!subscriber) {
      throw new NotFoundException('Newsletter subscription not found.');
    }

    await this.prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: {
        isActive: false,
        unsubscribedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'You have been unsubscribed from the newsletter.',
    };
  }

  async findSubscribers(query: NewsletterSubscribersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildWhere(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.newsletterSubscriber.findMany({
        where,
        select: this.subscriberSelect,
        orderBy: { createdAt: query.order ?? 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.newsletterSubscriber.count({ where }),
    ]);

    return buildPaginatedResponse(items, total, page, limit);
  }

  async updateSubscriber(id: string, dto: UpdateNewsletterSubscriberDto) {
    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Newsletter subscriber not found.');
    }

    const data = sanitizeUpdateSubscriberInput(dto);

    try {
      return await this.prisma.newsletterSubscriber.update({
        where: { id },
        data: {
          ...data,
          ...(data.email ? { email: data.email.toLowerCase().trim() } : {}),
        },
        select: this.subscriberSelect,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Newsletter subscriber email already exists.');
      }

      throw error;
    }
  }

  async removeSubscriber(id: string) {
    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Newsletter subscriber not found.');
    }

    await this.prisma.newsletterSubscriber.delete({ where: { id } });

    return { success: true };
  }

  private buildWhere(query: NewsletterSubscribersQueryDto): Prisma.NewsletterSubscriberWhereInput {
    const search = query.search?.trim();

    return {
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.source ? { source: { equals: query.source, mode: 'insensitive' } } : {}),
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  private publicSubscribeResponse(status: 'subscribed' | 'already_subscribed' = 'subscribed') {
    return {
      success: true,
      status,
      message: 'If this email is eligible, it is subscribed to the newsletter.',
    };
  }

  private async createUniqueUnsubscribeToken() {
    while (true) {
      const token = randomBytes(32).toString('hex');
      const existing = await this.prisma.newsletterSubscriber.findUnique({
        where: { unsubscribeToken: token },
        select: { id: true },
      });

      if (!existing) {
        return token;
      }
    }
  }

  private isValidUnsubscribeToken(token: string) {
    return /^[a-f0-9]{64}$/i.test(token);
  }

  private isUniqueConstraintError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
