import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateStaffMemberDto } from './dto/create-staff-member.dto';
import { StaffQueryDto } from './dto/staff-query.dto';
import { UpdateStaffMemberDto } from './dto/update-staff-member.dto';
import { StaffService } from './staff.service';

@Controller('admin/staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
export class AdminStaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  findStaff(@Query() query: StaffQueryDto) {
    return this.staffService.findAdmin(query);
  }

  @Post()
  createStaff(@Body() dto: CreateStaffMemberDto) {
    return this.staffService.create(dto);
  }

  @Patch(':id')
  updateStaff(@Param('id') id: string, @Body() dto: UpdateStaffMemberDto) {
    return this.staffService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  removeStaff(@Param('id') id: string) {
    return this.staffService.remove(id);
  }
}
