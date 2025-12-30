import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { DashboardService, DashboardVM, CourseProgressCardVM } from '@core/services/dashboard.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import { ProgressBarComponent } from '@shared/components/progress-bar/progress-bar.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { CourseProgressCardComponent } from '@shared/components/course-progress-card/course-progress-card.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ButtonComponent,
    ProgressBarComponent,
    EmptyStateComponent,
    CourseProgressCardComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly dashboardService = inject(DashboardService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  /** Dashboard view model */
  readonly vm = signal<DashboardVM | null>(null);

  /** Loading state */
  readonly isLoading = signal(true);

  /** Search/filter state */
  readonly searchQuery = signal('');
  readonly selectedSubject = signal<string | null>(null);
  readonly sortBy = signal<'recent' | 'progress' | 'name'>('recent');

  /** Filtered courses */
  readonly filteredCourses = computed(() => {
    const data = this.vm();
    if (!data) return [];

    let courses = [...data.myCourses];

    // Apply search filter
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      courses = courses.filter(c =>
        c.course.title.toLowerCase().includes(query) ||
        c.course.subject.toLowerCase().includes(query)
      );
    }

    // Apply subject filter
    const subject = this.selectedSubject();
    if (subject) {
      courses = courses.filter(c => c.course.subject === subject);
    }

    // Apply sorting
    switch (this.sortBy()) {
      case 'progress':
        courses.sort((a, b) => b.progressPercent - a.progressPercent);
        break;
      case 'name':
        courses.sort((a, b) => a.course.title.localeCompare(b.course.title, 'he'));
        break;
      case 'recent':
      default:
        // Already sorted by recent in service
        break;
    }

    return courses;
  });

  /** Check if user has any courses */
  readonly hasCourses = computed(() => (this.vm()?.myCourses.length ?? 0) > 0);

  ngOnInit(): void {
    this.loadDashboard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboard(): void {
    this.isLoading.set(true);

    this.dashboardService.dashboardVM$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.vm.set(data);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Dashboard load error:', err);
          this.isLoading.set(false);
        }
      });
  }

  /** Handle search input */
  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  /** Handle subject filter */
  onSubjectFilter(subject: string | null): void {
    this.selectedSubject.set(subject);
  }

  /** Handle sort change */
  onSortChange(sort: 'recent' | 'progress' | 'name'): void {
    this.sortBy.set(sort);
  }

  /** Handle course card click */
  onCourseClick(card: CourseProgressCardVM): void {
    this.router.navigate([card.ctaRoute]);
  }

  /** Navigate to continue learning */
  onContinueLearning(): void {
    const data = this.vm();
    if (data?.continueLearning) {
      this.router.navigate([data.continueLearning.route]);
    }
  }

  /** Navigate to catalog */
  onBrowseCatalog(): void {
    this.router.navigate(['/app/courses']);
  }

  /** Navigate to library */
  onGoToLibrary(): void {
    this.router.navigate(['/app/library']);
  }

  /** Navigate to profile */
  onGoToProfile(): void {
    this.router.navigate(['/app/profile']);
  }

  /** Refresh dashboard data */
  onRefresh(): void {
    this.dashboardService.refresh();
    this.loadDashboard();
  }
}
