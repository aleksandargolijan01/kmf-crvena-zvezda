import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminTranslationsService } from './admin-translations.service';
import { RegenerateMissingTranslationsDto } from './dto/regenerate-missing-translations.dto';

@Controller('admin/translations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class AdminTranslationsController {
  constructor(private readonly adminTranslationsService: AdminTranslationsService) {}

  @Post('regenerate-missing')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  regenerateMissing(@Body() dto: RegenerateMissingTranslationsDto) {
    return this.adminTranslationsService.regenerateMissing(dto);
  }
}
