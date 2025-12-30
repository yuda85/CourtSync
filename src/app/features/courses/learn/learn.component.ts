import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Course } from '@core/models/course.interface';
import { Lesson } from '@core/models/lesson.interface';
import { CourseProgress } from '@core/models/progress.interface';
import { CoursesCatalogService } from '@core/services/courses-catalog.service';
import { LearningService } from '@core/services/learning.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import { LessonListComponent } from '@shared/components/lesson-list/lesson-list.component';
import { ProgressPillComponent } from '@shared/components/progress-pill/progress-pill.component';

@Component({
  selector: 'app-learn',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    LessonListComponent,
    ProgressPillComponent
  ],
  templateUrl: './learn.component.html',
  styleUrl: './learn.component.scss'
})
export class LearnComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalogService = inject(CoursesCatalogService);
  private readonly learningService = inject(LearningService);
  private readonly destroy$ = new Subject<void>();

  /** Course data */
  readonly course = signal<Course | null>(null);

  /** Lessons for this course */
  readonly lessons = signal<Lesson[]>([]);

  /** User's progress */
  readonly progress = signal<CourseProgress | null>(null);

  /** Loading state */
  readonly isLoading = signal(true);

  /** Course ID */
  private courseId = '';

  /** Computed: completed lesson IDs */
  readonly completedLessons = computed(() =>
    this.progress()?.completedLessons || []
  );

  /** Computed: current lesson ID */
  readonly currentLessonId = computed(() =>
    this.progress()?.currentLessonId
  );

  /** Computed: progress percentage */
  readonly progressPercent = computed(() =>
    this.progress()?.progressPercent || 0
  );

  /** Computed: total duration in minutes */
  readonly totalDuration = computed(() =>
    this.lessons().reduce((sum, l) => sum + (l.durationMinutes || 0), 0)
  );

  /** Computed: completed lessons count */
  readonly completedCount = computed(() =>
    this.completedLessons().length
  );

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get('id') || '';

    // Start tracking this course
    this.learningService.startCourse(this.courseId);

    // Load all data in parallel
    combineLatest([
      this.catalogService.getCourse$(this.courseId),
      this.learningService.getCourseLessons$(this.courseId),
      this.learningService.getCourseProgress$(this.courseId)
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([course, lessons, progress]) => {
      this.course.set(course);
      this.lessons.set(lessons);
      this.progress.set(progress);
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

  /** Handle lesson click - navigate to lesson player */
  onLessonClick(lesson: Lesson): void {
    this.router.navigate(['/app/courses', this.courseId, 'learn', lesson.id]);
  }

  /** Continue to last lesson or first incomplete */
  onContinue(): void {
    this.learningService.getResumeLesson$(this.courseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(lesson => {
        if (lesson) {
          this.onLessonClick(lesson);
        } else if (this.lessons().length > 0) {
          this.onLessonClick(this.lessons()[0]);
        }
      });
  }

  /** Format duration for display */
  formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} דקות`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours} שעות`;
    return `${hours} שעות ו-${mins} דקות`;
  }

  /** Navigate to practice */
  onPractice(): void {
    this.router.navigate(['/app/courses', this.courseId, 'practice']);
  }
}
