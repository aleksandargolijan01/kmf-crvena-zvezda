import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { NewsletterSubscribersQueryDto } from './dto/newsletter-subscribers-query.dto';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';
import { UpdateNewsletterSubscriberDto } from './dto/update-newsletter-subscriber.dto';
import { NewsletterService } from './newsletter.service';

@Controller()
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post('newsletter/subscribe')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  subscribe(@Body() dto: SubscribeNewsletterDto) {
    return this.newsletterService.subscribe(dto);
  }

  @Get('newsletter/unsubscribe/:token')
  unsubscribe(@Param('token') token: string) {
    return this.newsletterService.unsubscribe(token);
  }

  @Get('admin/newsletter/subscribers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  findSubscribers(@Query() query: NewsletterSubscribersQueryDto) {
    return this.newsletterService.findSubscribers(query);
  }

  @Patch('admin/newsletter/subscribers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  updateSubscriber(@Param('id') id: string, @Body() dto: UpdateNewsletterSubscriberDto) {
    return this.newsletterService.updateSubscriber(id, dto);
  }

  @Delete('admin/newsletter/subscribers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  removeSubscriber(@Param('id') id: string) {
    return this.newsletterService.removeSubscriber(id);
  }
}
