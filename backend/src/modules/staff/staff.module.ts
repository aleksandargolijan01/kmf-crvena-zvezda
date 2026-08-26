import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TranslationModule } from '../translation/translation.module';
import { AdminStaffController } from './admin-staff.controller';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  imports: [AuthModule, TranslationModule],
  controllers: [StaffController, AdminStaffController],
  providers: [StaffService],
})
export class StaffModule {}
