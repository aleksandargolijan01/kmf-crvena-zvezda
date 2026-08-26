import { Module } from '@nestjs/common';
import { SponsorInquiriesController } from './sponsor-inquiries.controller';
import { SponsorInquiriesService } from './sponsor-inquiries.service';

@Module({
  controllers: [SponsorInquiriesController],
  providers: [SponsorInquiriesService],
})
export class SponsorInquiriesModule {}
