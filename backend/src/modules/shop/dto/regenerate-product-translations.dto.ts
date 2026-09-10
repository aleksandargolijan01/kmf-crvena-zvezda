import { IsBoolean, IsOptional } from 'class-validator';

export class RegenerateProductTranslationsDto {
  @IsOptional() @IsBoolean()
  force?: boolean;
}
