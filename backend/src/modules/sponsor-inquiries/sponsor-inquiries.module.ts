import { Module } from '@nestjs/common';
import { SponsorInquiriesController } from './sponsor-inquiries.controller';
import { SponsorInquiriesService } from './sponsor-inquiries.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [SponsorInquiriesController],
  providers: [SponsorInquiriesService],
})
export class SponsorInquiriesModule {}
