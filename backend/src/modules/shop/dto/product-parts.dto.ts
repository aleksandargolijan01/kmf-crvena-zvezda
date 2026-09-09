import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

export class ProductImageDto {
  @IsString() @MinLength(1) @MaxLength(100)
  mediaFileId!: string;

  @ValidateIf((_o, v) => v !== undefined) @IsInt() @Min(0) @Max(2147483647)
  displayOrder?: number;

  @IsOptional() @IsString() @MaxLength(250)
  altSr?: string | null;

  @IsOptional() @IsString() @MaxLength(250)
  altEn?: string | null;

  @IsOptional() @IsString() @MaxLength(250)
  altRu?: string | null;
}

export class ProductVariantDto {
  @ValidateIf((_o, v) => v !== undefined) @IsString() @MinLength(1) @MaxLength(100)
  id?: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim().normalize('NFKC').toUpperCase() : value)
  @IsString() @MinLength(1) @MaxLength(40)
  size!: string;

  @IsOptional() @IsString() @MaxLength(100)
  sku?: string | null;

  @ValidateIf((_o, v) => v !== undefined) @IsBoolean()
  active?: boolean;

  @ValidateIf((_o, v) => v !== undefined) @IsBoolean()
  available?: boolean;

  @ValidateIf((_o, v) => v !== undefined) @IsInt() @Min(0) @Max(2147483647)
  displayOrder?: number;

  @IsOptional() @IsInt() @Min(0) @Max(2147483647)
  stockQuantity?: number | null;
}
