import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateManagementMemberDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  fullName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  role_sr!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  role_en?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  role_ru?: string;

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
