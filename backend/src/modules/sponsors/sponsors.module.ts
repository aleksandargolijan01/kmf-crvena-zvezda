import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TranslationModule } from '../translation/translation.module';
import { AdminSponsorsController } from './admin-sponsors.controller';
import { SponsorsController } from './sponsors.controller';
import { SponsorsService } from './sponsors.service';

@Module({
  imports: [AuthModule, TranslationModule],
  controllers: [SponsorsController, AdminSponsorsController],
  providers: [SponsorsService],
})
export class SponsorsModule {}
