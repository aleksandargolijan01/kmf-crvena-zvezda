import { BadRequestException } from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';
import { CreateSponsorCategoryDto } from '../dto/create-sponsor-category.dto';
import { CreateSponsorDto } from '../dto/create-sponsor.dto';
import { UpdateSponsorCategoryDto } from '../dto/update-sponsor-category.dto';
import { UpdateSponsorDto } from '../dto/update-sponsor.dto';

type CategoryInput = CreateSponsorCategoryDto | UpdateSponsorCategoryDto;
type SponsorInput = CreateSponsorDto | UpdateSponsorDto;

export function sanitizeSponsorCategoryCreateInput(input: CreateSponsorCategoryDto) {
  const data = sanitizeSponsorCategoryInput(input);

  if (!data.name_sr) {
    throw new BadRequestException('Serbian category name is required.');
  }

  return data as CreateSponsorCategoryDto;
}

export function sanitizeSponsorCategoryUpdateInput(input: UpdateSponsorCategoryDto) {
  return sanitizeSponsorCategoryInput(input) as UpdateSponsorCategoryDto;
}

export function sanitizeSponsorCreateInput(input: CreateSponsorDto) {
  const data = sanitizeSponsorInput(input);

  if (!data.name) {
    throw new BadRequestException('Sponsor name is required.');
  }

  return data as CreateSponsorDto;
}

export function sanitizeSponsorUpdateInput(input: UpdateSponsorDto) {
  return sanitizeSponsorInput(input) as UpdateSponsorDto;
}

function sanitizeSponsorCategoryInput(input: CategoryInput) {
  return {
    name_sr: sanitizePlainText(input.name_sr),
    name_en: sanitizePlainText(input.name_en),
    name_ru: sanitizePlainText(input.name_ru),
    description_sr: sanitizeContent(input.description_sr),
    description_en: sanitizeContent(input.description_en),
    description_ru: sanitizeContent(input.description_ru),
    order: input.order,
    active: input.active,
  };
}

function sanitizeSponsorInput(input: SponsorInput) {
  return {
    name: sanitizePlainText(input.name),
    websiteUrl: sanitizePlainText(input.websiteUrl),
    logoId: input.logoId === null ? null : sanitizePlainText(input.logoId),
    logoUrl: sanitizePlainText(input.logoUrl),
    categoryId: input.categoryId === null ? null : sanitizePlainText(input.categoryId),
    description_sr: sanitizeContent(input.description_sr),
    description_en: sanitizeContent(input.description_en),
    description_ru: sanitizeContent(input.description_ru),
    featured: input.featured,
    active: input.active,
    order: input.order,
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

  const sanitized = sanitizeHtml(value, {
    allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
    allowedAttributes: {},
  }).trim();

  return sanitized || undefined;
}
