import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateNewsDto {
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  title_sr!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  title_en?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  title_ru?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt_sr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt_en?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt_ru?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(20000)
  content_sr!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  content_en?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  content_ru?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  coverImage?: string;

  @IsOptional()
  @IsString()
  coverImageId?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;
}
