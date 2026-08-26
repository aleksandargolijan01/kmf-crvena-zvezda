import { BadRequestException } from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';
import { CreateManagementMemberDto } from '../dto/create-management-member.dto';
import { UpdateManagementMemberDto } from '../dto/update-management-member.dto';

type ManagementInput = CreateManagementMemberDto | UpdateManagementMemberDto;

export function sanitizeManagementCreateInput(input: CreateManagementMemberDto) {
  const data = sanitizeManagementInput(input);

  if (!data.fullName || !data.role_sr) {
    throw new BadRequestException('Full name and Serbian role are required.');
  }

  return data as CreateManagementMemberDto;
}

export function sanitizeManagementUpdateInput(input: UpdateManagementMemberDto) {
  return sanitizeManagementInput(input) as UpdateManagementMemberDto;
}

function sanitizeManagementInput(input: ManagementInput) {
  return {
    fullName: sanitizePlainText(input.fullName),
    role_sr: sanitizePlainText(input.role_sr),
    role_en: sanitizePlainText(input.role_en),
    role_ru: sanitizePlainText(input.role_ru),
    bio_sr: sanitizeContent(input.bio_sr),
    bio_en: sanitizeContent(input.bio_en),
    bio_ru: sanitizeContent(input.bio_ru),
    imageId: input.imageId === null ? null : sanitizePlainText(input.imageId),
    imageUrl: sanitizePlainText(input.imageUrl),
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
