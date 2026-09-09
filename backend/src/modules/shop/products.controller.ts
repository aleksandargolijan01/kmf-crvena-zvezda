import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsQueryDto } from './dto/products-query.dto';

@Controller('shop/products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(@Query() query: ProductsQueryDto) { return this.products.findPublic(query); }

  @Get(':slug')
  detail(@Param('slug') slug: string) { return this.products.findPublicBySlug(slug); }
}
