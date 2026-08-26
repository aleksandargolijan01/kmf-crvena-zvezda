import { Controller, Get, Param } from '@nestjs/common';
import { ManagementService } from './management.service';

@Controller()
export class ManagementController {
  constructor(private readonly managementService: ManagementService) {}

  @Get('management')
  findManagement() {
    return this.managementService.findPublic('management');
  }

  @Get('management/:id')
  findManagementMember(@Param('id') id: string) {
    return this.managementService.findPublicById('management', id);
  }

  @Get('board-members')
  findBoardMembers() {
    return this.managementService.findPublic('board');
  }

  @Get('board-members/:id')
  findBoardMember(@Param('id') id: string) {
    return this.managementService.findPublicById('board', id);
  }
}
