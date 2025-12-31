import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Auth, user } from '@angular/fire/auth';
import { UserProfile } from '@core/models/user-profile.interface';
import { UserProfileService } from '@core/services/user-profile.service';
import { AuthService } from '@core/services/auth.service';
import { ThemeService, ThemeMode } from '@core/services/theme.service';
import { RoleService } from '@core/services/role.service';
import { DashboardService, DashboardVM, ContinueLearningVM, CourseProgressCardVM } from '@core/services/dashboard.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import { ProgressBarComponent } from '@shared/components/progress-bar/progress-bar.component';
import { ProgressPillComponent } from '@shared/components/progress-pill/progress-pill.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ButtonComponent, ProgressBarComponent, ProgressPillComponent, RouterLink],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);
  private readonly profileService = inject(UserProfileService);
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly roleService = inject(RoleService);
  private readonly dashboardService = inject(DashboardService);
  private readonly destroy$ = new Subject<void>();

  /** User profile data */
  readonly profile = signal<UserProfile | null>(null);

  /** Firebase user for display info */
  readonly firebaseUser = signal<any>(null);

  /** Dashboard data (courses, stats, continue learning) */
  readonly dashboardData = signal<DashboardVM | null>(null);

  /** Loading state */
  readonly isLoading = signal(true);

  /** Current theme */
  readonly currentTheme = computed(() => this.themeService.themeMode());

  /** Continue learning hero data */
  readonly continueLearning = computed<ContinueLearningVM | null>(() => {
    const data = this.dashboardData();
    return data?.continueLearning ?? null;
  });

  /** All courses sorted by recent activity */
  readonly allCourses = computed<CourseProgressCardVM[]>(() => {
    const data = this.dashboardData();
    return data?.myCourses ?? [];
  });

  /** Stats from dashboard */
  readonly activeCourses = computed(() => this.dashboardData()?.stats.activeCourses ?? 0);
  readonly completedCourses = computed(() => this.dashboardData()?.stats.completedCourses ?? 0);
  readonly totalLessonsCompleted = computed(() => this.dashboardData()?.stats.totalLessonsCompleted ?? 0);

  /** Check if user has any courses */
  readonly hasCourses = computed(() => this.allCourses().length > 0);

  /** Member since formatted date */
  readonly memberSince = computed(() => {
    const profile = this.profile();
    if (!profile?.createdAt) return '';

    const date = profile.createdAt.toDate();
    return new Intl.DateTimeFormat('he-IL', {
      year: 'numeric',
      month: 'long'
    }).format(date);
  });

  /** User roles for display */
  readonly isAdmin = this.roleService.isAdmin;
  readonly isSuperAdmin = this.roleService.isSuperAdmin;

  /** Get role label in Hebrew */
  getRoleLabel(): string {
    if (this.isSuperAdmin()) return 'מנהל ראשי';
    if (this.isAdmin()) return 'מנהל תוכן';
    return 'סטודנט';
  }

  ngOnInit(): void {
    // Get Firebase user
    user(this.auth).pipe(
      takeUntil(this.destroy$)
    ).subscribe(u => {
      this.firebaseUser.set(u);

      if (u) {
        this.loadProfile(u.uid);
      }
    });

    // Load dashboard data (courses, progress, continue learning)
    // Refresh to ensure we get fresh data
    this.dashboardService.refresh();

    this.dashboardService.dashboardVM$().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        this.dashboardData.set(data);
      },
      error: (err) => {
        console.error('Error loading dashboard data:', err);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadProfile(uid: string): Promise<void> {
    try {
      const profile = await this.profileService.getProfile(uid);
      this.profile.set(profile);
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Navigate to continue learning */
  onContinueLearning(): void {
    const cl = this.continueLearning();
    if (cl?.route) {
      this.router.navigate([cl.route]);
    }
  }

  /** Navigate to course */
  onCourseClick(card: CourseProgressCardVM): void {
    this.router.navigate([card.ctaRoute]);
  }

  /** Navigate to catalog */
  onBrowseCatalog(): void {
    this.router.navigate(['/app/courses']);
  }

  /** Set theme */
  setTheme(theme: ThemeMode): void {
    this.themeService.setTheme(theme);
  }

  /** Sign out */
  async onSignOut(): Promise<void> {
    await this.authService.signOut();
  }
}
