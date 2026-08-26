import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';

type CacheEntry<T> = {
  expiresAt: number;
  value$: Observable<T>;
};

@Injectable({ providedIn: 'root' })
export class PublicApiService {
  private readonly apiUrl = environment.apiUrl.replace(/\/$/, '');
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly defaultTtlMs = 5 * 60 * 1000;

  constructor(private readonly http: HttpClient) {}

  news<T>(page = 1, limit = 10, params?: Record<string, string | number | boolean>): Observable<T> {
    return this.cached<T>('news', { page, limit, ...(params ?? {}) });
  }

  newsArticle<T>(slug: string): Observable<T> {
    return this.cached<T>(`news/${slug}`);
  }

  players<T>(): Observable<T> {
    return this.cached<T>('players', undefined, 0);
  }

  u19Players<T>(): Observable<T> {
    return this.cached<T>('u19-players', undefined, 0);
  }

  staff<T>(teamType: 'FIRST_TEAM' | 'U19_TEAM'): Observable<T> {
    return this.cached<T>('staff', { teamType }, 0);
  }

  management<T>(): Observable<T> {
    return this.cached<T>('management', undefined, 0);
  }

  boardMembers<T>(): Observable<T> {
    return this.cached<T>('board-members', undefined, 0);
  }

  sponsors<T>(): Observable<T> {
    return this.cached<T>('sponsors/grouped');
  }

  private cached<T>(path: string, params?: Record<string, string | number | boolean>, ttlMs = this.defaultTtlMs): Observable<T> {
    const key = `${path}?${JSON.stringify(params ?? {})}`;
    const now = Date.now();
    const existing = this.cache.get(key) as CacheEntry<T> | undefined;

    if (existing && existing.expiresAt > now) {
      return existing.value$;
    }

    const value$ = this.http.get<T>(`${this.apiUrl}/${path}`, { params: this.params(params) }).pipe(shareReplay({ bufferSize: 1, refCount: false }));
    this.cache.set(key, { expiresAt: now + ttlMs, value$ });
    return value$;
  }

  private params(values?: Record<string, string | number | boolean>): HttpParams {
    let params = new HttpParams();

    Object.entries(values ?? {}).forEach(([key, value]) => {
      params = params.set(key, String(value));
    });

    return params;
  }
}
