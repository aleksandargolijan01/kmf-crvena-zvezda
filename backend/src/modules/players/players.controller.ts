import { Controller, Get, Param } from '@nestjs/common';
import { PlayersService } from './players.service';

@Controller()
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get('players')
  findPlayers() {
    return this.playersService.findPublic('firstTeam');
  }

  @Get('players/:id')
  findPlayer(@Param('id') id: string) {
    return this.playersService.findPublicById('firstTeam', id);
  }

  @Get('u19-players')
  findU19Players() {
    return this.playersService.findPublic('u19');
  }

  @Get('u19-players/:id')
  findU19Player(@Param('id') id: string) {
    return this.playersService.findPublicById('u19', id);
  }
}
