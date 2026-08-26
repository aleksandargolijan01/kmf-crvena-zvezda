import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdatePlayerDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  position?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  shirtNumber?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  bio_sr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  bio_en?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  bio_ru?: string;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  imageId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;
}
