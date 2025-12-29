import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { map, catchError, first, timeout } from 'rxjs/operators';
import { of } from 'rxjs';
import { EntitlementsRepo } from '@core/repos/entitlements.repo';

/**
 * Guard to protect course learning routes
 * Checks if user has purchased/entitled to the course
 * Redirects to course details page if not entitled
 */
export const entitlementGuard: CanActivateFn = (route) => {
  const entitlementsRepo = inject(EntitlementsRepo);
  const router = inject(Router);

  const courseId = route.paramMap.get('id');

  if (!courseId) {
    console.error('Entitlement guard: No course ID in route');
    return router.createUrlTree(['/app/courses']);
  }

  return entitlementsRepo.hasCourseEntitlement$(courseId).pipe(
    first(),
    timeout(5000),
    map(hasAccess => {
      console.log('Entitlement guard - courseId:', courseId, 'hasAccess:', hasAccess);

      if (hasAccess) {
        return true;
      }

      // Redirect to course details page
      console.log('Entitlement guard - redirecting to course details');
      // Note: Toast notification could be triggered here via a service
      return router.createUrlTree(['/app/courses', courseId]);
    }),
    catchError(err => {
      console.error('Entitlement guard error:', err);
      // On error, redirect to course details
      return of(router.createUrlTree(['/app/courses', courseId]));
    })
  );
};
