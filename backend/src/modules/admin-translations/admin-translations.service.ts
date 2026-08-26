import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  MANAGEMENT_TRANSLATION_FIELDS,
  NEWS_TRANSLATION_FIELDS,
  PLAYER_TRANSLATION_FIELDS,
  SPONSOR_CATEGORY_TRANSLATION_FIELDS,
  SPONSOR_TRANSLATION_FIELDS,
} from '../translation/translation-fields';
import { TranslationField, TranslationService } from '../translation/translation.service';
import {
  RegenerateMissingTranslationsDto,
  TranslationEntityType,
} from './dto/regenerate-missing-translations.dto';

type TranslationEntityConfig = {
  entityType: Exclude<TranslationEntityType, 'all'>;
  label: string;
  delegate: TranslationDelegate;
  fields: TranslationField[];
};

type TranslationDelegate = {
  count: (args: Record<string, unknown>) => Promise<number>;
  findMany: (args: Record<string, unknown>) => Promise<Record<string, unknown>[]>;
  update: (args: Record<string, unknown>) => Promise<unknown>;
};

type EntitySummary = {
  entityType: string;
  scanned: number;
  updated: number;
  skipped: number;
  failed: number;
  dryRun: boolean;
  details: Array<{
    id: string;
    status: 'updated' | 'skipped' | 'failed';
    updatedFields?: string[];
    errors?: string[];
  }>;
};

