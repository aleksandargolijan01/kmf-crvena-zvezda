import sanitizeHtml from 'sanitize-html';
import { CreateSponsorInquiryDto } from '../dto/create-sponsor-inquiry.dto';

export interface SanitizedSponsorInquiry {
  fullName: string;
  companyName: string;
  email: string;
  phone?: string;
  sponsorshipPackage?: string;
  message: string;
  consent: boolean;
  website?: string;
}

export function sanitizeSponsorInquiryInput(input: CreateSponsorInquiryDto): SanitizedSponsorInquiry {
  return {
    fullName: sanitizePlainText(input.fullName) ?? '',
    companyName: sanitizePlainText(input.companyName) ?? '',
    email: sanitizePlainText(input.email)?.toLowerCase() ?? '',
    phone: sanitizePlainText(input.phone),
    sponsorshipPackage: sanitizePlainText(input.sponsorshipPackage),
    message: sanitizeMessage(input.message) ?? '',
    consent: input.consent,
    website: sanitizePlainText(input.website),
  };
}

function sanitizePlainText(value?: string) {
  if (value === undefined) {
    return undefined;
  }

  const sanitized = sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
  const normalized = sanitized.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return normalized || undefined;
}

function sanitizeMessage(value?: string) {
  if (value === undefined) {
    return undefined;
  }

  const sanitized = sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} })
    .replace(/\r\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();

  return sanitized || undefined;
}
