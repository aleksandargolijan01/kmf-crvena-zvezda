import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, startWith } from 'rxjs';
import { LocalizedText, Player } from '../../data/site.models';
import { PublicApiService } from './public-api.service';

interface PublicPlayer {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  position?: string | null;
  shirtNumber?: number | null;
  bio_sr?: string | null;
  bio_en?: string | null;
  bio_ru?: string | null;
  imageUrl?: string | null;
  image?: {
    url?: string | null;
  } | null;
}

export interface PublicPlayersState {
  loading: boolean;
  error: boolean;
  players: Player[];
}

@Injectable({ providedIn: 'root' })
export class PublicPlayersService {
  constructor(private readonly api: PublicApiService) {}

  firstTeamState(fallback: Player[] = []): Observable<PublicPlayersState> {
    return this.api.players<PublicPlayer[]>().pipe(
      map((players) => ({
        loading: false,
        error: false,
        players: this.toPlayers(players, fallback),
      })),
      catchError(() => of({ loading: false, error: true, players: fallback })),
      startWith({ loading: true, error: false, players: [] })
    );
  }

  u19State(fallback: Player[] = []): Observable<PublicPlayersState> {
    return this.api.u19Players<PublicPlayer[]>().pipe(
      map((players) => ({
        loading: false,
        error: false,
        players: this.toPlayers(players, fallback),
      })),
      catchError(() => of({ loading: false, error: true, players: fallback })),
      startWith({ loading: true, error: false, players: [] })
    );
  }

  private toPlayers(players: PublicPlayer[] | null | undefined, fallback: Player[]): Player[] {
    if (!players) {
      return fallback;
    }

    return players.map((player, index) => ({
      name: player.fullName || [player.firstName, player.lastName].filter(Boolean).join(' '),
      position: this.localized(player.position || ''),
      number: player.shirtNumber ? String(player.shirtNumber) : '',
      image: player.imageUrl || player.image?.url || fallback[index]?.image || '/images/logo-kmf-crvena-zvezda.png',
      description: this.localized(player.bio_sr || '', player.bio_en, player.bio_ru),
    }));
  }

  private localized(sr: string, en?: string | null, ru?: string | null): LocalizedText {
    return {
      sr,
      en: en || sr,
      ru: ru || sr,
    };
  }
}
