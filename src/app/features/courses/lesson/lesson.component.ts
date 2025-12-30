import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';
import { Lesson } from '@core/models/lesson.interface';
import { LearningService } from '@core/services/learning.service';
import { ButtonComponent } from '@shared/components/button/button.component';

@Component({
  selector: 'app-lesson',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './lesson.component.html',
  styleUrl: './lesson.component.scss'
})
export class LessonComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly learningService = inject(LearningService);
  private readonly destroy$ = new Subject<void>();

  /** Current lesson */
  readonly lesson = signal<Lesson | null>(null);

  /** Navigation lessons */
  readonly nextLesson = signal<Lesson | null>(null);
  readonly prevLesson = signal<Lesson | null>(null);

  /** Position in course */
  readonly position = signal({ current: 0, total: 0 });

  /** Completion state */
  readonly isCompleted = signal(false);

  /** Loading states */
  readonly isLoading = signal(true);
  readonly isMarkingComplete = signal(false);

  /** Route params */
  private courseId = '';
  private lessonId = '';

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get('id') || '';
    this.lessonId = this.route.snapshot.paramMap.get('lessonId') || '';

    // Track this lesson as current
    this.learningService.updateCurrentLesson(this.courseId, this.lessonId);

    // Load lesson data
    combineLatest([
      this.learningService.getLesson$(this.lessonId),
      this.learningService.getNextLesson$(this.courseId, this.lessonId),
      this.learningService.getPreviousLesson$(this.courseId, this.lessonId),
      this.learningService.getLessonPosition$(this.courseId, this.lessonId),
      this.learningService.isLessonCompleted$(this.courseId, this.lessonId)
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([lesson, next, prev, pos, completed]) => {
      this.lesson.set(lesson);
      this.nextLesson.set(next);
      this.prevLesson.set(prev);
      this.position.set(pos);
      this.isCompleted.set(completed);
      this.isLoading.set(false);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Navigate back to course home */
  onBackToCourse(): void {
    this.router.navigate(['/app/courses', this.courseId, 'learn']);
  }

  /** Navigate to previous lesson */
  onPrevious(): void {
    const prev = this.prevLesson();
    if (prev) {
      this.router.navigate(['/app/courses', this.courseId, 'learn', prev.id]);
    }
  }

  /** Navigate to next lesson */
  onNext(): void {
    const next = this.nextLesson();
    if (next) {
      this.router.navigate(['/app/courses', this.courseId, 'learn', next.id]);
    }
  }

  /** Mark lesson as complete */
  async onMarkComplete(): Promise<void> {
    if (this.isCompleted() || this.isMarkingComplete()) return;

    this.isMarkingComplete.set(true);
    try {
      await this.learningService.markComplete(this.courseId, this.lessonId);
      this.isCompleted.set(true);

      // Auto-navigate to next lesson after a short delay
      const next = this.nextLesson();
      if (next) {
        setTimeout(() => this.onNext(), 1000);
      }
    } catch (err) {
      console.error('Error marking complete:', err);
    } finally {
      this.isMarkingComplete.set(false);
    }
  }

  /** Get video embed URL (supports YouTube) - returns sanitized URL */
  getVideoEmbedUrl(url: string): SafeResourceUrl {
    // YouTube URL patterns
    const youtubeMatch = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
    );

    let embedUrl = url;
    if (youtubeMatch) {
      embedUrl = `https://www.youtube.com/embed/${youtubeMatch[1]}?rel=0`;
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }

  /** Check if URL is a YouTube video */
  isYouTubeUrl(url: string): boolean {
    return url?.includes('youtube.com') || url?.includes('youtu.be');
  }
}
