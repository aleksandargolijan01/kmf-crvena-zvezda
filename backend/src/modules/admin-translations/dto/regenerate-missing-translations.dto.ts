import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export const translationEntityTypes = [
  'news',
  'players',
  'u19Players',
  'management',
  'boardMembers',
  'sponsorCategories',
  'sponsors',
  'all',
] as const;

export type TranslationEntityType = (typeof translationEntityTypes)[number];

export class RegenerateMissingTranslationsDto {
  @IsIn(translationEntityTypes)
  entityType!: TranslationEntityType;

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
