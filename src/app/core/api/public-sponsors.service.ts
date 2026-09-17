import { Injectable } from '@angular/core';
import { catchError, map, of, startWith } from 'rxjs';
import { PublicApiService } from './public-api.service';
import { isRetiredSponsorCategory } from '../../data/sponsor-category-labels';

export interface PublicSponsorCategory {
  slug?: string;
  id: string;
  name_sr: string;
  name_en?: string | null;
  name_ru?: string | null;
  description_sr?: string | null;
  description_en?: string | null;
  description_ru?: string | null;
  order: number;
  active: boolean;
  sponsors: PublicSponsor[];
}

export interface PublicSponsor {
  id: string;
  name: string;
  websiteUrl?: string | null;
  logoUrl?: string | null;
  description_sr?: string | null;
  description_en?: string | null;
  description_ru?: string | null;
  featured: boolean;
  active: boolean;
  order: number;
}

export interface PublicSponsorsState {
  loading: boolean;
  error: boolean;
  categories: PublicSponsorCategory[];
}

@Injectable({ providedIn: 'root' })
export class PublicSponsorsService {
  constructor(private readonly api: PublicApiService) {}

  groupedState() {
    return this.api.sponsors<PublicSponsorCategory[]>().pipe(
      map((categories) => ({ loading: false, error: false, categories: (categories ?? []).filter(category => !isRetiredSponsorCategory(category) || category.sponsors.length > 0) })),
      catchError(() => of({ loading: false, error: true, categories: [] })),
      startWith({ loading: true, error: false, categories: [] })
    );
  }
}
