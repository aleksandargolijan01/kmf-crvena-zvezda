import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreatePlayerDto } from './dto/create-player.dto';
import { PlayersQueryDto } from './dto/players-query.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { PlayersService } from './players.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
@Controller()
export class AdminPlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get('admin/players')
  findPlayers(@Query() query: PlayersQueryDto) {
    return this.playersService.findAdmin('firstTeam', query);
  }

  @Post('admin/players')
  createPlayer(@Body() dto: CreatePlayerDto) {
    return this.playersService.create('firstTeam', dto);
  }

  @Patch('admin/players/:id')
  updatePlayer(@Param('id') id: string, @Body() dto: UpdatePlayerDto) {
    return this.playersService.update('firstTeam', id, dto);
  }

  @Delete('admin/players/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  removePlayer(@Param('id') id: string) {
    return this.playersService.remove('firstTeam', id);
  }

  @Get('admin/u19-players')
  findU19Players(@Query() query: PlayersQueryDto) {
    return this.playersService.findAdmin('u19', query);
  }

  @Post('admin/u19-players')
  createU19Player(@Body() dto: CreatePlayerDto) {
    return this.playersService.create('u19', dto);
  }

  @Patch('admin/u19-players/:id')
  updateU19Player(@Param('id') id: string, @Body() dto: UpdatePlayerDto) {
    return this.playersService.update('u19', id, dto);
  }

  @Delete('admin/u19-players/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  removeU19Player(@Param('id') id: string) {
    return this.playersService.remove('u19', id);
  }
}
