import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

type TargetLanguage = 'en' | 'ru';

export interface TranslationField {
  sourceKey: string;
  targetKey: string;
  label: string;
  maxLength?: number;
  preserveHtml?: boolean;
  sourceNullable?: boolean;
}

interface TranslateMissingFieldsOptions {
  entityName: string;
  source: Record<string, unknown>;
  current?: Record<string, unknown>;
  fields: TranslationField[];
  targets: TargetLanguage[];
}

export interface TranslationError {
  target: TargetLanguage;
  message: string;
}

export interface TranslationResult {
  translations: Record<string, string>;
  errors: TranslationError[];
}

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);
  private readonly client?: OpenAI;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.model = this.configService.get<string>('OPENAI_TRANSLATION_MODEL', 'gpt-4.1-mini');

    if (apiKey) {
      this.client = new OpenAI({
        apiKey,
        timeout: 30_000,
        maxRetries: 1,
      });
    }
  }

  async translateMissingFields(
    options: TranslateMissingFieldsOptions,
  ): Promise<Record<string, string>> {
    const result = await this.translateMissingFieldsWithResult(options);
    return result.translations;
  }

  async translateMissingFieldsWithResult(
    options: TranslateMissingFieldsOptions,
  ): Promise<TranslationResult> {
    const fieldsByTarget = Object.fromEntries(
      options.targets.map((target) => [
        target,
        options.fields.filter(
          (field) =>
            field.targetKey.endsWith(`_${target}`) &&
            this.shouldTranslateField(options.source, options.current, field),
        ),
      ]),
    ) as Record<TargetLanguage, TranslationField[]>;

    if (Object.values(fieldsByTarget).every((fields) => fields.length === 0)) {
      return { translations: {}, errors: [] };
    }

    if (!this.client) {
      const exception = new ServiceUnavailableException(
        'OpenAI translation service is not configured.',
      );
      const errors = options.targets
        .filter((target) => fieldsByTarget[target].length > 0)
        .map((target) => ({
          target,
          message: exception.message,
        }));

      this.logger.warn(`${exception.message} Missing OPENAI_API_KEY.`);
      return { translations: {}, errors };
    }

    const translations: Record<string, string> = {};
    const errors: TranslationError[] = [];

    for (const target of options.targets) {
      const fieldsToTranslate = fieldsByTarget[target];

      if (fieldsToTranslate.length === 0) {
        continue;
      }

      try {
        const translated = await this.translateFields(target, fieldsToTranslate, options.source);
        Object.assign(translations, translated);
      } catch (error) {
        const exception = this.toOpenAiException(error);
        this.logOpenAiError(options.entityName, target, error, exception);
        errors.push({ target, message: exception.message });
      }
    }

    return { translations, errors };
  }

  private shouldTranslateField(
    source: Record<string, unknown>,
    current: Record<string, unknown> | undefined,
    field: TranslationField,
  ) {
    return (
      this.hasText(source[field.sourceKey]) &&
      !this.hasText(source[field.targetKey]) &&
      !this.hasText(current?.[field.targetKey])
    );
  }

  private async translateFields(
    target: TargetLanguage,
    fields: TranslationField[],
    source: Record<string, unknown>,
  ): Promise<Record<string, string>> {
    const response = await this.client!.responses.create({
      model: this.model,
      instructions: this.buildInstructions(target, fields),
      input: JSON.stringify(
        Object.fromEntries(fields.map((field) => [field.targetKey, source[field.sourceKey]])),
      ),
    });

    const parsed = this.parseJsonObject(response.output_text);

    return Object.fromEntries(
      fields
        .map((field) => [
          field.targetKey,
          this.normalizeTranslation(parsed[field.targetKey], field),
        ])
        .filter(([, value]) => value !== undefined),
    ) as Record<string, string>;
  }

  private buildInstructions(target: TargetLanguage, fields: TranslationField[]) {
    const languageName = target === 'en' ? 'English' : 'Russian';
    const style =
      target === 'en'
        ? 'natural, polished professional sports website English'
        : 'natural Russian written for a professional sports website; use real Russian, not Serbian Cyrillic';

    return [
      `Translate Serbian sports website content into ${languageName}.`,
      `Use ${style}.`,
      'Return only a valid JSON object with exactly the same keys as the input.',
      'Do not add Markdown, comments, explanations, or extra keys.',
      'Preserve names, club names, dates, scores, URLs, and factual details.',
      'For HTML fields, preserve the existing safe HTML structure and translate only human-readable text.',
      'Keep title and excerpt translations concise and suitable for a sports news CMS.',
      `Field constraints: ${fields
        .map(
          (field) =>
            `${field.targetKey} (${field.label}${field.maxLength ? `, max ${field.maxLength} characters` : ''}${
              field.preserveHtml ? ', preserve HTML' : ''
            })`,
        )
        .join('; ')}.`,
    ].join('\n');
  }

  private parseJsonObject(value: string) {
    try {
      const trimmed = value.trim();
      const jsonText = trimmed.match(/\{[\s\S]*\}/)?.[0] ?? trimmed;
      const parsed: unknown = JSON.parse(jsonText);

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new BadGatewayException('OpenAI translation service returned an invalid response.');
      }

      return parsed as Record<string, unknown>;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new BadGatewayException('OpenAI translation service returned an invalid response.', {
        cause: error,
      });
    }
  }

  private normalizeTranslation(value: unknown, field: TranslationField) {
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();

    if (!trimmed) {
      return undefined;
    }

    return field.maxLength ? trimmed.slice(0, field.maxLength) : trimmed;
  }

  private hasText(value: unknown) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  private toOpenAiException(error: unknown): HttpException {
    if (error instanceof HttpException) {
      return error;
    }

    if (error instanceof OpenAI.APIConnectionTimeoutError) {
      return new GatewayTimeoutException('OpenAI translation request timed out.', {
        cause: error,
      });
    }

    if (
      error instanceof OpenAI.AuthenticationError ||
      error instanceof OpenAI.PermissionDeniedError
    ) {
      return new ServiceUnavailableException(
        'OpenAI translation service is not configured correctly.',
        { cause: error },
      );
    }

    if (error instanceof OpenAI.RateLimitError) {
      return new ServiceUnavailableException(
        'OpenAI translation service is temporarily unavailable.',
        { cause: error },
      );
    }

    if (error instanceof OpenAI.APIConnectionError || error instanceof OpenAI.InternalServerError) {
      return new BadGatewayException('OpenAI translation service is unavailable.', {
        cause: error,
      });
    }

    if (error instanceof OpenAI.APIError) {
      return new BadGatewayException('OpenAI translation request failed.', {
        cause: error,
      });
    }

    return new BadGatewayException('OpenAI translation request failed.', {
      cause: error,
    });
  }

  private logOpenAiError(
    entityName: string,
    target: TargetLanguage,
    error: unknown,
    exception: HttpException,
  ) {
    const providerContext =
      error instanceof OpenAI.APIError
        ? `status=${error.status ?? 'unknown'}, code=${error.code ?? 'unknown'}, requestId=${error.requestID ?? 'unknown'}`
        : error instanceof Error
          ? error.message
          : String(error);

    this.logger.error(
      `OpenAI translation failed for ${entityName} (${target}): ${exception.message} ${providerContext}`,
      error instanceof Error ? error.stack : undefined,
    );
  }
}