@Injectable()
export class AdminTranslationsService {
  private readonly logger = new Logger(AdminTranslationsService.name);
  private readonly batchSize = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly translationService: TranslationService,
  ) {}

  async regenerateMissing(dto: RegenerateMissingTranslationsDto) {
    this.logger.log(
      `Translation regeneration requested: entityType=${dto.entityType}, dryRun=${dto.dryRun ?? false}, limit=${dto.limit ?? 'none'}`,
    );

    const dryRun = dto.dryRun ?? false;
    const limit = dto.limit;
    const configs = this.resolveConfigs(dto.entityType);
    const details: EntitySummary[] = [];
    let remainingLimit = limit;

    for (const config of configs) {
      if (remainingLimit !== undefined && remainingLimit <= 0) {
        details.push(this.emptySummary(config.entityType, dryRun));
        continue;
      }

      const summary = await this.processEntity(config, dryRun, remainingLimit);
      details.push(summary);

      if (remainingLimit !== undefined) {
        remainingLimit -= summary.scanned;
      }
    }

    return {
      entityType: dto.entityType,
      scanned: details.reduce((total, detail) => total + detail.scanned, 0),
      updated: details.reduce((total, detail) => total + detail.updated, 0),
      skipped: details.reduce((total, detail) => total + detail.skipped, 0),
      failed: details.reduce((total, detail) => total + detail.failed, 0),
      dryRun,
      details,
    };
  }

  private async processEntity(
    config: TranslationEntityConfig,
    dryRun: boolean,
    limit?: number,
  ): Promise<EntitySummary> {
    const where = this.buildMissingTranslationsWhere(config.fields);

    if (dryRun) {
      const count = await config.delegate.count({ where });
      const scanned = limit === undefined ? count : Math.min(count, limit);

      return {
        entityType: config.entityType,
        scanned,
        updated: 0,
        skipped: scanned,
        failed: 0,
        dryRun,
        details: [],
      };
    }

    const summary = this.emptySummary(config.entityType, dryRun);
    let remaining = limit ?? Number.POSITIVE_INFINITY;
    const processedIds: string[] = [];

    while (remaining > 0) {
      const take = Math.min(this.batchSize, remaining);
      const records = await config.delegate.findMany({
        where: this.excludeProcessedIds(where, processedIds),
        select: this.buildRecordSelect(config.fields),
        orderBy: { createdAt: 'asc' },
        take,
      });

      if (records.length === 0) {
        break;
      }

      for (const record of records) {
        summary.scanned += 1;
        remaining -= 1;
        processedIds.push(String(record['id']));
        await this.processRecord(config, record, summary);

        if (remaining <= 0) {
          break;
        }
      }
    }

    return summary;
  }

  private async processRecord(
    config: TranslationEntityConfig,
    record: Record<string, unknown>,
    summary: EntitySummary,
  ) {
    const id = String(record['id']);
    const result = await this.translationService.translateMissingFieldsWithResult({
      entityName: config.label,
      source: record,
      current: record,
      fields: config.fields,
      targets: ['en', 'ru'],
    });
    const updatedFields = Object.keys(result.translations);

    if (updatedFields.length > 0) {
      try {
        await config.delegate.update({
          where: { id },
          data: result.translations,
        });
      } catch (error) {
        summary.failed += 1;
        summary.details.push({
          id,
          status: 'failed',
          updatedFields,
          errors: [`database update: ${this.formatError(error)}`],
        });
        return;
      }

      summary.updated += 1;
      if (result.errors.length > 0) {
        summary.failed += 1;
      }
      summary.details.push({
        id,
        status: 'updated',
        updatedFields,
        ...(result.errors.length
          ? { errors: result.errors.map((error) => `${error.target}: ${error.message}`) }
          : {}),
      });
      return;
    }

    if (result.errors.length > 0) {
      summary.failed += 1;
      summary.details.push({
        id,
        status: 'failed',
        errors: result.errors.map((error) => `${error.target}: ${error.message}`),
      });
      return;
    }

    summary.skipped += 1;
    summary.details.push({ id, status: 'skipped' });
  }

  private resolveConfigs(entityType: TranslationEntityType) {
    const configs = this.entityConfigs();

    if (entityType === 'all') {
      return configs;
    }

    return configs.filter((config) => config.entityType === entityType);
  }

  private entityConfigs(): TranslationEntityConfig[] {
    return [
      {
        entityType: 'news',
        label: 'news',
        delegate: this.prisma.news as unknown as TranslationDelegate,
        fields: NEWS_TRANSLATION_FIELDS,
      },
      {
        entityType: 'players',
        label: 'player',
        delegate: this.prisma.player as unknown as TranslationDelegate,
        fields: PLAYER_TRANSLATION_FIELDS,
      },
      {
        entityType: 'u19Players',
        label: 'u19 player',
        delegate: this.prisma.u19Player as unknown as TranslationDelegate,
        fields: PLAYER_TRANSLATION_FIELDS,
      },
      {
        entityType: 'management',
        label: 'management member',
        delegate: this.prisma.managementMember as unknown as TranslationDelegate,
        fields: MANAGEMENT_TRANSLATION_FIELDS,
      },
      {
        entityType: 'boardMembers',
        label: 'board member',
        delegate: this.prisma.boardMember as unknown as TranslationDelegate,
        fields: MANAGEMENT_TRANSLATION_FIELDS,
      },
      {
        entityType: 'sponsorCategories',
        label: 'sponsor category',
        delegate: this.prisma.sponsorCategory as unknown as TranslationDelegate,
        fields: SPONSOR_CATEGORY_TRANSLATION_FIELDS,
      },
      {
        entityType: 'sponsors',
        label: 'sponsor',
        delegate: this.prisma.sponsor as unknown as TranslationDelegate,
        fields: SPONSOR_TRANSLATION_FIELDS,
      },
    ];
  }

  private buildMissingTranslationsWhere(fields: TranslationField[]) {
    return {
      OR: fields.map((field) => ({
        AND: [
          ...this.buildSourceHasTextWhere(field),
          {
            OR: [{ [field.targetKey]: null }, { [field.targetKey]: '' }],
          },
        ],
      })),
    };
  }

  private buildSourceHasTextWhere(field: TranslationField) {
    const hasTextWhere: Record<string, unknown>[] = [{ [field.sourceKey]: { not: '' } }];

    if (field.sourceNullable) {
      hasTextWhere.unshift({ [field.sourceKey]: { not: null } });
    }

    return hasTextWhere;
  }

  private excludeProcessedIds(where: Record<string, unknown>, processedIds: string[]) {
    if (processedIds.length === 0) {
      return where;
    }

    return {
      AND: [where, { id: { notIn: processedIds } }],
    };
  }

  private buildRecordSelect(fields: TranslationField[]) {
    const select: Record<string, boolean> = {
      id: true,
      createdAt: true,
    };

    for (const field of fields) {
      select[field.sourceKey] = true;
      select[field.targetKey] = true;
    }

    return select;
  }

  private emptySummary(entityType: string, dryRun: boolean): EntitySummary {
    return {
      entityType,
      scanned: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      dryRun,
      details: [],
    };
  }

  private formatError(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}
