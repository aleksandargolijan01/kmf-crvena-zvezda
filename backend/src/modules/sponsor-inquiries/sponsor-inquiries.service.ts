import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'fs';
import { isAbsolute, resolve } from 'path';
import nodemailer, { Transporter } from 'nodemailer';
import { CreateSponsorInquiryDto } from './dto/create-sponsor-inquiry.dto';
import { buildSponsorInquiryEmail } from './templates/sponsor-inquiry-email.template';
import { sanitizeSponsorInquiryInput } from './utils/sponsor-inquiry-sanitizer';

@Injectable()
export class SponsorInquiriesService {
  private readonly logger = new Logger(SponsorInquiriesService.name);
  private transporter?: Transporter;

  constructor(private readonly config: ConfigService) {}

  async create(dto: CreateSponsorInquiryDto) {
    const inquiry = sanitizeSponsorInquiryInput(dto);

    if (inquiry.website) {
      return this.publicResponse();
    }

    if (!inquiry.consent) {
      throw new BadRequestException('Consent is required.');
    }

    const to = this.safeConfiguredHeaderValue(
      this.config.get<string>('SPONSOR_INQUIRY_TO_EMAIL')?.trim(),
      'SPONSOR_INQUIRY_TO_EMAIL',
    );
    const from = this.safeConfiguredHeaderValue(
      this.config.get<string>('SPONSOR_INQUIRY_FROM_EMAIL')?.trim() ||
        this.config.get<string>('SMTP_USER')?.trim(),
      'SPONSOR_INQUIRY_FROM_EMAIL/SMTP_USER',
    );

    if (!to || !from || !this.isSmtpConfigured()) {
      this.logger.error('Sponsor inquiry email is not configured.');
      throw new ServiceUnavailableException('Sponsor inquiry email is temporarily unavailable.');
    }

    const submittedAt = new Date();
    const replyToEnabled = this.readBoolean('SPONSOR_INQUIRY_REPLY_TO_ENABLED', true);
    const html = buildSponsorInquiryEmail({ inquiry, submittedAt, replyToEnabled });

    try {
      await this.getTransporter().sendMail({
        to,
        from,
        subject: this.safeHeaderText(`Нови упит за спонзорство — ${inquiry.companyName}`),
        html,
        text: this.buildTextFallback(inquiry, submittedAt),
        replyTo: replyToEnabled ? this.safeUserHeaderValue(inquiry.email) : undefined,
        attachments: [
          {
            filename: 'logo-kmf-crvena-zvezda.png',
            path: this.resolveSponsorLogoPath(),
            cid: 'club-logo',
          },
        ],
      });
    } catch (error) {
      this.logger.error('Sponsor inquiry email sending failed.', error instanceof Error ? error.stack : undefined);
      throw new ServiceUnavailableException('Sponsor inquiry email is temporarily unavailable.');
    }

    return this.publicResponse();
  }

  private getTransporter() {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: this.config.get<string>('SMTP_HOST'),
        port: this.config.get<number>('SMTP_PORT', 587),
        secure: this.readBoolean('SMTP_SECURE', false),
        auth: {
          user: this.config.get<string>('SMTP_USER'),
          pass: this.config.get<string>('SMTP_PASS'),
        },
      });
    }

    return this.transporter;
  }

  private isSmtpConfigured() {
    return Boolean(
      this.config.get<string>('SMTP_HOST')?.trim() &&
        this.config.get<string>('SMTP_PORT')?.toString().trim() &&
        this.config.get<string>('SMTP_USER')?.trim() &&
        this.config.get<string>('SMTP_PASS')?.trim(),
    );
  }

  private resolveSponsorLogoPath() {
    const configuredPath = this.config.get<string>('SPONSOR_LOGO_PATH')?.trim();
    const runtimeRoot = resolve(__dirname, '../../..');
    const fallbackPath = resolve(runtimeRoot, 'assets', 'logo-kmf-crvena-zvezda.png');

    if (!configuredPath) {
      return fallbackPath;
    }

    const resolvedPath = isAbsolute(configuredPath)
      ? configuredPath
      : resolve(runtimeRoot, configuredPath);

    if (!existsSync(resolvedPath)) {
      this.logger.warn(`SPONSOR_LOGO_PATH does not exist: ${resolvedPath}. Using packaged logo.`);
      return fallbackPath;
    }

    return resolvedPath;
  }

  private readBoolean(key: string, defaultValue: boolean) {
    const value = this.config.get<boolean | string>(key, defaultValue);

    if (typeof value === 'boolean') {
      return value;
    }

    return value.toLowerCase() === 'true';
  }

  private publicResponse() {
    return {
      success: true,
      message: 'Sponsor inquiry has been received.',
    };
  }

  private safeConfiguredHeaderValue(value: string | undefined, label: string) {
    if (!value) {
      return undefined;
    }

    if (/[\r\n]/.test(value)) {
      this.logger.error(`${label} contains unsafe line breaks.`);
      throw new ServiceUnavailableException('Sponsor inquiry email is temporarily unavailable.');
    }

    return value;
  }

  private safeUserHeaderValue(value: string) {
    if (/[\r\n]/.test(value)) {
      throw new BadRequestException('Invalid email address.');
    }

    return value;
  }

  private safeHeaderText(value: string) {
    return value.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, 180);
  }

  private buildTextFallback(inquiry: ReturnType<typeof sanitizeSponsorInquiryInput>, submittedAt: Date) {
    return [
      'Нови упит за спонзорство',
      '',
      `Име и презиме: ${inquiry.fullName}`,
      `Компанија: ${inquiry.companyName}`,
      `Email: ${inquiry.email}`,
      `Телефон: ${inquiry.phone || 'Није наведено'}`,
      `Пакет интересовања: ${inquiry.sponsorshipPackage || 'Није наведено'}`,
      `Датум слања: ${submittedAt.toISOString()}`,
      '',
      'Порука:',
      inquiry.message,
    ].join('\n');
  }
}
