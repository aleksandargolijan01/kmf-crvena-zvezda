import { Type, Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEmail, IsEnum, IsISO8601, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf, ValidateNested } from 'class-validator';
import { OrderSource, OrderStatus } from '@prisma/client';
import { IsDefined } from 'class-validator';
const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
export class CartLineDto {
  @IsString() @Matches(/^[a-zA-Z0-9_-]{1,100}$/) variantId!: string;
  @IsInt() @Min(1) @Max(99) quantity!: number;
}
export class QuoteDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => CartLineDto) items!: CartLineDto[];
  @ValidateIf((_o, value) => value !== undefined) @IsString() @MinLength(1) @MaxLength(3000) seasonTicketToken?: string;
}
export class CustomerDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(100) firstName!: string;
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(100) lastName!: string;
  @Transform(trim) @IsString() @Matches(/^(?=(?:\D*\d){7})\+?[0-9 ()-]{7,25}$/) phone!: string;
  @Transform(trim) @IsEmail() @MaxLength(254) email!: string;
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(250) address!: string;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(100) city!: string;
  @IsString() @Matches(/^\d{5}$/) postalCode!: string;
  @IsOptional() @IsString() @MaxLength(2000) note?: string;
}
export class CreateOrderDto extends QuoteDto {
  @IsDefined() @ValidateNested() @Type(() => CustomerDto) customer!: CustomerDto;
  @IsString() @MinLength(1) @MaxLength(4000) quoteToken!: string;
  @IsString() @Matches(/^[a-zA-Z0-9_-]{32,128}$/) idempotencyKey!: string;
}
export class ManualOrderDto extends CreateOrderDto {
  @IsIn(['INSTAGRAM', 'PHONE', 'IN_PERSON', 'ADMIN']) source!: OrderSource;
}
export class TicketValidationDto {
  // Strict end-of-input: unlike $, this also rejects a trailing line break.
  @IsString() @Matches(/^[0-9]+(?![\s\S])/) @MaxLength(100) cardNumber!: string;
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(200) fullName!: string;
}
export class ReceiptDto { @IsString() @MinLength(1) @MaxLength(3000) receiptToken!: string; }
export class RecoverOrderDto { @IsString() @Matches(/^[a-zA-Z0-9_-]{32,128}$/) idempotencyKey!: string; }
export class OrderStatusDto { @IsEnum(OrderStatus) status!: OrderStatus; }
export class ShopListDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 20;
  @IsOptional() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
}
export class TicketWriteDto {
  @IsString() @Matches(/^[0-9]+(?![\s\S])/) @MaxLength(100) cardNumber!: string;
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(200) fullName!: string;
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(80) seasonKey!: string;
  @IsBoolean() active!: boolean;
  @IsOptional() @IsISO8601({ strict: true }) validFrom?: string | null;
  @IsOptional() @IsISO8601({ strict: true }) validUntil?: string | null;
}
