import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateSponsorCategoryDto } from './dto/create-sponsor-category.dto';
import { CreateSponsorDto } from './dto/create-sponsor.dto';
import { SponsorCategoriesQueryDto } from './dto/sponsor-categories-query.dto';
import { SponsorsQueryDto } from './dto/sponsors-query.dto';
import { UpdateSponsorCategoryDto } from './dto/update-sponsor-category.dto';
import { UpdateSponsorDto } from './dto/update-sponsor.dto';
import { SponsorsService } from './sponsors.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
export class AdminSponsorsController {
  constructor(private readonly sponsorsService: SponsorsService) {}

  @Get('sponsor-categories')
  findCategories(@Query() query: SponsorCategoriesQueryDto) {
    return this.sponsorsService.findAdminCategories(query);
  }

  @Post('sponsor-categories')
  createCategory(@Body() dto: CreateSponsorCategoryDto) {
    return this.sponsorsService.createCategory(dto);
  }

  @Patch('sponsor-categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateSponsorCategoryDto) {
    return this.sponsorsService.updateCategory(id, dto);
  }

  @Delete('sponsor-categories/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  removeCategory(@Param('id') id: string) {
    return this.sponsorsService.removeCategory(id);
  }

  @Get('sponsors')
  findSponsors(@Query() query: SponsorsQueryDto) {
    return this.sponsorsService.findAdminSponsors(query);
  }

  @Post('sponsors')
  createSponsor(@Body() dto: CreateSponsorDto) {
    return this.sponsorsService.createSponsor(dto);
  }

  @Patch('sponsors/:id')
  updateSponsor(@Param('id') id: string, @Body() dto: UpdateSponsorDto) {
    return this.sponsorsService.updateSponsor(id, dto);
  }

  @Delete('sponsors/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  removeSponsor(@Param('id') id: string) {
    return this.sponsorsService.removeSponsor(id);
  }
}
