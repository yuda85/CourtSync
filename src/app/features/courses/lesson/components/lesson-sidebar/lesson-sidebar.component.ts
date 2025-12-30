import {
  Component,
  input,
  output,
  signal,
  computed,
  HostListener,
  ElementRef,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Lesson } from '@core/models/lesson.interface';
import { SectionWithLessons } from '@core/models/section.interface';

/**
 * Lesson Sidebar Component
 * Displays course outline with collapsible sections
 * Desktop: Always visible, 280px width
 * Mobile: Slide-in panel with backdrop
 */
@Component({
  selector: 'app-lesson-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lesson-sidebar.component.html',
  styleUrl: './lesson-sidebar.component.scss'
})
export class LessonSidebarComponent {
  private readonly elementRef = inject(ElementRef);

  // Inputs
  readonly sections = input<SectionWithLessons[]>([]);
  readonly currentLessonId = input<string>('');
  readonly completedLessons = input<string[]>([]);
  readonly flaggedLessons = input<string[]>([]);
  readonly isOpen = input<boolean>(false);
  readonly courseTitle = input<string>('');

  // Outputs
  readonly lessonSelect = output<Lesson>();
  readonly close = output<void>();

  // Local state - track expanded sections
  readonly expandedSections = signal<Set<string>>(new Set());

  // Computed: total progress across all sections
  readonly totalProgress = computed(() => {
    const secs = this.sections();
    const totalLessons = secs.reduce((sum, s) => sum + s.totalCount, 0);
    const completedCount = secs.reduce((sum, s) => sum + s.completedCount, 0);
    return {
      completed: completedCount,
      total: totalLessons,
      percent: totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0
    };
  });

  // Initialize expanded sections to include the one with current lesson
  ngOnInit(): void {
    const currentId = this.currentLessonId();
    if (currentId) {
      const sectionWithCurrent = this.sections().find(s =>
        s.lessons.some(l => l.id === currentId)
      );
      if (sectionWithCurrent) {
        this.expandedSections.update(set => {
          const newSet = new Set(set);
          newSet.add(sectionWithCurrent.section.id);
          return newSet;
        });
      }
    }
  }

  // Toggle section expanded state
  toggleSection(sectionId: string): void {
    this.expandedSections.update(set => {
      const newSet = new Set(set);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }

  // Check if section is expanded
  isSectionExpanded(sectionId: string): boolean {
    return this.expandedSections().has(sectionId);
  }

  // Check if lesson is completed
  isLessonCompleted(lessonId: string): boolean {
    return this.completedLessons().includes(lessonId);
  }

  // Check if lesson is flagged
  isLessonFlagged(lessonId: string): boolean {
    return this.flaggedLessons().includes(lessonId);
  }

  // Check if lesson is current
  isCurrentLesson(lessonId: string): boolean {
    return this.currentLessonId() === lessonId;
  }

  // Handle lesson click
  onLessonClick(lesson: Lesson): void {
    this.lessonSelect.emit(lesson);
  }

  // Handle backdrop click (mobile)
  onBackdropClick(): void {
    this.close.emit();
  }

  // Handle escape key
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isOpen()) {
      this.close.emit();
    }
  }

  // Get lesson type icon
  getLessonTypeIcon(type: string): string {
    switch (type) {
      case 'video': return 'play_circle';
      case 'text': return 'article';
      case 'quiz': return 'quiz';
      default: return 'description';
    }
  }

  // Get lesson type label (Hebrew)
  getLessonTypeLabel(type: string): string {
    switch (type) {
      case 'video': return 'וידאו';
      case 'text': return 'טקסט';
      case 'quiz': return 'תרגול';
      default: return 'שיעור';
    }
  }

  // Format duration
  formatDuration(minutes?: number): string {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes} דק׳`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs} שעות ${mins} דק׳` : `${hrs} שעות`;
  }
}
