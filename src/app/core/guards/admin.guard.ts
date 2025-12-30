import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { map, first, timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { RoleService } from '@core/services/role.service';

/**
 * Guard to protect admin routes
 * Allows access for users with 'admin' or 'superadmin' role
 * Redirects non-admin users to /app/profile
 */
export const adminGuard: CanActivateFn = () => {
  const roleService = inject(RoleService);
  const router = inject(Router);

  return roleService.currentUserRoles$().pipe(
    first(),
    timeout(5000),
    map((roles) => {
      const hasAdminAccess =
        roles.includes('admin') || roles.includes('superadmin');

      if (hasAdminAccess) {
        console.log('Admin guard - access granted');
        return true;
      }

      console.log('Admin guard - access denied, redirecting to profile');
      return router.createUrlTree(['/app/profile']);
    }),
    catchError((err) => {
      console.error('Admin guard error:', err);
      return of(router.createUrlTree(['/app/profile']));
    })
  );
};
