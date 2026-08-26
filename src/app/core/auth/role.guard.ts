import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminRole } from '../api/admin-api.models';
import { AuthService } from './auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const roles = (route.data['roles'] ?? []) as AdminRole[];
  const auth = inject(AuthService);
  const router = inject(Router);
  return roles.length === 0 || auth.hasRole(roles) ? true : router.createUrlTree(['/admin/forbidden']);
};
