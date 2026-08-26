import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateManagementMemberDto } from './dto/create-management-member.dto';
import { ManagementQueryDto } from './dto/management-query.dto';
import { UpdateManagementMemberDto } from './dto/update-management-member.dto';
import { ManagementService } from './management.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
export class AdminManagementController {
  constructor(private readonly managementService: ManagementService) {}

  @Get('admin/management')
  findManagement(@Query() query: ManagementQueryDto) {
    return this.managementService.findAdmin('management', query);
  }

  @Post('admin/management')
  createManagement(@Body() dto: CreateManagementMemberDto) {
    return this.managementService.create('management', dto);
  }

  @Patch('admin/management/:id')
  updateManagement(@Param('id') id: string, @Body() dto: UpdateManagementMemberDto) {
    return this.managementService.update('management', id, dto);
  }

  @Delete('admin/management/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  removeManagement(@Param('id') id: string) {
    return this.managementService.remove('management', id);
  }

  @Get('admin/board-members')
  findBoardMembers(@Query() query: ManagementQueryDto) {
    return this.managementService.findAdmin('board', query);
  }

  @Post('admin/board-members')
  createBoardMember(@Body() dto: CreateManagementMemberDto) {
    return this.managementService.create('board', dto);
  }

  @Patch('admin/board-members/:id')
  updateBoardMember(@Param('id') id: string, @Body() dto: UpdateManagementMemberDto) {
    return this.managementService.update('board', id, dto);
  }

  @Delete('admin/board-members/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  removeBoardMember(@Param('id') id: string) {
    return this.managementService.remove('board', id);
  }
}
