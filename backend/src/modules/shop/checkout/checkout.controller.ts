import { Body, Controller, Post, UseFilters, UseInterceptors } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ShopPricingService } from './shop-pricing.service';
import { ShopOrdersService } from '../orders/shop-orders.service';
import { SeasonTicketsService } from '../season-tickets/season-tickets.service';
import { CreateOrderDto, QuoteDto, ReceiptDto, RecoverOrderDto, TicketValidationDto } from './checkout.dto';
import { ShopExceptionFilter, ShopNoStoreInterceptor } from './shop-http';
@Controller('shop')
@UseFilters(ShopExceptionFilter)
@UseInterceptors(ShopNoStoreInterceptor)
export class CheckoutController {
  constructor(private readonly pricing: ShopPricingService, private readonly orders: ShopOrdersService, private readonly tickets: SeasonTicketsService) {}
  @Post('cart/quote') @Throttle({ default: { limit: 30, ttl: 60000 } })
  quote(@Body() dto: QuoteDto) { return this.pricing.quote(dto); }
  @Post('season-ticket/validate') @Throttle({ default: { limit: 5, ttl: 60000 } })
  validate(@Body() dto: TicketValidationDto) { return this.tickets.validate(dto); }
  @Post('orders') @Throttle({ default: { limit: 10, ttl: 60000 } })
  create(@Body() dto: CreateOrderDto) { return this.orders.create(dto); }
  @Post('orders/receipt') @Throttle({ default: { limit: 20, ttl: 60000 } })
  receipt(@Body() dto: ReceiptDto) { return this.orders.readReceipt(dto.receiptToken); }
  @Post('orders/recover') @Throttle({ default: { limit: 10, ttl: 60000 } })
  recover(@Body() dto: RecoverOrderDto) { return this.orders.recover(dto.idempotencyKey); }
}
