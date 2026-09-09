import { Transform } from 'class-transformer';
import { ProductAvailability } from '@prisma/client';
import { IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const booleanQuery = ({ value }: { value: unknown }) => value === 'true' ? true : value === 'false' ? false : value;

export class ProductsQueryDto {
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) @Max(100000)
  page = 1;

  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) @Max(50)
  limit = 20;

  @IsOptional() @Transform(booleanQuery) @IsBoolean()
  featured?: boolean;

  @IsOptional() @IsEnum(ProductAvailability)
  availability?: ProductAvailability;

  @IsOptional() @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'asc';
}

export class AdminProductsQueryDto extends ProductsQueryDto {
  @IsOptional() @Transform(booleanQuery) @IsBoolean()
  active?: boolean;

  @IsOptional() @IsString() @MaxLength(120)
  search?: string;
}
