import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSponsorInquiryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(140)
  companyName!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(160)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  sponsorshipPackage?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(3000)
  message!: string;

  @IsBoolean()
  consent!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
