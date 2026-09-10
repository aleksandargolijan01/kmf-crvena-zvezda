import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ProductsService } from './products.service';
import { AdminProductsQueryDto } from './dto/products-query.dto';
import { CreateProductDto, UpdateProductDto } from './dto/product-write.dto';
import { RegenerateProductTranslationsDto } from './dto/regenerate-product-translations.dto';

@Controller('admin/shop/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class AdminProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(@Query() query: AdminProductsQueryDto) { return this.products.findAdmin(query); }

  @Get(':id')
  detail(@Param('id') id: string) { return this.products.findAdminById(id); }

  @Post()
  create(@Body() dto: CreateProductDto) { return this.products.create(dto); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) { return this.products.update(id, dto); }

  @Post(':id/translations/regenerate')
  regenerate(@Param('id') id: string, @Body() dto: RegenerateProductTranslationsDto) {
    return this.products.regenerateTranslations(id, dto.force);
  }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.products.remove(id); }
}
