import sanitizeHtml from 'sanitize-html';
import { BadRequestException } from '@nestjs/common';
import { CreatePlayerDto } from '../dto/create-player.dto';
import { UpdatePlayerDto } from '../dto/update-player.dto';

type PlayerInput = CreatePlayerDto | UpdatePlayerDto;

export function sanitizePlayerCreateInput(input: CreatePlayerDto) {
  const data = sanitizePlayerInput(input);

  if (!data.firstName || !data.lastName) {
    throw new BadRequestException('First name and last name are required.');
  }

  return data as CreatePlayerDto;
}

export function sanitizePlayerUpdateInput(input: UpdatePlayerDto) {
  return sanitizePlayerInput(input) as UpdatePlayerDto;
}

function sanitizePlayerInput(input: PlayerInput) {
  return {
    firstName: sanitizePlainText(input.firstName),
    lastName: sanitizePlainText(input.lastName),
    position: sanitizePlainText(input.position),
    shirtNumber: input.shirtNumber,
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
