import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateSponsorDto {
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  name!: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(1000)
  websiteUrl?: string;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  logoId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  logoUrl?: string;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description_sr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description_en?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description_ru?: string;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;
}
