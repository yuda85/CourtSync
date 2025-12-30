import { Component, inject, input, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { ButtonComponent } from '../button/button.component';
import { AuthService } from '@core/services/auth.service';
import { RoleService } from '@core/services/role.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, ThemeToggleComponent, ButtonComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  private readonly authService = inject(AuthService);
  private readonly roleService = inject(RoleService);

  /** Whether to show the sign-in button (for landing page) */
  showSignIn = input(true);

  /** Whether to show user info and sign-out (for authenticated pages) */
  showUserInfo = input(false);

  /** Force solid background (for pages with colored hero sections) */
  solidBackground = input(false);

  /** Stay on current page after sign-in instead of redirecting to dashboard */
  stayOnPageAfterSignIn = input(false);

  /** Current user */
  readonly user = this.authService.user;

  /** Loading state */
  readonly isLoading = this.authService.isLoading;

  /** Whether user is admin or superadmin */
  readonly isAdmin = this.roleService.isAdmin;

  /** Scroll state for header styling */
  readonly isScrolled = signal(false);

  /** Mobile menu state */
  readonly mobileMenuOpen = signal(false);

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.isScrolled.set(window.scrollY > 20);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(v => !v);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  async onSignIn(): Promise<void> {
    try {
      // Pass null to stay on current page, or undefined to go to dashboard
      const redirectUrl = this.stayOnPageAfterSignIn() ? null : undefined;
      await this.authService.signInWithGoogle(redirectUrl);
    } catch {
      // Error is handled in AuthService
    }
  }

  async onSignOut(): Promise<void> {
    try {
      await this.authService.signOut();
    } catch {
      // Error is handled in AuthService
    }
  }
}
