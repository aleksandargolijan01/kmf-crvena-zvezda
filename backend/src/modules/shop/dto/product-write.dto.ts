import { Type, Transform } from 'class-transformer';
import { ProductAvailability } from '@prisma/client';
import { IsOptional, IsString, MaxLength, MinLength, Matches, IsInt, Min, Max, IsBoolean, IsEnum, IsISO8601, IsArray, ArrayMaxSize, ValidateNested, ValidateIf } from 'class-validator';
import { ProductImageDto, ProductVariantDto } from './product-parts.dto';

class ProductOptionalFieldsDto {
  @IsOptional() @IsString() @MaxLength(180)
  nameEn?: string | null;

  @IsOptional() @IsString() @MaxLength(180)
  nameRu?: string | null;

  @IsOptional() @IsString() @MaxLength(20000)
  descriptionEn?: string | null;

  @IsOptional() @IsString() @MaxLength(20000)
  descriptionRu?: string | null;

  @ValidateIf((_o, v) => v !== undefined) @IsString() @MaxLength(180) @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @IsOptional() @IsInt() @Min(0) @Max(2147483647)
  compareAtPriceMinor?: number | null;

  @ValidateIf((_o, v) => v !== undefined) @IsBoolean()
  active?: boolean;

  @ValidateIf((_o, v) => v !== undefined) @IsBoolean()
  featured?: boolean;

  @IsOptional() @IsInt() @Min(0) @Max(2147483647)
  featuredOrder?: number | null;

  @ValidateIf((_o, v) => v !== undefined) @IsInt() @Min(0) @Max(2147483647)
  displayOrder?: number;

  @ValidateIf((_o, v) => v !== undefined) @IsEnum(ProductAvailability)
  availability?: ProductAvailability;

  @IsOptional() @IsISO8601({ strict: true })
  newUntil?: string | null;

  @IsOptional() @IsString() @MinLength(1) @MaxLength(100)
  coverImageId?: string | null;

  @ValidateIf((_o, v) => v !== undefined) @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => ProductImageDto)
  gallery?: ProductImageDto[];

  @ValidateIf((_o, v) => v !== undefined) @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];
}

export class CreateProductDto extends ProductOptionalFieldsDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(2) @MaxLength(180)
  nameSr!: string;

  @IsString() @MinLength(1) @MaxLength(20000)
  descriptionSr!: string;

  @IsInt() @Min(0) @Max(2147483647)
  priceMinor!: number;
}

export class UpdateProductDto extends ProductOptionalFieldsDto {
  @ValidateIf((_o, v) => v !== undefined)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(2) @MaxLength(180)
  nameSr?: string;

  @ValidateIf((_o, v) => v !== undefined)
  @IsString() @MinLength(1) @MaxLength(20000)
  descriptionSr?: string;

  @ValidateIf((_o, v) => v !== undefined)
  @IsInt() @Min(0) @Max(2147483647)
  priceMinor?: number;
}

