import sanitizeHtml from 'sanitize-html';
import { SubscribeNewsletterDto } from '../dto/subscribe-newsletter.dto';
import { UpdateNewsletterSubscriberDto } from '../dto/update-newsletter-subscriber.dto';

export function sanitizeSubscribeInput(input: SubscribeNewsletterDto) {
  return {
    email: sanitizePlainText(input.email) ?? '',
    firstName: sanitizePlainText(input.firstName),
    lastName: sanitizePlainText(input.lastName),
    phone: sanitizePlainText(input.phone),
    source: sanitizePlainText(input.source),
    consent: input.consent,
    website: sanitizePlainText(input.website),
  };
}

export function sanitizeUpdateSubscriberInput(input: UpdateNewsletterSubscriberDto) {
  return {
    email: sanitizePlainText(input.email),
    firstName: sanitizePlainText(input.firstName),
    lastName: sanitizePlainText(input.lastName),
    phone: sanitizePlainText(input.phone),
    source: sanitizePlainText(input.source),
    isActive: input.isActive,
  };
}

function sanitizePlainText(value?: string) {
  if (value === undefined) {
    return undefined;
  }

  const sanitized = sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
  return sanitized || undefined;
}
