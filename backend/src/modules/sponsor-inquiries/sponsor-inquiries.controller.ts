import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CreateSponsorInquiryDto } from './dto/create-sponsor-inquiry.dto';
import { SponsorInquiriesService } from './sponsor-inquiries.service';

@Controller('sponsor-inquiries')
export class SponsorInquiriesController {
  constructor(private readonly sponsorInquiriesService: SponsorInquiriesService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  create(@Body() dto: CreateSponsorInquiryDto) {
    return this.sponsorInquiriesService.create(dto);
  }
}
