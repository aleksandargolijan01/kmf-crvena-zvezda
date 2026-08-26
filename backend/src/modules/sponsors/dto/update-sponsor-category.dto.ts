import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateSponsorCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name_sr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  name_en?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  name_ru?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description_sr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description_en?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description_ru?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
