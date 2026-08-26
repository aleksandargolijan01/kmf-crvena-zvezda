import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TranslationModule } from '../translation/translation.module';
import { AdminTranslationsController } from './admin-translations.controller';
import { AdminTranslationsService } from './admin-translations.service';

@Module({
  imports: [AuthModule, TranslationModule],
  controllers: [AdminTranslationsController],
  providers: [AdminTranslationsService],
})
export class AdminTranslationsModule {}
