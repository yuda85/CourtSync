import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, switchMap, shareReplay, catchError, tap } from 'rxjs/operators';
import { Auth, authState, User } from '@angular/fire/auth';
import {
  Firestore,
  doc,
  docData,
  setDoc,
  serverTimestamp,
} from '@angular/fire/firestore';
import {
  UserProfile,
  UserRole,
  ROLE_HIERARCHY,
} from '@core/models/user-profile.interface';

/**
 * Hardcoded initial superadmin email
 * TODO: Remove this after initial setup is confirmed working
 */
const INITIAL_SUPERADMIN_EMAIL = 'yuda8855@gmail.com';

@Injectable({
  providedIn: 'root',
})
export class RoleService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);

  /** Cached current user profile */
  private readonly currentProfile = signal<UserProfile | null>(null);

  /** Observable of current user roles with caching */
  private readonly userRoles$: Observable<UserRole[]>;

  /** Computed signal: true if user is admin or superadmin */
  readonly isAdmin = computed(
    () => this.hasRole('admin') || this.hasRole('superadmin')
  );

  /** Computed signal: true if user is superadmin */
  readonly isSuperAdmin = computed(() => this.hasRole('superadmin'));

  /** Computed signal: true if user is student (default role) */
  readonly isStudent = computed(() => this.hasRole('student'));

  constructor() {
    // Set up reactive user roles stream
    this.userRoles$ = authState(this.auth).pipe(
      switchMap((user) => {
        if (!user) {
          this.currentProfile.set(null);
          return of([] as UserRole[]);
        }
        return this.getUserRoles$(user);
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    // Subscribe to keep signal updated
    this.userRoles$.subscribe();
  }

  /**
   * Get current user's roles as Observable
   * Used by guards for reactive role checking
   */
  currentUserRoles$(): Observable<UserRole[]> {
    return this.userRoles$;
  }

  /**
   * Check if current user has specific role (sync)
   */
  hasRole(role: UserRole): boolean {
    const profile = this.currentProfile();
    return profile?.roles?.includes(role) ?? false;
  }

  /**
   * Check if current user has at least the specified role level
   * Uses ROLE_HIERARCHY for comparison
   */
  hasMinimumRole(minimumRole: UserRole): boolean {
    const profile = this.currentProfile();
    if (!profile?.roles) return false;

    const minimumLevel = ROLE_HIERARCHY[minimumRole];
    return profile.roles.some((r) => ROLE_HIERARCHY[r] >= minimumLevel);
  }

  /**
   * Get current user's UID
   */
  getCurrentUid(): string | null {
    return this.auth.currentUser?.uid ?? null;
  }

  /**
   * Get current user's email
   */
  getCurrentEmail(): string | null {
    return this.auth.currentUser?.email ?? null;
  }

  /**
   * Get current profile (sync)
   */
  getProfile(): UserProfile | null {
    return this.currentProfile();
  }

  /**
   * Force refresh the current user's profile
   */
  async refreshProfile(): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;

    const userRef = doc(this.firestore, 'users', user.uid);
    const userData = await new Promise<UserProfile | null>((resolve) => {
      docData(userRef)
        .pipe(
          map((data) => (data as UserProfile) || null),
          catchError(() => of(null))
        )
        .subscribe((profile) => {
          this.currentProfile.set(profile);
          resolve(profile);
        });
    });
  }

  /**
   * Get user roles, handling initial superadmin setup
   */
  private getUserRoles$(user: User): Observable<UserRole[]> {
    const userRef = doc(this.firestore, 'users', user.uid);

    return docData(userRef).pipe(
      switchMap(async (data) => {
        const profile = data as UserProfile | undefined;

        // Handle initial superadmin setup for designated email
        if (
          user.email?.toLowerCase() === INITIAL_SUPERADMIN_EMAIL.toLowerCase()
        ) {
          if (!profile?.roles || !profile.roles.includes('superadmin')) {
            console.log('Setting up initial superadmin for:', user.email);
            await this.setupInitialSuperadmin(user);
            // Return the new roles
            const updatedProfile: UserProfile = {
              ...(profile || ({} as UserProfile)),
              roles: ['student', 'superadmin'],
            };
            this.currentProfile.set(updatedProfile);
            return ['student', 'superadmin'] as UserRole[];
          }
        }

        if (profile) {
          this.currentProfile.set(profile);
          return (profile.roles || ['student']) as UserRole[];
        }

        return ['student'] as UserRole[];
      }),
      catchError((err) => {
        console.error('Error fetching user roles:', err);
        return of(['student'] as UserRole[]);
      })
    );
  }

  /**
   * One-time setup for initial superadmin
   * This method adds superadmin role to the designated user
   *
   * TODO: Remove this method and INITIAL_SUPERADMIN_EMAIL constant
   * after initial deployment and confirmation that superadmin is set up
   */
  private async setupInitialSuperadmin(user: User): Promise<void> {
    const userRef = doc(this.firestore, 'users', user.uid);

    await setDoc(
      userRef,
      {
        roles: ['student', 'superadmin'],
        lastLoginAt: serverTimestamp(),
      },
      { merge: true }
    );

    console.log('Initial superadmin setup complete for:', user.email);
  }
}
