import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { map, first, timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

/**
 * Guard to protect guest-only routes (like landing page)
 * Redirects authenticated users to the dashboard
 */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  return authState(auth).pipe(
    // Wait for Firebase to finish initializing
    first(),
    timeout(5000),
    map(currentUser => {
      console.log('Guest guard - user:', currentUser?.email || 'none');
      if (!currentUser) {
        return true;
      }
      // Redirect to dashboard if already authenticated
      console.log('Guest guard - redirecting to dashboard');
      return router.createUrlTree(['/app/dashboard']);
    }),
    catchError(err => {
      console.error('Guest guard error:', err);
      // On error, allow access to landing page
      return of(true);
    })
  );
};
