import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil, switchMap, forkJoin, of } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { Course } from '@core/models/course.interface';
import { Entitlement } from '@core/models/entitlement.interface';
import { EntitlementsRepo } from '@core/repos/entitlements.repo';
import { CoursesCatalogService } from '@core/services/courses-catalog.service';
import { CourseGridComponent } from '@shared/components/course-grid/course-grid.component';
import { ButtonComponent } from '@shared/components/button/button.component';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, CourseGridComponent, ButtonComponent],
  templateUrl: './library.component.html',
  styleUrl: './library.component.scss'
})
export class LibraryComponent implements OnInit, OnDestroy {
  private readonly entitlementsRepo = inject(EntitlementsRepo);
  private readonly catalogService = inject(CoursesCatalogService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  /** User's courses */
  readonly courses = signal<Course[]>([]);

  /** Loading state */
  readonly isLoading = signal(true);

  /** Empty state */
  readonly isEmpty = computed(() => !this.isLoading() && this.courses().length === 0);

  ngOnInit(): void {
    this.entitlementsRepo.myEntitlements$().pipe(
      takeUntil(this.destroy$),
      switchMap(entitlements => {
        // Filter to course entitlements only
        const courseEntitlements = entitlements.filter(e => e.type === 'course');

        if (courseEntitlements.length === 0) {
          return of([]);
        }

        // Fetch course details for each entitlement
        const courseObservables = courseEntitlements.map(e =>
          this.catalogService.getCourse$(e.refId)
        );

        return forkJoin(courseObservables);
      })
    ).subscribe(courses => {
      // Filter out null values (courses that don't exist)
      this.courses.set(courses.filter((c): c is Course => c !== null));
      this.isLoading.set(false);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Navigate to course details */
  onCourseClick(course: Course): void {
    this.router.navigate(['/app/courses', course.id]);
  }

  /** Navigate to catalog */
  onBrowseCatalog(): void {
    this.router.navigate(['/app/courses']);
  }
}
