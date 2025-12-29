import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { Auth, user, authState } from '@angular/fire/auth';
import { map, take, skipWhile, timeout, catchError, first } from 'rxjs/operators';
import { of } from 'rxjs';

/**
 * Guard to protect authenticated routes
 * Redirects unauthenticated users to the landing page
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  // Use authState which properly waits for Firebase to initialize
  // The first emission might be null while initializing, so we need to handle this carefully
  return authState(auth).pipe(
    // Wait for Firebase to finish initializing (first emission is the resolved state)
    first(),
    // Add timeout to prevent infinite waiting
    timeout(5000),
    map(currentUser => {
      console.log('Auth guard - user:', currentUser?.email || 'none');
      if (currentUser) {
        return true;
      }
      // Redirect to landing page if not authenticated
      console.log('Auth guard - redirecting to landing');
      return router.createUrlTree(['/']);
    }),
    catchError(err => {
      console.error('Auth guard error:', err);
      return of(router.createUrlTree(['/']));
    })
  );
};
