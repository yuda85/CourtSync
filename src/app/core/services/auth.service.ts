import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, signInWithPopup, signOut, GoogleAuthProvider, user, User } from '@angular/fire/auth';
import { toSignal } from '@angular/core/rxjs-interop';
import { UserProfileService } from './user-profile.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly userProfileService = inject(UserProfileService);

  /** Current Firebase user as a signal */
  readonly user = toSignal(user(this.auth), { initialValue: null });

  /** Whether the user is authenticated */
  readonly isAuthenticated = computed(() => this.user() !== null);

  /** Loading state for auth operations */
  readonly isLoading = signal(false);

  /** Error message from auth operations */
  readonly error = signal<string | null>(null);

  /**
   * Sign in with Google using popup
   * @param redirectUrl - Optional URL to navigate to after sign-in.
   *                      If not provided, navigates to dashboard.
   *                      If null, stays on current page (no navigation).
   */
  async signInWithGoogle(redirectUrl?: string | null): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      console.log('Starting Google sign-in...');
      const result = await signInWithPopup(this.auth, provider);
      console.log('Sign-in successful:', result.user?.email);

      if (result.user) {
        // Create or update user profile in Firestore (non-blocking)
        // Don't await this - navigate immediately
        this.userProfileService.createOrUpdateProfile(result.user)
          .then(() => console.log('Profile updated'))
          .catch(err => console.error('Profile update failed:', err));

        // Navigate based on redirectUrl parameter
        // - undefined: go to dashboard (default behavior for landing page)
        // - null: stay on current page (no navigation)
        // - string: navigate to specified URL
        if (redirectUrl === null) {
          console.log('Staying on current page after sign-in');
        } else {
          const targetUrl = redirectUrl ?? '/app/dashboard';
          console.log('Navigating to:', targetUrl);
          const navResult = await this.router.navigate([targetUrl]);
          console.log('Navigation result:', navResult);
        }
      }
    } catch (err) {
      console.error('Sign in error:', err);
      this.error.set(this.getErrorMessage(err));
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Sign out the current user */
  async signOut(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      await signOut(this.auth);
      await this.router.navigate(['/']);
    } catch (err) {
      console.error('Sign out error:', err);
      this.error.set(this.getErrorMessage(err));
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Get user-friendly error message */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      // Firebase auth error codes
      const errorCode = (error as { code?: string }).code;
      switch (errorCode) {
        case 'auth/popup-closed-by-user':
          return 'החלון נסגר לפני השלמת ההתחברות';
        case 'auth/cancelled-popup-request':
          return 'בקשת ההתחברות בוטלה';
        case 'auth/popup-blocked':
          return 'החלון נחסם על ידי הדפדפן. אנא אפשר חלונות קופצים';
        case 'auth/network-request-failed':
          return 'שגיאת רשת. אנא בדוק את החיבור לאינטרנט';
        default:
          return 'אירעה שגיאה בהתחברות. אנא נסה שנית';
      }
    }
    return 'אירעה שגיאה לא צפויה';
  }
}
