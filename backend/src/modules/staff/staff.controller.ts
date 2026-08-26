import { Controller, Get, Param, Query } from '@nestjs/common';
import { StaffQueryDto } from './dto/staff-query.dto';
import { StaffService } from './staff.service';

@Controller()
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get('staff')
  findStaff(@Query() query: StaffQueryDto) {
    return this.staffService.findPublic(query);
  }

  @Get('staff/:id')
  findStaffMember(@Param('id') id: string) {
    return this.staffService.findPublicById(id);
  }
}
