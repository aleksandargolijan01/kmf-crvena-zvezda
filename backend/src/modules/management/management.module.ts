import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TranslationModule } from '../translation/translation.module';
import { AdminManagementController } from './admin-management.controller';
import { ManagementController } from './management.controller';
import { ManagementService } from './management.service';

@Module({
  imports: [AuthModule, TranslationModule],
  controllers: [ManagementController, AdminManagementController],
  providers: [ManagementService],
})
export class ManagementModule {}
