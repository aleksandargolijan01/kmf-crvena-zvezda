import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, startWith } from 'rxjs';
import { LocalizedText, StaffMember } from '../../data/site.models';
import { PublicApiService } from './public-api.service';

type StaffTeamType = 'FIRST_TEAM' | 'U19_TEAM';

interface PublicStaffMember {
  id: string;
  fullName: string;
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

export interface PublicStaffState {
  loading: boolean;
  error: boolean;
  members: StaffMember[];
}

@Injectable({ providedIn: 'root' })
export class PublicStaffService {
  constructor(private readonly api: PublicApiService) {}

  state(teamType: StaffTeamType): Observable<PublicStaffState> {
    return this.api.staff<PublicStaffMember[]>(teamType).pipe(
      map((members) => ({
        loading: false,
        error: false,
        members: this.toStaffMembers(members),
      })),
      catchError(() => of({ loading: false, error: true, members: [] })),
      startWith({ loading: true, error: false, members: [] })
    );
  }

  private toStaffMembers(members: PublicStaffMember[] | null | undefined): StaffMember[] {
    if (!members) {
      return [];
    }

    return members.map((member) => ({
      name: member.fullName,
      role: this.localized(member.role_sr, member.role_en, member.role_ru),
      description: this.localized(member.bio_sr || '', member.bio_en, member.bio_ru),
      image: member.imageUrl || member.image?.url || '/images/logo-kmf-crvena-zvezda.png',
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
