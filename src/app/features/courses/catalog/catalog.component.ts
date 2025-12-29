import { Component, inject, signal, computed, effect, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { Course, COURSE_SUBJECTS, COURSE_LEVELS } from '@core/models/course.interface';
import { CoursesCatalogService } from '@core/services/courses-catalog.service';
import { AuthService } from '@core/services/auth.service';
import { CourseGridComponent } from '@shared/components/course-grid/course-grid.component';
import { HeaderComponent } from '@shared/components/header/header.component';
import { ButtonComponent } from '@shared/components/button/button.component';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, CourseGridComponent, HeaderComponent, ButtonComponent],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.scss'
})
export class CatalogComponent implements OnInit, OnDestroy {
  private readonly catalogService = inject(CoursesCatalogService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();
  private readonly searchDebounce$ = new Subject<string>();

  /** Available filter options */
  readonly subjects = COURSE_SUBJECTS;
  readonly levels = COURSE_LEVELS;

  /** Filter state */
  readonly searchTerm = signal('');
  readonly selectedSubject = signal<string>('');
  readonly selectedLevel = signal<string>('');

  /** Loading state */
  readonly isLoading = signal(true);

  /** All courses */
  private readonly allCourses = toSignal(this.catalogService.allCourses$(), {
    initialValue: []
  });

  /** Filtered courses */
  readonly filteredCourses = computed(() => {
    const courses = this.allCourses();
    const search = this.searchTerm().toLowerCase();
    const subject = this.selectedSubject();
    const level = this.selectedLevel();

    return courses.filter(course => {
      // Subject filter
      if (subject && course.subject !== subject) {
        return false;
      }

      // Level filter
      if (level && course.level !== level) {
        return false;
      }

      // Search filter
      if (search) {
        const inTitle = course.title.toLowerCase().includes(search);
        const inDesc = course.shortDescription.toLowerCase().includes(search);
        if (!inTitle && !inDesc) {
          return false;
        }
      }

      return true;
    });
  });

  /** Results count */
  readonly resultsCount = computed(() => this.filteredCourses().length);

  /** Has active filters */
  readonly hasActiveFilters = computed(() =>
    this.searchTerm() !== '' ||
    this.selectedSubject() !== '' ||
    this.selectedLevel() !== ''
  );

  /** Is user authenticated */
  readonly isAuthenticated = this.authService.isAuthenticated;

  constructor() {
    // Setup debounced search
    this.searchDebounce$.pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(term => {
      this.searchTerm.set(term);
    });

    // Stop loading when courses are loaded
    effect(() => {
      if (this.allCourses().length > 0 || this.allCourses() !== null) {
        this.isLoading.set(false);
      }
    });
  }

  ngOnInit(): void {
    // Initial load delay for smooth animation
    setTimeout(() => {
      this.isLoading.set(false);
    }, 500);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Handle search input */
  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchDebounce$.next(value);
  }

  /** Handle subject filter change */
  onSubjectChange(subject: string): void {
    this.selectedSubject.set(subject);
  }

  /** Handle level filter change */
  onLevelChange(level: string): void {
    this.selectedLevel.set(level);
  }

  /** Clear all filters */
  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedSubject.set('');
    this.selectedLevel.set('');
  }

  /** Navigate to course details */
  onCourseClick(course: Course): void {
    // Use public route for non-authenticated users
    if (this.isAuthenticated()) {
      this.router.navigate(['/app/courses', course.id]);
    } else {
      this.router.navigate(['/courses', course.id]);
    }
  }

  /** Sign in with Google - stay on catalog page after sign-in */
  async onSignIn(): Promise<void> {
    try {
      // Pass null to stay on current page instead of redirecting to dashboard
      await this.authService.signInWithGoogle(null);
    } catch {
      // Error handled in AuthService
    }
  }
}
