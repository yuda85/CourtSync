import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { map, first, timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { RoleService } from '@core/services/role.service';

/**
 * Guard to protect superadmin-only routes
 * Only allows access for users with 'superadmin' role
 * Redirects admin users to /admin/dashboard
 * Redirects regular users to /app/profile
 */
export const superadminGuard: CanActivateFn = () => {
  const roleService = inject(RoleService);
  const router = inject(Router);

  return roleService.currentUserRoles$().pipe(
    first(),
    timeout(5000),
    map((roles) => {
      if (roles.includes('superadmin')) {
        console.log('Superadmin guard - access granted');
        return true;
      }

      console.log('Superadmin guard - access denied');

      // Redirect to admin dashboard if user is admin (but not superadmin)
      if (roles.includes('admin')) {
        return router.createUrlTree(['/admin/dashboard']);
      }

      // Redirect regular users to profile page
      return router.createUrlTree(['/app/profile']);
    }),
    catchError((err) => {
      console.error('Superadmin guard error:', err);
      return of(router.createUrlTree(['/app/profile']));
    })
  );
};
