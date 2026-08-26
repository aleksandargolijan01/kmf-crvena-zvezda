import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AdminNewsQueryDto } from './dto/admin-news-query.dto';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { NewsService } from './news.service';

@Controller('admin/news')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
export class AdminNewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  findForAdmin(@Query() query: AdminNewsQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.newsService.findForAdmin(query, user);
  }

  @Post()
  create(@Body() createNewsDto: CreateNewsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.newsService.create(createNewsDto, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateNewsDto: UpdateNewsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.newsService.update(id, updateNewsDto, user);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.newsService.remove(id);
  }
}
