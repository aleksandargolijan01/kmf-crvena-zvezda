import { BadRequestException } from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';
import { CreateNewsDto } from '../dto/create-news.dto';
import { UpdateNewsDto } from '../dto/update-news.dto';

const contentSanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a'],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: {
    a: ['http', 'https', 'mailto'],
  },
  allowProtocolRelative: false,
  transformTags: {
    a: sanitizeHtml.simpleTransform(
      'a',
      { target: '_blank', rel: 'noopener noreferrer' },
      true,
    ),
  },
};

type NewsInput = CreateNewsDto | UpdateNewsDto;

export function sanitizeNewsCreateInput(input: CreateNewsDto) {
  const data = sanitizeNewsInput(input);

  if (!data.title_sr) {
    throw new BadRequestException('Serbian title is required.');
  }

  if (!data.content_sr) {
    throw new BadRequestException('Serbian content is required.');
  }

  return data as CreateNewsDto;
}

export function sanitizeNewsUpdateInput(input: UpdateNewsDto) {
  return sanitizeNewsInput(input) as UpdateNewsDto;
}

function sanitizeNewsInput<T extends NewsInput>(input: T) {
  return {
    title_sr: sanitizePlainText(input.title_sr),
    title_en: sanitizePlainText(input.title_en),
    title_ru: sanitizePlainText(input.title_ru),
    excerpt_sr: sanitizePlainText(input.excerpt_sr),
    excerpt_en: sanitizePlainText(input.excerpt_en),
    excerpt_ru: sanitizePlainText(input.excerpt_ru),
    content_sr: sanitizeContent(input.content_sr),
    content_en: sanitizeContent(input.content_en),
    content_ru: sanitizeContent(input.content_ru),
    coverImage: sanitizePlainText(input.coverImage),
    coverImageId: sanitizePlainText(input.coverImageId),
    published: input.published,
    featured: input.featured,
  };
}

function sanitizePlainText(value?: string) {
  if (value === undefined) {
    return undefined;
  }

  const sanitized = sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
  return sanitized || undefined;
}

function sanitizeContent(value?: string) {
  if (value === undefined) {
    return undefined;
  }

  const sanitized = sanitizeHtml(value, contentSanitizeOptions).trim();
  return sanitized || undefined;
}
