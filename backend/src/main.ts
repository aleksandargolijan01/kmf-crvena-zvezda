import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const isProduction = configService.get<string>('NODE_ENV') === 'production';

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          baseUri: ["'none'"],
          connectSrc: ["'self'"],
          formAction: ["'none'"],
          frameAncestors: ["'none'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          objectSrc: ["'none'"],
          scriptSrc: ["'none'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      frameguard: { action: 'deny' },
      hsts: isProduction
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          }
        : false,
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );
  app.enableCors({
    origin: parseCorsOrigins(configService.get<string>('FRONTEND_ORIGINS'), isProduction),
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: isProduction,
    }),
  );

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
}

void bootstrap();

function parseCorsOrigins(value: string | undefined, isProduction: boolean) {
  const defaultOrigins = [
    'http://localhost:4200',
    'http://127.0.0.1:4200',
    'https://localhost:4200',
  ];

  const origins = value?.trim()
    ? value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    : isProduction
      ? []
      : defaultOrigins;

  if (isProduction && origins.length === 0) {
    throw new Error('FRONTEND_ORIGINS must be configured in production.');
  }

  if (isProduction && origins.some((origin) => origin === '*' || origin.includes('*'))) {
    throw new Error('Wildcard CORS origins are not allowed in production.');
  }

  return origins;
}
