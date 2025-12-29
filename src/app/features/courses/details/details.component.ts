import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, switchMap, takeUntil, combineLatest, of } from 'rxjs';
import { Course, CourseOutlineItem } from '@core/models/course.interface';
import { CoursesCatalogService } from '@core/services/courses-catalog.service';
import { EntitlementsRepo } from '@core/repos/entitlements.repo';
import { AuthService } from '@core/services/auth.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import { HeaderComponent } from '@shared/components/header/header.component';

@Component({
  selector: 'app-course-details',
  standalone: true,
  imports: [CommonModule, ButtonComponent, HeaderComponent],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss'
})
export class DetailsComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalogService = inject(CoursesCatalogService);
  private readonly entitlementsRepo = inject(EntitlementsRepo);
  private readonly authService = inject(AuthService);
  private readonly destroy$ = new Subject<void>();

  /** Course data */
  readonly course = signal<Course | null>(null);

  /** Course outline */
  readonly outline = signal<CourseOutlineItem[]>([]);

  /** User has access to this course */
  readonly hasAccess = signal(false);

  /** Is user authenticated */
  readonly isAuthenticated = this.authService.isAuthenticated;

  /** Loading states */
  readonly isLoading = signal(true);
  readonly isPurchasing = signal(false);

  /** Expanded sections in outline */
  readonly expandedSections = signal<Set<string>>(new Set());

  /** Course ID from route */
  private courseId = '';

  /** Formatted duration */
  readonly formattedDuration = computed(() => {
    const course = this.course();
    return course ? this.catalogService.formatDuration(course.durationMinutes) : '';
  });

  /** Formatted price */
  readonly formattedPrice = computed(() => {
    const course = this.course();
    return course ? this.catalogService.formatPrice(course.priceIls) : '';
  });

  /** Subject color class */
  readonly subjectColorClass = computed(() => {
    const course = this.course();
    return course ? this.catalogService.getSubjectColorClass(course.subject) : '';
  });

  /** Level badge class */
  readonly levelBadgeClass = computed(() => {
    const course = this.course();
    return course ? this.catalogService.getLevelBadgeClass(course.level) : '';
  });

  /** Subject gradient */
  readonly subjectGradient = computed(() => {
    const course = this.course();
    return course ? this.catalogService.getSubjectGradient(course.subject) : '';
  });

  /** Is course free? */
  readonly isFree = computed(() => this.course()?.priceIls === 0);

  /** Grouped outline (sections with lessons) */
  readonly groupedOutline = computed(() => {
    const items = this.outline();
    const result: { section: CourseOutlineItem; lessons: CourseOutlineItem[] }[] = [];
    let currentSection: { section: CourseOutlineItem; lessons: CourseOutlineItem[] } | null = null;

    for (const item of items) {
      if (item.type === 'section') {
        if (currentSection) {
          result.push(currentSection);
        }
        currentSection = { section: item, lessons: [] };
      } else if (item.type === 'lesson' && currentSection) {
        currentSection.lessons.push(item);
      }
    }

    if (currentSection) {
      result.push(currentSection);
    }

    return result;
  });

  /** Total lessons count */
  readonly totalLessons = computed(() =>
    this.outline().filter(item => item.type === 'lesson').length
  );

  ngOnInit(): void {
    this.route.paramMap.pipe(
      takeUntil(this.destroy$),
      switchMap(params => {
        this.courseId = params.get('id') || '';
        if (!this.courseId) {
          return of({ course: null, outline: [], hasAccess: false });
        }

        // Only check entitlements if user is authenticated
        const hasAccess$ = this.authService.isAuthenticated()
          ? this.entitlementsRepo.hasCourseEntitlement$(this.courseId)
          : of(false);

        return combineLatest({
          course: this.catalogService.getCourse$(this.courseId),
          outline: this.catalogService.getCourseOutline$(this.courseId),
          hasAccess: hasAccess$
        });
      })
    ).subscribe(({ course, outline, hasAccess }) => {
      this.course.set(course);
      this.outline.set(outline);
      this.hasAccess.set(hasAccess);
      this.isLoading.set(false);

      // Expand first section by default
      if (outline.length > 0) {
        const firstSection = outline.find(item => item.type === 'section');
        if (firstSection) {
          this.expandedSections.set(new Set([firstSection.id]));
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Toggle section expansion */
  toggleSection(sectionId: string): void {
    const expanded = this.expandedSections();
    const newExpanded = new Set(expanded);

    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }

    this.expandedSections.set(newExpanded);
  }

  /** Check if section is expanded */
  isSectionExpanded(sectionId: string): boolean {
    return this.expandedSections().has(sectionId);
  }

  /** Continue to learning page */
  onContinueLearning(): void {
    this.router.navigate(['/app/courses', this.courseId, 'learn']);
  }

  /** Enroll/Purchase course - requires login */
  async onEnroll(): Promise<void> {
    const course = this.course();
    if (!course) return;

    // If not authenticated, sign in first (stay on page after login)
    if (!this.authService.isAuthenticated()) {
      this.isPurchasing.set(true);
      try {
        // Pass null to stay on current page instead of redirecting to dashboard
        await this.authService.signInWithGoogle(null);
        // After login, just stay on the page - user can click again to purchase
        // The page will re-render showing the purchase button instead of login
      } catch {
        // Login cancelled or failed
      } finally {
        this.isPurchasing.set(false);
      }
      return;
    }

    // Already authenticated, proceed with purchase
    await this.completePurchase(course);
  }

  /** Complete the purchase after authentication */
  private async completePurchase(course: Course): Promise<void> {
    this.isPurchasing.set(true);

    try {
      await this.entitlementsRepo.purchaseDemoCourse(course.id, course.priceIls);
      this.hasAccess.set(true);
      // Navigate to learn page after purchase
      this.router.navigate(['/app/courses', this.courseId, 'learn']);
    } catch (error) {
      console.error('Purchase failed:', error);
      // Could show an error toast here
    } finally {
      this.isPurchasing.set(false);
    }
  }

  /** Go back - smart navigation based on context */
  onBack(): void {
    // If authenticated, go to catalog; otherwise go to landing
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/app/courses']);
    } else {
      this.router.navigate(['/']);
    }
  }
}
