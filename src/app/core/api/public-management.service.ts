import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, startWith } from 'rxjs';
import { Leader, LocalizedText } from '../../data/site.models';
import { PublicApiService } from './public-api.service';

interface PublicManagementMember {
  id: string;
  fullName: string;
  slug?: string;
  role_sr: string;
  role_en?: string | null;
  role_ru?: string | null;
  bio_sr?: string | null;
  bio_en?: string | null;
  bio_ru?: string | null;
  imageUrl?: string | null;
  image?: {
    url?: string | null;
  } | null;
}

export interface PublicManagementState {
  loading: boolean;
  error: boolean;
  members: Leader[];
}

@Injectable({ providedIn: 'root' })
export class PublicManagementService {
  constructor(private readonly api: PublicApiService) {}

  managementState(fallback: Leader[] = []): Observable<PublicManagementState> {
    return this.api.management<PublicManagementMember[]>().pipe(
      map((members) => ({
        loading: false,
        error: false,
        members: this.toLeaders(members, fallback),
      })),
      catchError(() => of({ loading: false, error: true, members: fallback })),
      startWith({ loading: true, error: false, members: [] })
    );
  }

  boardState(fallback: Leader[] = []): Observable<PublicManagementState> {
    return this.api.boardMembers<PublicManagementMember[]>().pipe(
      map((members) => ({
        loading: false,
        error: false,
        members: this.toLeaders(members, fallback),
      })),
      catchError(() => of({ loading: false, error: true, members: fallback })),
      startWith({ loading: true, error: false, members: [] })
    );
  }

  private toLeaders(members: PublicManagementMember[] | null | undefined, fallback: Leader[]): Leader[] {
    if (!members) {
      return fallback;
    }

    return members.map((member, index) => ({
      name: member.fullName,
      role: this.localized(member.role_sr, member.role_en, member.role_ru),
      description: this.localized(member.bio_sr || '', member.bio_en, member.bio_ru),
      image: member.imageUrl || member.image?.url || fallback[index]?.image || '/images/logo-kmf-crvena-zvezda.png',
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
