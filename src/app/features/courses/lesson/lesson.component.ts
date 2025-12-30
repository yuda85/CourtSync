import { Component, inject, signal, computed, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';
import { Lesson } from '@core/models/lesson.interface';
import { SectionWithLessons } from '@core/models/section.interface';
import { VideoProgress } from '@core/models/progress.interface';
import { LearningService } from '@core/services/learning.service';
import { VideoPlayerService } from '@core/services/video-player.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import { LessonSidebarComponent } from './components/lesson-sidebar/lesson-sidebar.component';
import { NotesPanelComponent } from './components/notes-panel/notes-panel.component';
import { VideoPlayerComponent } from './components/video-player/video-player.component';
import { BookmarksListComponent } from './components/bookmarks-list/bookmarks-list.component';

@Component({
  selector: 'app-lesson',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    LessonSidebarComponent,
    NotesPanelComponent,
    VideoPlayerComponent,
    BookmarksListComponent
  ],
  templateUrl: './lesson.component.html',
  styleUrl: './lesson.component.scss'
})
export class LessonComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly learningService = inject(LearningService);
  private readonly videoPlayerService = inject(VideoPlayerService);
  private readonly destroy$ = new Subject<void>();

  // Current lesson
  readonly lesson = signal<Lesson | null>(null);

  // Navigation lessons
  readonly nextLesson = signal<Lesson | null>(null);
  readonly prevLesson = signal<Lesson | null>(null);

  // Position in course
  readonly position = signal({ current: 0, total: 0 });

  // Completion state
  readonly isCompleted = signal(false);
  readonly isFlagged = signal(false);

  // Loading states
  readonly isLoading = signal(true);
  readonly isMarkingComplete = signal(false);

  // Sidebar state (for mobile)
  readonly sidebarOpen = signal(false);

  // Notes panel state
  readonly notesExpanded = signal(false);

  // Sections with lessons
  readonly sections = signal<SectionWithLessons[]>([]);
  readonly completedLessons = signal<string[]>([]);
  readonly flaggedLessons = signal<string[]>([]);

  // Video progress
  readonly videoProgress = signal<VideoProgress | null>(null);
  readonly currentVideoTime = signal(0);

  // Course info
  readonly courseTitle = signal('');

  // Route params
  private courseId = '';
  private lessonId = '';

  // Computed: check if video lesson
  readonly isVideoLesson = computed(() => this.lesson()?.type === 'video');

  // Screen size check
  readonly isMobile = signal(window.innerWidth < 1024);

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile.set(window.innerWidth < 1024);
  }

  ngOnInit(): void {
    // Subscribe to route param changes
    this.route.paramMap.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      this.courseId = params.get('id') || '';
      this.lessonId = params.get('lessonId') || '';

      console.log('[Lesson] Route params changed:', { courseId: this.courseId, lessonId: this.lessonId });

      this.isLoading.set(true);
      this.sidebarOpen.set(false);

      // Track this lesson as current
      this.learningService.updateCurrentLesson(this.courseId, this.lessonId);

      // Load all data
      this.loadLessonData();
      this.loadSidebarData();
    });
  }

  // Load main lesson data
  private loadLessonData(): void {
    console.log('[Lesson] Loading data for lesson:', this.lessonId);

    combineLatest([
      this.learningService.getLesson$(this.lessonId),
      this.learningService.getNextLesson$(this.courseId, this.lessonId),
      this.learningService.getPreviousLesson$(this.courseId, this.lessonId),
      this.learningService.getLessonPosition$(this.courseId, this.lessonId),
      this.learningService.isLessonCompleted$(this.courseId, this.lessonId),
      this.learningService.isLessonFlagged$(this.courseId, this.lessonId),
      this.learningService.getVideoProgress$(this.courseId, this.lessonId)
    ]).pipe(
      take(1)
    ).subscribe(([lesson, next, prev, pos, completed, flagged, videoProgress]) => {
      console.log('[Lesson] Data loaded:', { lesson: lesson?.title, next: next?.id, prev: prev?.id, pos, completed });

      this.lesson.set(lesson);
      this.nextLesson.set(next);
      this.prevLesson.set(prev);
      this.position.set(pos);
      this.isCompleted.set(completed);
      this.isFlagged.set(flagged);
      this.videoProgress.set(videoProgress);
      this.isLoading.set(false);
    });
  }

  // Load sidebar data (sections)
  private loadSidebarData(): void {
    combineLatest([
      this.learningService.getSectionsWithLessons$(this.courseId),
      this.learningService.getCourseProgress$(this.courseId),
      this.learningService.getFlaggedLessons$(this.courseId)
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([sections, progress, flagged]) => {
      this.sections.set(sections);
      this.completedLessons.set(progress?.completedLessons || []);
      this.flaggedLessons.set(flagged);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Toggle sidebar (mobile)
  toggleSidebar(): void {
    this.sidebarOpen.update(v => !v);
  }

  // Close sidebar
  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  // Toggle notes panel
  toggleNotes(): void {
    this.notesExpanded.update(v => !v);
  }

  // Handle lesson selection from sidebar
  onLessonSelect(lesson: Lesson): void {
    this.sidebarOpen.set(false);
    this.router.navigate(['/app/courses', this.courseId, 'learn', lesson.id]);
  }

  // Navigate back to course home
  onBackToCourse(): void {
    this.router.navigate(['/app/courses', this.courseId, 'learn']);
  }

  // Navigate to previous lesson
  onPrevious(): void {
    const prev = this.prevLesson();
    if (prev) {
      this.router.navigate(['/app/courses', this.courseId, 'learn', prev.id]);
    }
  }

  // Navigate to next lesson
  onNext(): void {
    const next = this.nextLesson();
    if (next) {
      this.router.navigate(['/app/courses', this.courseId, 'learn', next.id]);
    }
  }

  // Mark lesson as complete
  async onMarkComplete(): Promise<void> {
    if (this.isCompleted() || this.isMarkingComplete()) {
      return;
    }

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
      console.error('[Lesson] Error marking complete:', err);
    } finally {
      this.isMarkingComplete.set(false);
    }
  }

  // Toggle lesson flag
  async onToggleFlag(): Promise<void> {
    try {
      await this.learningService.toggleLessonFlag(this.courseId, this.lessonId);
      this.isFlagged.update(v => !v);
    } catch (err) {
      console.error('[Lesson] Error toggling flag:', err);
    }
  }

  // Navigate to lesson-specific practice
  onStartPractice(): void {
    this.router.navigate(['/app/courses', this.courseId, 'learn', this.lessonId, 'practice']);
  }

  // Handle video time update
  onVideoTimeUpdate(time: number): void {
    this.currentVideoTime.set(time);
  }

  // Handle bookmark request from video player
  async onBookmarkRequest(timestamp: number): Promise<void> {
    // The bookmarks-list component will handle creation
    // This is just for coordination if needed
    console.log('[Lesson] Bookmark requested at:', timestamp);
  }

  // Handle timestamp click from notes (seek video)
  onTimestampClick(timestamp: number): void {
    this.videoPlayerService.seekTo(timestamp);
  }

  // Get course ID for child components
  getCourseId(): string {
    return this.courseId;
  }

  // Get lesson ID for child components
  getLessonId(): string {
    return this.lessonId;
  }
}
