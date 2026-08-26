import { BadRequestException } from '@nestjs/common';
import { StaffTeamType } from '@prisma/client';
import sanitizeHtml from 'sanitize-html';
import { CreateStaffMemberDto } from '../dto/create-staff-member.dto';
import { UpdateStaffMemberDto } from '../dto/update-staff-member.dto';

type StaffInput = CreateStaffMemberDto | UpdateStaffMemberDto;

export function sanitizeStaffCreateInput(input: CreateStaffMemberDto) {
  const data = sanitizeStaffInput(input);

  if (!data.fullName || !data.role_sr || !data.teamType) {
    throw new BadRequestException('Full name, Serbian role and team type are required.');
  }

  return data as CreateStaffMemberDto;
}

export function sanitizeStaffUpdateInput(input: UpdateStaffMemberDto) {
  return sanitizeStaffInput(input) as UpdateStaffMemberDto;
}

function sanitizeStaffInput(input: StaffInput) {
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
    teamType: sanitizeTeamType(input.teamType),
    active: input.active,
    order: input.order,
  };
}

function sanitizeTeamType(value?: StaffTeamType) {
  return value === StaffTeamType.FIRST_TEAM || value === StaffTeamType.U19_TEAM ? value : undefined;
}

function sanitizePlainText(value?: string | null) {
  if (value === undefined || value === null) {
    return value === null ? null : undefined;
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
