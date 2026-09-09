import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { SendMailOptions, Transporter } from 'nodemailer';
@Injectable()
export class MailService {
  private transporter?: Transporter;
  constructor(private readonly config: ConfigService) {}
  send(options: SendMailOptions) {
    if (!this.transporter) {
      const secure = this.config.get<boolean | string>('SMTP_SECURE', false);
      this.transporter = nodemailer.createTransport({ host: this.config.get<string>('SMTP_HOST'), port: Number(this.config.get('SMTP_PORT', 587)), secure: secure === true || secure === 'true', auth: { user: this.config.get<string>('SMTP_USER'), pass: this.config.get<string>('SMTP_PASS') }, connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000 });
    }
    return this.transporter.sendMail(options);
  }
}
