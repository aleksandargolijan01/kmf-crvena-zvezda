import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, finalize, Observable, of, shareReplay, tap, throwError } from 'rxjs';
import { AdminApiService } from '../api/admin-api.service';
import { AdminRole, AdminUser, AuthResponse } from '../api/admin-api.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly accessKey = 'kmf_admin_access_token';
  private readonly refreshKey = 'kmf_admin_refresh_token';
  private readonly userKey = 'kmf_admin_user';
  private refreshRequest$?: Observable<AuthResponse | null>;

  readonly user$ = new BehaviorSubject<AdminUser | null>(this.readUser());
  readonly loading$ = new BehaviorSubject(false);

  constructor(
    private readonly api: AdminApiService,
    private readonly router: Router
  ) {}

  get accessToken(): string | null {
    return this.read(this.accessKey);
  }

  get refreshToken(): string | null {
    return this.read(this.refreshKey);
  }

  get isAuthenticated(): boolean {
    const token = this.accessToken;
    return !!token && !this.isTokenExpired(token);
  }

  login(email: string, password: string): Observable<AuthResponse> {
    this.loading$.next(true);
    return this.api.login(email, password).pipe(
      tap((response) => this.persist(response)),
      finalize(() => this.loading$.next(false))
    );
  }

  refreshSession(): Observable<AuthResponse | null> {
    if (!this.refreshToken) {
      return of(null);
    }

    if (this.refreshRequest$) {
      return this.refreshRequest$;
    }

    this.refreshRequest$ = this.api.refresh(this.refreshToken).pipe(
      tap((response) => this.persist(response)),
      catchError((error) => {
        this.clear();
        return throwError(() => error);
      }),
      finalize(() => (this.refreshRequest$ = undefined)),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    return this.refreshRequest$;
  }

  logout(redirect = true): void {
    const hadToken = !!this.accessToken;
    if (hadToken) {
      this.api.logout().pipe(catchError(() => of(null))).subscribe(() => this.clear());
    } else {
      this.clear();
    }
    if (redirect) {
      void this.router.navigate(['/admin/login']);
    }
  }

  hasRole(roles: AdminRole[]): boolean {
    const role = this.user$.value?.role;
    return !!role && roles.includes(role);
  }

  private persist(response: AuthResponse): void {
    if (!this.isBrowser) {
      return;
    }
    localStorage.setItem(this.accessKey, response.accessToken);
    localStorage.setItem(this.refreshKey, response.refreshToken);
    localStorage.setItem(this.userKey, JSON.stringify(response.user));
    this.user$.next(response.user);
  }

  private clear(): void {
    if (this.isBrowser) {
      localStorage.removeItem(this.accessKey);
      localStorage.removeItem(this.refreshKey);
      localStorage.removeItem(this.userKey);
    }
    this.user$.next(null);
  }

  private read(key: string): string | null {
    return this.isBrowser ? localStorage.getItem(key) : null;
  }

  private readUser(): AdminUser | null {
    const value = this.read(this.userKey);
    if (!value) {
      return null;
    }
    try {
      return JSON.parse(value) as AdminUser;
    } catch {
      return null;
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as { exp?: number };
      return !payload.exp || Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }
}
