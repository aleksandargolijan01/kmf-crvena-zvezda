import { Controller, Get, Header } from '@nestjs/common';
import { SponsorsService } from './sponsors.service';

@Controller('sponsors')
export class SponsorsController {
  constructor(private readonly sponsorsService: SponsorsService) {}

  @Get()
  findSponsors() {
    return this.sponsorsService.findPublicSponsors();
  }

  @Get('categories')
  findCategories() {
    return this.sponsorsService.findPublicCategories();
  }

  @Get('grouped')
  @Header('Cache-Control', 'public, max-age=0, must-revalidate')
  findGrouped() {
    return this.sponsorsService.findPublicGrouped();
  }
}
