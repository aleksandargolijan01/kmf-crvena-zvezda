import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ShopOrdersService } from '../orders/shop-orders.service';
import { SeasonTicketsService } from '../season-tickets/season-tickets.service';
import { ManualOrderDto, OrderStatusDto, ShopDeleteParamsDto, ShopListDto, TicketWriteDto } from './checkout.dto';
import { ShopExceptionFilter, ShopNoStoreInterceptor } from './shop-http';
@Controller('admin/shop')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@UseFilters(ShopExceptionFilter)
@UseInterceptors(ShopNoStoreInterceptor)
export class AdminCheckoutController {
  constructor(private readonly orders: ShopOrdersService, private readonly tickets: SeasonTicketsService) {}
  @Get('orders') list(@Query() dto: ShopListDto) { return this.orders.list(dto); }
  @Delete('orders/:id') removeOrder(@Param() params: ShopDeleteParamsDto) { return this.orders.remove(params.id); }
  @Delete('season-tickets/:id') removeTicket(@Param() params: ShopDeleteParamsDto) { return this.tickets.remove(params.id); }
  @Get('orders/:id') detail(@Param('id') id: string) { return this.orders.detail(id); }
  @Post('orders') create(@Body() dto: ManualOrderDto, @Req() req: Request & { user: { id: string } }) { return this.orders.create(dto, dto.source, req.user.id); }
  @Patch('orders/:id/status') status(@Param('id') id: string, @Body() dto: OrderStatusDto, @Req() req: Request & { user: { id: string } }) { return this.orders.status(id, dto.status, req.user.id); }
  @Post('orders/:id/emails/:emailId/retry') retry(@Param('id') id: string, @Param('emailId') emailId: string) { return this.orders.retryEmail(id, emailId); }
  @Get('season-tickets') listTickets(@Query() dto: ShopListDto) { return this.tickets.list(dto); }
  @Post('season-tickets') createTicket(@Body() dto: TicketWriteDto) { return this.tickets.write(dto); }
  @Patch('season-tickets/:id') updateTicket(@Param('id') id: string, @Body() dto: TicketWriteDto) { return this.tickets.write(dto, id); }
}
