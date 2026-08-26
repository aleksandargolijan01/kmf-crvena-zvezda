import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';

export const adminAuthGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated) {
    return true;
  }

  if (auth.refreshToken) {
    return auth.refreshSession().pipe(
      map((response) => response ? true : router.createUrlTree(['/admin/login'])),
      catchError(() => of(router.createUrlTree(['/admin/login'])))
    );
  }

  return router.createUrlTree(['/admin/login']);
};
