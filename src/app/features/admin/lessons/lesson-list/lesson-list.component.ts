import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { AdminLessonsRepo, AdminLesson } from '@core/repos/admin-lessons.repo';
import { AdminCoursesRepo, AdminCourse } from '@core/repos/admin-courses.repo';
import { LESSON_TYPE_ICONS } from '@core/models/lesson.interface';

@Component({
  selector: 'app-lesson-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-header">
      <a routerLink="/admin/courses" class="back-link">
        <span class="material-icons">arrow_forward</span>
        חזרה לקורסים
      </a>
      <div class="header-row">
        <div class="header-info">
          <h1>ניהול שיעורים</h1>
          @if (course()) {
            <span class="course-name">{{ course()?.title }}</span>
          }
        </div>
        <a [routerLink]="['/admin/courses', courseId, 'lessons', 'new']" class="btn-primary">
          <span class="material-icons">add</span>
          שיעור חדש
        </a>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-item">
        <span class="stat-value">{{ totalLessons() }}</span>
        <span class="stat-label">סה"כ שיעורים</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ videoCount() }}</span>
        <span class="stat-label">וידאו</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ textCount() }}</span>
        <span class="stat-label">טקסט</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ quizCount() }}</span>
        <span class="stat-label">בוחן</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ totalDuration() }}</span>
        <span class="stat-label">דקות</span>
      </div>
    </div>

    <!-- Loading -->
    @if (isLoading()) {
      <div class="loading-state">
        <div class="spinner"></div>
        <p>טוען שיעורים...</p>
      </div>
    }

    <!-- Empty state -->
    @if (!isLoading() && lessons().length === 0) {
      <div class="empty-state">
        <span class="material-icons">play_lesson</span>
        <p>עדיין אין שיעורים בקורס זה</p>
        <a [routerLink]="['/admin/courses', courseId, 'lessons', 'new']" class="btn-primary">
          הוסף את השיעור הראשון
        </a>
      </div>
    }

    <!-- Lessons list -->
    @if (!isLoading() && lessons().length > 0) {
      <div class="lessons-list">
        @for (lesson of lessons(); track lesson.id; let i = $index) {
          <div class="lesson-card">
            <div class="lesson-order">{{ i + 1 }}</div>
            <div class="lesson-icon" [attr.data-type]="lesson.type">
              <span class="material-icons">{{ getTypeIcon(lesson.type) }}</span>
            </div>
            <div class="lesson-info">
              <h3>{{ lesson.title }}</h3>
              @if (lesson.description) {
                <p>{{ lesson.description }}</p>
              }
              <div class="lesson-meta">
                <span class="type-badge" [attr.data-type]="lesson.type">
                  {{ getTypeLabel(lesson.type) }}
                </span>
                @if (lesson.durationMinutes) {
                  <span class="duration">
                    <span class="material-icons">schedule</span>
                    {{ lesson.durationMinutes }} דק'
                  </span>
                }
              </div>
            </div>
            <div class="lesson-actions">
              <a
                [routerLink]="['/admin/courses', courseId, 'lessons', lesson.id, 'edit']"
                class="action-btn"
                title="עריכה"
              >
                <span class="material-icons">edit</span>
              </a>
              <button
                class="action-btn"
                (click)="duplicateLesson(lesson)"
                [disabled]="isUpdating()"
                title="שכפל"
              >
                <span class="material-icons">content_copy</span>
              </button>
              <button
                class="action-btn action-delete"
                (click)="confirmDelete(lesson)"
                title="מחק"
              >
                <span class="material-icons">delete</span>
              </button>
            </div>
          </div>
        }
      </div>
    }

    <!-- Delete confirmation modal -->
    @if (lessonToDelete()) {
      <div class="modal-overlay" (click)="cancelDelete()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h3>מחיקת שיעור</h3>
          <p>האם אתה בטוח שברצונך למחוק את השיעור "{{ lessonToDelete()?.title }}"?</p>
          <p class="warning-text">פעולה זו אינה ניתנת לביטול.</p>
          <div class="modal-actions">
            <button class="btn-secondary" (click)="cancelDelete()">ביטול</button>
            <button class="btn-danger" (click)="deleteLesson()" [disabled]="isDeleting()">
              @if (isDeleting()) {
                מוחק...
              } @else {
                מחק
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .page-header {
        @apply mb-6;
      }

      .back-link {
        @apply inline-flex items-center gap-1;
        @apply text-sm text-[var(--color-text-secondary)] no-underline;
        @apply hover:text-[var(--color-primary)];

        .material-icons {
          @apply text-lg;
        }
      }

      .header-row {
        @apply flex items-center justify-between mt-2;
      }

      .header-info {
        h1 {
          @apply text-xl font-bold text-[var(--color-text-primary)];
        }

        .course-name {
          @apply text-sm text-[var(--color-text-secondary)];
        }
      }

      .btn-primary {
        @apply flex items-center gap-2 px-4 py-2 rounded-lg;
        @apply bg-[var(--color-primary)] text-white no-underline;
        @apply hover:bg-[var(--color-primary-dark)];
        @apply transition-colors duration-200;

        .material-icons {
          @apply text-lg;
        }
      }

      .stats-row {
        @apply flex flex-wrap gap-4 mb-6;
      }

      .stat-item {
        @apply flex flex-col items-center;
        @apply px-6 py-3 rounded-xl;
        @apply bg-[var(--color-bg-primary)] border border-[var(--color-border)];
        @apply min-w-[80px];
      }

      .stat-value {
        @apply text-2xl font-bold text-[var(--color-primary)];
      }

      .stat-label {
        @apply text-sm text-[var(--color-text-secondary)];
      }

      .loading-state,
      .empty-state {
        @apply flex flex-col items-center justify-center;
        @apply p-12 rounded-xl;
        @apply bg-[var(--color-bg-primary)] border border-[var(--color-border)];
        @apply text-center;

        .material-icons {
          @apply text-6xl text-[var(--color-text-tertiary)] mb-4;
        }

        p {
          @apply text-[var(--color-text-secondary)] mb-4;
        }
      }

      .spinner {
        @apply w-8 h-8 border-4 border-[var(--color-border)] rounded-full mb-4;
        border-top-color: var(--color-primary);
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .lessons-list {
        @apply space-y-3;
      }

      .lesson-card {
        @apply flex items-center gap-4;
        @apply p-4 rounded-xl;
        @apply bg-[var(--color-bg-primary)] border border-[var(--color-border)];
        @apply transition-all duration-200;

        &:hover {
          @apply border-[var(--color-primary)] shadow-sm;
        }
      }

      .lesson-order {
        @apply w-8 h-8 rounded-full;
        @apply bg-[var(--color-bg-secondary)];
        @apply flex items-center justify-center;
        @apply text-sm font-bold text-[var(--color-text-secondary)];
      }

      .lesson-icon {
        @apply w-10 h-10 rounded-lg;
        @apply flex items-center justify-center;

        &[data-type='video'] {
          @apply bg-red-100 text-red-600;
        }

        &[data-type='text'] {
          @apply bg-blue-100 text-blue-600;
        }

        &[data-type='quiz'] {
          @apply bg-purple-100 text-purple-600;
        }
      }

      :host-context([data-theme='dark']) .lesson-icon {
        &[data-type='video'] {
          @apply bg-red-900/30 text-red-400;
        }

        &[data-type='text'] {
          @apply bg-blue-900/30 text-blue-400;
        }

        &[data-type='quiz'] {
          @apply bg-purple-900/30 text-purple-400;
        }
      }

      .lesson-info {
        @apply flex-1;

        h3 {
          @apply font-medium text-[var(--color-text-primary)];
        }

        p {
          @apply text-sm text-[var(--color-text-tertiary)] mt-1;
        }
      }

      .lesson-meta {
        @apply flex items-center gap-3 mt-2;
      }

      .type-badge {
        @apply px-2 py-0.5 rounded text-xs font-medium;

        &[data-type='video'] {
          @apply bg-red-100 text-red-700;
        }

        &[data-type='text'] {
          @apply bg-blue-100 text-blue-700;
        }

        &[data-type='quiz'] {
          @apply bg-purple-100 text-purple-700;
        }
      }

      :host-context([data-theme='dark']) .type-badge {
        &[data-type='video'] {
          @apply bg-red-900/30 text-red-400;
        }

        &[data-type='text'] {
          @apply bg-blue-900/30 text-blue-400;
        }

        &[data-type='quiz'] {
          @apply bg-purple-900/30 text-purple-400;
        }
      }

      .duration {
        @apply flex items-center gap-1;
        @apply text-xs text-[var(--color-text-tertiary)];

        .material-icons {
          @apply text-sm;
        }
      }

      .lesson-actions {
        @apply flex gap-1;
      }

      .action-btn {
        @apply w-8 h-8 rounded-lg;
        @apply flex items-center justify-center;
        @apply text-[var(--color-text-secondary)];
        @apply hover:bg-[var(--color-bg-secondary)];
        @apply transition-colors duration-200;
        @apply border-none cursor-pointer bg-transparent no-underline;

        .material-icons {
          @apply text-lg;
        }

        &:disabled {
          @apply opacity-50 cursor-not-allowed;
        }

        &.action-delete:hover {
          @apply text-red-600;
        }
      }

      .modal-overlay {
        @apply fixed inset-0 z-50;
        @apply flex items-center justify-center;
        @apply bg-black/50 backdrop-blur-sm;
      }

      .modal-content {
        @apply p-6 rounded-xl;
        @apply bg-[var(--color-bg-primary)];
        @apply max-w-md w-full mx-4;
        @apply shadow-xl;

        h3 {
          @apply text-lg font-bold text-[var(--color-text-primary)] mb-4;
        }

        p {
          @apply text-[var(--color-text-secondary)] mb-2;
        }

        .warning-text {
          @apply text-red-600 text-sm;
        }
      }

      .modal-actions {
        @apply flex gap-3 justify-end mt-6;
      }

      .btn-secondary {
        @apply px-4 py-2 rounded-lg;
        @apply bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)];
        @apply hover:bg-[var(--color-bg-tertiary)];
        @apply transition-colors duration-200 border-none cursor-pointer;
      }

      .btn-danger {
        @apply px-4 py-2 rounded-lg;
        @apply bg-red-600 text-white;
        @apply hover:bg-red-700;
        @apply transition-colors duration-200 border-none cursor-pointer;

        &:disabled {
          @apply opacity-50 cursor-not-allowed;
        }
      }
    `,
  ],
})
export class LessonListComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly adminLessonsRepo = inject(AdminLessonsRepo);
  private readonly adminCoursesRepo = inject(AdminCoursesRepo);

  readonly isLoading = signal(true);
  readonly isUpdating = signal(false);
  readonly isDeleting = signal(false);
  readonly lessons = signal<AdminLesson[]>([]);
  readonly course = signal<AdminCourse | null>(null);
  readonly lessonToDelete = signal<AdminLesson | null>(null);

  courseId: string = '';

  readonly totalLessons = computed(() => this.lessons().length);
  readonly videoCount = computed(
    () => this.lessons().filter((l) => l.type === 'video').length
  );
  readonly textCount = computed(
    () => this.lessons().filter((l) => l.type === 'text').length
  );
  readonly quizCount = computed(
    () => this.lessons().filter((l) => l.type === 'quiz').length
  );
  readonly totalDuration = computed(() =>
    this.lessons().reduce((sum, l) => sum + (l.durationMinutes || 0), 0)
  );

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get('courseId') || '';
    if (this.courseId) {
      this.loadCourse();
      this.loadLessons();
    }
  }

  private loadCourse(): void {
    this.adminCoursesRepo.getCourseById$(this.courseId).subscribe({
      next: (course) => this.course.set(course),
      error: (err) => console.error('Error loading course:', err),
    });
  }

  private loadLessons(): void {
    this.isLoading.set(true);

    this.adminLessonsRepo.getLessonsForCourse$(this.courseId).subscribe({
      next: (lessons) => {
        this.lessons.set(lessons);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading lessons:', err);
        this.isLoading.set(false);
      },
    });
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      video: 'play_circle',
      text: 'article',
      quiz: 'quiz',
    };
    return icons[type] || 'description';
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      video: 'וידאו',
      text: 'טקסט',
      quiz: 'בוחן',
    };
    return labels[type] || type;
  }

  async duplicateLesson(lesson: AdminLesson): Promise<void> {
    this.isUpdating.set(true);
    try {
      await this.adminLessonsRepo.duplicateLesson(lesson.id);
      this.loadLessons();
    } catch (err) {
      console.error('Error duplicating lesson:', err);
    } finally {
      this.isUpdating.set(false);
    }
  }

  confirmDelete(lesson: AdminLesson): void {
    this.lessonToDelete.set(lesson);
  }

  cancelDelete(): void {
    this.lessonToDelete.set(null);
  }

  async deleteLesson(): Promise<void> {
    const lesson = this.lessonToDelete();
    if (!lesson) return;

    this.isDeleting.set(true);
    try {
      await this.adminLessonsRepo.deleteLesson(lesson.id);
      this.lessonToDelete.set(null);
      this.loadLessons();
    } catch (err) {
      console.error('Error deleting lesson:', err);
    } finally {
      this.isDeleting.set(false);
    }
  }
}
