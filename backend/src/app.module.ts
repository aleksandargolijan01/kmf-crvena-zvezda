import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import * as Joi from 'joi';
import { PrismaModule } from './database/prisma.module';
import { AdminTranslationsModule } from './modules/admin-translations/admin-translations.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { ManagementModule } from './modules/management/management.module';
import { MediaModule } from './modules/media/media.module';
import { NewsModule } from './modules/news/news.module';
import { NewsletterModule } from './modules/newsletter/newsletter.module';
import { PlayersModule } from './modules/players/players.module';
import { SponsorInquiriesModule } from './modules/sponsor-inquiries/sponsor-inquiries.module';
import { SponsorsModule } from './modules/sponsors/sponsors.module';
import { StaffModule } from './modules/staff/staff.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        DIRECT_URL: Joi.string().required(),
        SUPABASE_URL: Joi.string().uri({ scheme: ['https'] }).required(),
        SUPABASE_SERVICE_ROLE_KEY: Joi.string()
          .trim()
          .min(20)
          .invalid('replace-with-service-role-key')
          .required(),
        SUPABASE_STORAGE_BUCKET: Joi.string().trim().min(1).required(),
        JWT_SECRET: Joi.when('NODE_ENV', {
          is: 'production',
          then: Joi.string().trim().min(32).invalid('replace-with-jwt-secret').required(),
          otherwise: Joi.string().trim().min(16).invalid('replace-with-jwt-secret').required(),
        }),
        JWT_REFRESH_SECRET: Joi.when('NODE_ENV', {
          is: 'production',
          then: Joi.string()
            .trim()
            .min(32)
            .invalid('replace-with-refresh-secret', Joi.ref('JWT_SECRET'))
            .required(),
          otherwise: Joi.string()
            .trim()
            .min(16)
            .invalid('replace-with-refresh-secret', Joi.ref('JWT_SECRET'))
            .required(),
        }),
        JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
        JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
        OPENAI_API_KEY: Joi.string().allow('').optional(),
        OPENAI_TRANSLATION_MODEL: Joi.string().default('gpt-4.1-mini'),
        FRONTEND_ORIGINS: Joi.string().optional(),
        SUPER_ADMIN_EMAIL: Joi.string().email().optional(),
        SUPER_ADMIN_PASSWORD: Joi.string().min(12).optional(),
        SUPER_ADMIN_NAME: Joi.string().optional(),
        SMTP_HOST: Joi.string().allow('').optional(),
        SMTP_PORT: Joi.number().default(587),
        SMTP_SECURE: Joi.boolean().default(false),
        SMTP_USER: Joi.string().allow('').optional(),
        SMTP_PASS: Joi.string().allow('').optional(),
        SPONSOR_INQUIRY_TO_EMAIL: Joi.string().allow('').email().optional(),
        SPONSOR_INQUIRY_FROM_EMAIL: Joi.string().allow('').email().optional(),
        SPONSOR_INQUIRY_REPLY_TO_ENABLED: Joi.boolean().default(true),
        SPONSOR_LOGO_PATH: Joi.string().trim().allow('').optional(),
        PORT: Joi.number().default(3000),
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test', 'staging')
          .default('development'),
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
    AdminTranslationsModule,
    PrismaModule,
    AuthModule,
    HealthModule,
    ManagementModule,
    MediaModule,
    NewsModule,
    NewsletterModule,
    PlayersModule,
    SponsorInquiriesModule,
    SponsorsModule,
    StaffModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
