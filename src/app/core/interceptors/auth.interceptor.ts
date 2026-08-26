import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const apiUrl = environment.apiUrl.replace(/\/$/, '');
  const token = auth.accessToken;
  const isApiRequest = request.url.startsWith(apiUrl) || request.url.startsWith('/api');
  const isRefresh = request.url.includes('/auth/refresh');
  const isLogin = request.url.includes('/auth/login');

  const authorized = token && isApiRequest
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authorized).pipe(
    catchError((error: HttpErrorResponse) => {
      if (isApiRequest && error.status === 403) {
        void router.navigate(['/admin/forbidden']);
        return throwError(() => error);
      }

      if (isApiRequest && error.status === 401 && !isRefresh && !isLogin && !auth.refreshToken) {
        auth.logout();
        return throwError(() => error);
      }

      if (error.status !== 401 || isRefresh || !auth.refreshToken) {
        return throwError(() => error);
      }
      return auth.refreshSession().pipe(
        switchMap((response) => {
          if (!response) {
            auth.logout();
            return throwError(() => error);
          }

          const refreshedToken = auth.accessToken;
          const retry = refreshedToken
            ? request.clone({ setHeaders: { Authorization: `Bearer ${refreshedToken}` } })
            : request;
          return next(retry);
        }),
        catchError((refreshError) => {
          auth.logout();
          return throwError(() => refreshError);
        })
      );
    })
  );
};
