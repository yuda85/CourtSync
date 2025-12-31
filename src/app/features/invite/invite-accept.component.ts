import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Auth, user, signInWithPopup, GoogleAuthProvider } from '@angular/fire/auth';
import { InvitesRepo } from '@core/repos/invites.repo';
import { UserProfileService } from '@core/services/user-profile.service';
import { AdminInvite, InviteRole } from '@core/models/invite.interface';
import {
  Firestore,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
} from '@angular/fire/firestore';
import { UserRole } from '@core/models/user-profile.interface';

type PageState = 'loading' | 'valid' | 'invalid' | 'expired' | 'used' | 'signing-in' | 'success' | 'error';

@Component({
  selector: 'app-invite-accept',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="invite-page">
      <div class="invite-card">
        <!-- Loading state -->
        @if (state() === 'loading') {
          <div class="state-content">
            <div class="spinner"></div>
            <h2>בודק את ההזמנה...</h2>
          </div>
        }

        <!-- Valid invite - show sign in -->
        @if (state() === 'valid') {
          <div class="state-content">
            <div class="icon-circle success">
              <span class="material-icons">mail</span>
            </div>
            <h2>הזמנה ל{{ getRoleLabel(invite()?.role) }}</h2>
            <p>
              הוזמנת להצטרף כ{{ getRoleLabel(invite()?.role) }} ב-CourtSync.
              <br />
              התחבר עם חשבון Google שלך כדי לקבל את ההזמנה.
            </p>
            <button class="btn-google" (click)="signIn()">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
              התחבר עם Google
            </button>
            <p class="expires-text">
              ההזמנה תקפה עד {{ formatDate(invite()?.expiresAt) }}
            </p>
          </div>
        }

        <!-- Signing in -->
        @if (state() === 'signing-in') {
          <div class="state-content">
            <div class="spinner"></div>
            <h2>מתחבר...</h2>
            <p>אנא המתן בזמן שאנו מעבדים את ההזמנה</p>
          </div>
        }

        <!-- Success -->
        @if (state() === 'success') {
          <div class="state-content">
            <div class="icon-circle success">
              <span class="material-icons">check_circle</span>
            </div>
            <h2>ברוך הבא!</h2>
            <p>
              קיבלת בהצלחה הרשאות {{ getRoleLabel(acceptedRole()) }}.
              <br />
              מעביר אותך לממשק הניהול...
            </p>
          </div>
        }

        <!-- Invalid invite -->
        @if (state() === 'invalid') {
          <div class="state-content">
            <div class="icon-circle error">
              <span class="material-icons">error</span>
            </div>
            <h2>הזמנה לא תקינה</h2>
            <p>
              קישור ההזמנה אינו תקין או שלא נמצא.
              <br />
              אנא פנה למנהל המערכת לקבלת קישור חדש.
            </p>
            <button class="btn-secondary" (click)="goHome()">
              חזרה לדף הבית
            </button>
          </div>
        }

        <!-- Expired invite -->
        @if (state() === 'expired') {
          <div class="state-content">
            <div class="icon-circle warning">
              <span class="material-icons">schedule</span>
            </div>
            <h2>ההזמנה פגה</h2>
            <p>
              קישור ההזמנה פג תוקף.
              <br />
              אנא פנה למנהל המערכת לקבלת קישור חדש.
            </p>
            <button class="btn-secondary" (click)="goHome()">
              חזרה לדף הבית
            </button>
          </div>
        }

        <!-- Already used -->
        @if (state() === 'used') {
          <div class="state-content">
            <div class="icon-circle warning">
              <span class="material-icons">check</span>
            </div>
            <h2>ההזמנה כבר נוצלה</h2>
            <p>
              קישור ההזמנה הזה כבר נוצל.
              <br />
              אם אתה כבר מנהל, התחבר למערכת.
            </p>
            <button class="btn-primary" (click)="goToLogin()">
              התחבר
            </button>
          </div>
        }

        <!-- Error -->
        @if (state() === 'error') {
          <div class="state-content">
            <div class="icon-circle error">
              <span class="material-icons">error</span>
            </div>
            <h2>שגיאה</h2>
            <p>{{ errorMessage() }}</p>
            <button class="btn-secondary" (click)="goHome()">
              חזרה לדף הבית
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .invite-page {
      @apply min-h-screen flex items-center justify-center p-4;
      @apply bg-[var(--color-bg-secondary)];
    }

    .invite-card {
      @apply max-w-md w-full p-8 rounded-2xl;
      @apply bg-[var(--color-bg-primary)] shadow-xl;
      @apply border border-[var(--color-border)];
    }

    .state-content {
      @apply flex flex-col items-center text-center;
    }

    .icon-circle {
      @apply w-20 h-20 rounded-full flex items-center justify-center mb-6;

      .material-icons {
        @apply text-4xl;
      }

      &.success {
        @apply bg-emerald-100 text-emerald-600;
      }

      &.warning {
        @apply bg-amber-100 text-amber-600;
      }

      &.error {
        @apply bg-red-100 text-red-600;
      }
    }

    :host-context([data-theme='dark']) {
      .icon-circle {
        &.success {
          @apply bg-emerald-900/30 text-emerald-400;
        }

        &.warning {
          @apply bg-amber-900/30 text-amber-400;
        }

        &.error {
          @apply bg-red-900/30 text-red-400;
        }
      }
    }

    h2 {
      @apply text-2xl font-bold text-[var(--color-text-primary)] mb-3;
    }

    p {
      @apply text-[var(--color-text-secondary)] mb-6 leading-relaxed;
    }

    .expires-text {
      @apply text-sm text-[var(--color-text-tertiary)] mt-4 mb-0;
    }

    .spinner {
      @apply w-12 h-12 border-4 border-[var(--color-border)] rounded-full mb-6;
      border-top-color: var(--color-primary);
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .btn-google {
      @apply flex items-center justify-center gap-3;
      @apply w-full px-6 py-3 rounded-lg;
      @apply bg-white text-gray-700 font-medium;
      @apply border border-gray-300;
      @apply hover:bg-gray-50 hover:shadow-md;
      @apply transition-all duration-200;
      @apply cursor-pointer;

      img {
        @apply w-5 h-5;
      }
    }

    .btn-primary {
      @apply px-6 py-3 rounded-lg;
      @apply bg-[var(--color-primary)] text-white font-medium;
      @apply hover:bg-[var(--color-primary-dark)];
      @apply transition-colors duration-200;
      @apply cursor-pointer border-none;
    }

    .btn-secondary {
      @apply px-6 py-3 rounded-lg;
      @apply bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] font-medium;
      @apply hover:bg-[var(--color-bg-tertiary)];
      @apply transition-colors duration-200;
      @apply cursor-pointer border-none;
    }
  `]
})
export class InviteAcceptComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly invitesRepo = inject(InvitesRepo);
  private readonly profileService = inject(UserProfileService);

  readonly state = signal<PageState>('loading');
  readonly invite = signal<AdminInvite | null>(null);
  readonly errorMessage = signal<string>('');
  readonly acceptedRole = signal<InviteRole | null>(null);

  ngOnInit(): void {
    this.validateInvite();
  }

  private async validateInvite(): Promise<void> {
    const inviteId = this.route.snapshot.paramMap.get('inviteId');

    if (!inviteId) {
      this.state.set('invalid');
      return;
    }

    try {
      // Get the invite directly
      const invite = await new Promise<AdminInvite | null>((resolve) => {
        this.invitesRepo.getInviteById$(inviteId).subscribe((inv) => resolve(inv));
      });

      if (!invite) {
        this.state.set('invalid');
        return;
      }

      // Check status
      if (invite.status === 'accepted') {
        this.state.set('used');
        return;
      }

      if (invite.status === 'revoked') {
        this.state.set('invalid');
        return;
      }

      // Check expiration
      if (invite.expiresAt && invite.expiresAt.toMillis() < Date.now()) {
        this.state.set('expired');
        return;
      }

      // Valid invite
      this.invite.set(invite);
      this.state.set('valid');
    } catch (err) {
      console.error('Error validating invite:', err);
      this.state.set('invalid');
    }
  }

  async signIn(): Promise<void> {
    const currentInvite = this.invite();
    if (!currentInvite) return;

    this.state.set('signing-in');

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);
      const firebaseUser = result.user;

      if (!firebaseUser) {
        throw new Error('Failed to sign in');
      }

      // Accept the invite
      const role = await this.invitesRepo.acceptInvite(
        currentInvite.id,
        firebaseUser.uid,
        firebaseUser.email || ''
      );

      // Update user profile with new role
      await this.assignRole(firebaseUser.uid, role);

      this.acceptedRole.set(role);
      this.state.set('success');

      // Redirect to admin after a short delay
      setTimeout(() => {
        this.router.navigate(['/admin/dashboard']);
      }, 2000);
    } catch (err: any) {
      console.error('Error accepting invite:', err);

      if (err.code === 'auth/popup-closed-by-user') {
        // User closed the popup, go back to valid state
        this.state.set('valid');
        return;
      }

      this.errorMessage.set(err.message || 'שגיאה בעיבוד ההזמנה');
      this.state.set('error');
    }
  }

  private async assignRole(uid: string, role: InviteRole): Promise<void> {
    const userRef = doc(this.firestore, 'users', uid);

    // Check if user exists
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      // Update existing user
      const userData = userSnap.data();
      const currentRoles = (userData['roles'] || ['student']) as UserRole[];

      // Add the new role if not already present
      const newRoles = [...new Set([...currentRoles, role])];

      await updateDoc(userRef, {
        roles: newRoles,
        updatedAt: serverTimestamp(),
      });
    } else {
      // User profile will be created by UserProfileService on next load
      // We need to create it now with the role
      const firebaseUser = this.auth.currentUser;
      if (firebaseUser) {
        await this.profileService.createOrUpdateProfile(firebaseUser);
        // Now add the role
        await updateDoc(userRef, {
          roles: ['student', role],
          updatedAt: serverTimestamp(),
        });
      }
    }
  }

  getRoleLabel(role: InviteRole | undefined | null): string {
    if (!role) return '';
    return role === 'superadmin' ? 'מנהל ראשי' : 'מנהל תוכן';
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  goToLogin(): void {
    this.router.navigate(['/']);
  }
}
