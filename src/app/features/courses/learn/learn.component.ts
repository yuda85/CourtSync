import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, switchMap, takeUntil } from 'rxjs';
import { Course } from '@core/models/course.interface';
import { CoursesCatalogService } from '@core/services/courses-catalog.service';
import { ButtonComponent } from '@shared/components/button/button.component';

@Component({
  selector: 'app-learn',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './learn.component.html',
  styleUrl: './learn.component.scss'
})
export class LearnComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalogService = inject(CoursesCatalogService);
  private readonly destroy$ = new Subject<void>();

  /** Course data */
  readonly course = signal<Course | null>(null);

  /** Loading state */
  readonly isLoading = signal(true);

  /** Course ID */
  private courseId = '';

  ngOnInit(): void {
    this.route.paramMap.pipe(
      takeUntil(this.destroy$),
      switchMap(params => {
        this.courseId = params.get('id') || '';
        return this.catalogService.getCourse$(this.courseId);
      })
    ).subscribe(course => {
      this.course.set(course);
      this.isLoading.set(false);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Navigate back to course details */
  onBack(): void {
    this.router.navigate(['/app/courses', this.courseId]);
  }
}
