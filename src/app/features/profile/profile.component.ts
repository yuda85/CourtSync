import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Auth, user } from '@angular/fire/auth';
import { UserProfile, UserRole } from '@core/models/user-profile.interface';
import { Entitlement } from '@core/models/entitlement.interface';
import { CourseProgress } from '@core/models/progress.interface';
import { Course } from '@core/models/course.interface';
import { UserProfileService } from '@core/services/user-profile.service';
import { EntitlementsRepo } from '@core/repos/entitlements.repo';
import { LearningService } from '@core/services/learning.service';
import { CoursesCatalogService } from '@core/services/courses-catalog.service';
import { AuthService } from '@core/services/auth.service';
import { ThemeService, ThemeMode } from '@core/services/theme.service';
import { RoleService } from '@core/services/role.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import { ProgressPillComponent } from '@shared/components/progress-pill/progress-pill.component';

interface CourseWithProgress {
  course: Course;
  progress: CourseProgress | null;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ButtonComponent, ProgressPillComponent, RouterLink],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);
  private readonly profileService = inject(UserProfileService);
  private readonly entitlementsRepo = inject(EntitlementsRepo);
  private readonly learningService = inject(LearningService);
  private readonly catalogService = inject(CoursesCatalogService);
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly roleService = inject(RoleService);
  private readonly destroy$ = new Subject<void>();

  /** User profile data */
  readonly profile = signal<UserProfile | null>(null);

  /** Firebase user for display info */
  readonly firebaseUser = signal<any>(null);

  /** Entitlements */
  readonly entitlements = signal<Entitlement[]>([]);

  /** Progress data */
  readonly progressList = signal<CourseProgress[]>([]);

  /** Recent courses with progress */
  readonly recentCourses = signal<CourseWithProgress[]>([]);

  /** Loading state */
  readonly isLoading = signal(true);

  /** Current theme */
  readonly currentTheme = computed(() => this.themeService.themeMode());

  /** Stats */
  readonly purchasedCount = computed(() =>
    this.entitlements().filter(e => e.type === 'course').length
  );

  readonly completedCount = computed(() =>
    this.progressList().filter(p => p.progressPercent === 100).length
  );

  readonly inProgressCount = computed(() =>
    this.progressList().filter(p => p.progressPercent > 0 && p.progressPercent < 100).length
  );

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

    // Load entitlements
    this.entitlementsRepo.myEntitlements$().pipe(
      takeUntil(this.destroy$)
    ).subscribe(ents => {
      this.entitlements.set(ents);
      this.loadRecentCourses(ents);
    });

    // Load progress
    this.learningService.getAllProgress$().pipe(
      takeUntil(this.destroy$)
    ).subscribe(progress => {
      this.progressList.set(progress);
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

  private loadRecentCourses(entitlements: Entitlement[]): void {
    const courseIds = entitlements
      .filter(e => e.type === 'course')
      .slice(0, 5)
      .map(e => e.refId);

    if (courseIds.length === 0) {
      this.recentCourses.set([]);
      return;
    }

    // Load each course with its progress
    const courseObservables = courseIds.map(id =>
      combineLatest([
        this.catalogService.getCourse$(id),
        this.learningService.getCourseProgress$(id)
      ])
    );

    combineLatest(courseObservables).pipe(
      takeUntil(this.destroy$)
    ).subscribe(results => {
      const courses: CourseWithProgress[] = results
        .filter(([course]) => course !== null)
        .map(([course, progress]) => ({
          course: course!,
          progress
        }));

      this.recentCourses.set(courses);
    });
  }

  /** Navigate to course */
  onCourseClick(courseId: string): void {
    this.router.navigate(['/app/courses', courseId, 'learn']);
  }

  /** Navigate to catalog */
  onBrowseCatalog(): void {
    this.router.navigate(['/app/courses']);
  }

  /** Navigate to library */
  onViewLibrary(): void {
    this.router.navigate(['/app/library']);
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
