import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProductsController } from './products.controller';
import { AdminProductsController } from './admin-products.controller';
import { ProductsService } from './products.service';
import { OrderNumberService } from './orders/order-number.service';
import { OrderOutboxService } from './orders/order-outbox.service';
import { MailModule } from '../mail/mail.module';
import { ShopTokensService } from './checkout/shop-tokens.service';
import { ShopPricingService } from './checkout/shop-pricing.service';
import { SeasonTicketsService } from './season-tickets/season-tickets.service';
import { ShopOrdersService } from './orders/shop-orders.service';
import { OrderEmailWorkerService } from './orders/order-email-worker.service';
import { CheckoutController } from './checkout/checkout.controller';
import { AdminCheckoutController } from './checkout/admin-checkout.controller';

@Module({
  imports: [AuthModule, MailModule],
  controllers: [ProductsController, AdminProductsController, CheckoutController, AdminCheckoutController],
  providers: [ProductsService, OrderNumberService, OrderOutboxService, ShopTokensService, ShopPricingService, SeasonTicketsService, ShopOrdersService, OrderEmailWorkerService],
  exports: [OrderNumberService, OrderOutboxService],
})
export class ShopModule {}
