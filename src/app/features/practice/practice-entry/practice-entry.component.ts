import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, debounceTime, switchMap, of, combineLatest } from 'rxjs';
import { PracticeSessionService } from '@core/services/practice-session.service';
import { CoursesCatalogService } from '@core/services/courses-catalog.service';
import { Course } from '@core/models/course.interface';
import { QuestionDifficulty, QUESTION_DIFFICULTIES, PracticeFilters } from '@core/models/question.interface';
import { ButtonComponent } from '@shared/components/button/button.component';

@Component({
  selector: 'app-practice-entry',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './practice-entry.component.html',
  styleUrl: './practice-entry.component.scss'
})
export class PracticeEntryComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly practiceService = inject(PracticeSessionService);
  private readonly catalogService = inject(CoursesCatalogService);
  private readonly destroy$ = new Subject<void>();

  /** Course data */
  readonly course = signal<Course | null>(null);
  readonly courseId = signal<string>('');

  /** Lesson ID (optional - for lesson-specific practice) */
  readonly lessonId = signal<string>('');

  /** Loading states */
  readonly isLoading = signal(true);
  readonly isStarting = signal(false);

  /** Available topics */
  readonly topics = signal<string[]>([]);

  /** Filter selections */
  readonly selectedTopic = signal<string | undefined>(undefined);
  readonly selectedDifficulty = signal<QuestionDifficulty | undefined>(undefined);
  readonly onlyMistakes = signal(false);

  /** Question count based on filters */
  readonly questionCount = signal(0);
  readonly isCountLoading = signal(false);

  /** Filter changed subject for debouncing */
  private readonly filterChanged$ = new Subject<void>();

  /** Difficulty options */
  readonly difficulties = QUESTION_DIFFICULTIES;

  /** Computed filters object */
  readonly filters = computed((): PracticeFilters => ({
    topic: this.selectedTopic(),
    difficulty: this.selectedDifficulty(),
    onlyMistakes: this.onlyMistakes(),
    relatedLessonId: this.lessonId() || undefined
  }));

  /** Can start (has questions) */
  readonly canStart = computed(() =>
    !this.isLoading() && !this.isCountLoading() && this.questionCount() > 0
  );

  ngOnInit(): void {
    // Get course ID and optional lesson ID from route
    this.route.paramMap.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const id = params.get('id');
      const lessonId = params.get('lessonId');
      if (id) {
        this.courseId.set(id);
        this.lessonId.set(lessonId || '');
        this.loadCourseData(id);
      }
    });

    // Setup filter change debouncing
    this.filterChanged$.pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.updateQuestionCount();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Load course and topics */
  private loadCourseData(courseId: string): void {
    this.isLoading.set(true);

    combineLatest([
      this.catalogService.getCourse$(courseId),
      this.practiceService.getTopics$(courseId)
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: ([course, topics]) => {
        this.course.set(course);
        this.topics.set(topics);
        this.isLoading.set(false);
        this.updateQuestionCount();
      },
      error: (err) => {
        console.error('Error loading practice data:', err);
        this.isLoading.set(false);
      }
    });
  }

  /** Update question count based on filters */
  private updateQuestionCount(): void {
    const courseId = this.courseId();
    if (!courseId) return;

    this.isCountLoading.set(true);

    this.practiceService.getQuestionCount$(courseId, this.filters()).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (count) => {
        this.questionCount.set(count);
        this.isCountLoading.set(false);
      },
      error: (err) => {
        console.error('Error getting question count:', err);
        this.questionCount.set(0);
        this.isCountLoading.set(false);
      }
    });
  }

  /** Handle topic selection */
  onTopicChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    this.selectedTopic.set(value || undefined);
    this.filterChanged$.next();
  }

  /** Handle difficulty selection */
  onDifficultyChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value as QuestionDifficulty | '';
    this.selectedDifficulty.set(value || undefined);
    this.filterChanged$.next();
  }

  /** Handle mistakes toggle */
  onMistakesToggle(): void {
    this.onlyMistakes.set(!this.onlyMistakes());
    this.filterChanged$.next();
  }

  /** Start practice session */
  onStartPractice(): void {
    const courseId = this.courseId();
    const lessonId = this.lessonId();
    if (!courseId || !this.canStart()) return;

    this.isStarting.set(true);

    this.practiceService.startSession$({
      courseId,
      lessonId: lessonId || undefined,
      filters: this.filters()
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (success) => {
        if (success) {
          // Navigate to lesson-specific or course-level session route
          if (lessonId) {
            this.router.navigate(['/app/courses', courseId, 'learn', lessonId, 'practice', 'session']);
          } else {
            this.router.navigate(['/app/courses', courseId, 'practice', 'session']);
          }
        } else {
          this.isStarting.set(false);
        }
      },
      error: (err) => {
        console.error('Error starting session:', err);
        this.isStarting.set(false);
      }
    });
  }

  /** Go back to course or lesson */
  onBack(): void {
    const lessonId = this.lessonId();
    if (lessonId) {
      // Go back to the lesson
      this.router.navigate(['/app/courses', this.courseId(), 'learn', lessonId]);
    } else {
      // Go back to the course learn page
      this.router.navigate(['/app/courses', this.courseId(), 'learn']);
    }
  }
}
