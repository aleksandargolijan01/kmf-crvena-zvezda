import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TranslationModule } from '../translation/translation.module';
import { AdminPlayersController } from './admin-players.controller';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';

@Module({
  imports: [AuthModule, TranslationModule],
  controllers: [PlayersController, AdminPlayersController],
  providers: [PlayersService],
})
export class PlayersModule {}
