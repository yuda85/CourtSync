import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  AdminLessonsRepo,
  AdminLesson,
  CreateLessonData,
} from '@core/repos/admin-lessons.repo';
import { AdminCoursesRepo, AdminCourse } from '@core/repos/admin-courses.repo';

type LessonType = 'video' | 'text' | 'quiz';

interface LessonForm {
  title: string;
  description: string;
  type: LessonType;
  durationMinutes: number;
  videoUrl: string;
  content: string;
}

@Component({
  selector: 'app-lesson-editor',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page-header">
      <a [routerLink]="['/admin/courses', courseId, 'lessons']" class="back-link">
        <span class="material-icons">arrow_forward</span>
        חזרה לשיעורים
      </a>
      <div class="header-row">
        <div class="header-info">
          <h1>{{ isEditMode() ? 'עריכת שיעור' : 'שיעור חדש' }}</h1>
          @if (course()) {
            <span class="course-name">{{ course()?.title }}</span>
          }
        </div>
      </div>
    </div>

    <!-- Loading state -->
    @if (isLoading()) {
      <div class="loading-state">
        <div class="spinner"></div>
        <p>טוען...</p>
      </div>
    }

    <!-- Form -->
    @if (!isLoading()) {
      <form class="editor-form" (ngSubmit)="onSubmit()">
        <!-- Basic Info Section -->
        <div class="form-section">
          <h2>פרטי השיעור</h2>

          <div class="form-group">
            <label for="title">כותרת השיעור *</label>
            <input
              type="text"
              id="title"
              [(ngModel)]="form.title"
              name="title"
              required
              placeholder="לדוגמה: מבוא לדיני חוזים"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label for="description">תיאור קצר</label>
            <textarea
              id="description"
              [(ngModel)]="form.description"
              name="description"
              rows="3"
              placeholder="תיאור קצר של השיעור (אופציונלי)"
              class="form-input"
            ></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="type">סוג שיעור *</label>
              <select
                id="type"
                [(ngModel)]="form.type"
                name="type"
                required
                class="form-input"
              >
                <option value="video">וידאו</option>
                <option value="text">טקסט</option>
                <option value="quiz">בוחן</option>
              </select>
            </div>

            <div class="form-group">
              <label for="duration">משך (דקות)</label>
              <input
                type="number"
                id="duration"
                [(ngModel)]="form.durationMinutes"
                name="durationMinutes"
                min="0"
                placeholder="0"
                class="form-input"
              />
            </div>
          </div>
        </div>

        <!-- Video Section -->
        @if (form.type === 'video') {
          <div class="form-section">
            <h2>
              <span class="material-icons section-icon video">play_circle</span>
              הגדרות וידאו
            </h2>

            <div class="form-group">
              <label for="videoUrl">קישור לוידאו *</label>
              <input
                type="url"
                id="videoUrl"
                [(ngModel)]="form.videoUrl"
                name="videoUrl"
                placeholder="https://www.youtube.com/watch?v=..."
                class="form-input"
              />
              <span class="form-hint">
                תומך ב-YouTube, Vimeo או קישור ישיר לקובץ וידאו
              </span>
            </div>

            @if (form.videoUrl) {
              <div class="video-preview">
                <span class="material-icons">ondemand_video</span>
                <span>תצוגה מקדימה של הוידאו תופיע כאן</span>
              </div>
            }
          </div>
        }

        <!-- Text Content Section -->
        @if (form.type === 'text') {
          <div class="form-section">
            <h2>
              <span class="material-icons section-icon text">article</span>
              תוכן טקסטואלי
            </h2>

            <div class="form-group">
              <label for="content">תוכן השיעור *</label>
              <textarea
                id="content"
                [(ngModel)]="form.content"
                name="content"
                rows="15"
                placeholder="כתוב כאן את תוכן השיעור..."
                class="form-input content-textarea"
              ></textarea>
              <span class="form-hint">
                ניתן להשתמש ב-Markdown לעיצוב הטקסט
              </span>
            </div>
          </div>
        }

        <!-- Quiz Section -->
        @if (form.type === 'quiz') {
          <div class="form-section">
            <h2>
              <span class="material-icons section-icon quiz">quiz</span>
              הגדרות בוחן
            </h2>

            <div class="quiz-placeholder">
              <span class="material-icons">construction</span>
              <p>ניהול שאלות לבוחן יהיה זמין בקרוב</p>
              <p class="hint">כרגע ניתן ליצור את השיעור ולהוסיף שאלות בהמשך</p>
            </div>
          </div>
        }

        <!-- Error message -->
        @if (errorMessage()) {
          <div class="error-message">
            <span class="material-icons">error</span>
            {{ errorMessage() }}
          </div>
        }

        <!-- Form Actions -->
        <div class="form-actions">
          <a
            [routerLink]="['/admin/courses', courseId, 'lessons']"
            class="btn-secondary"
          >
            ביטול
          </a>
          <button
            type="submit"
            class="btn-primary"
            [disabled]="isSaving() || !isFormValid()"
          >
            @if (isSaving()) {
              <span class="spinner-small"></span>
              שומר...
            } @else {
              <span class="material-icons">save</span>
              {{ isEditMode() ? 'שמור שינויים' : 'צור שיעור' }}
            }
          </button>
        </div>
      </form>
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

      .loading-state {
        @apply flex flex-col items-center justify-center;
        @apply p-12 rounded-xl;
        @apply bg-[var(--color-bg-primary)] border border-[var(--color-border)];
        @apply text-center;

        p {
          @apply text-[var(--color-text-secondary)];
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

      .editor-form {
        @apply space-y-6;
      }

      .form-section {
        @apply p-6 rounded-xl;
        @apply bg-[var(--color-bg-primary)] border border-[var(--color-border)];

        h2 {
          @apply flex items-center gap-2;
          @apply text-lg font-semibold text-[var(--color-text-primary)] mb-4 pb-3;
          @apply border-b border-[var(--color-border)];
        }
      }

      .section-icon {
        @apply text-xl;

        &.video {
          @apply text-red-500;
        }

        &.text {
          @apply text-blue-500;
        }

        &.quiz {
          @apply text-purple-500;
        }
      }

      .form-group {
        @apply mb-4;

        label {
          @apply block text-sm font-medium text-[var(--color-text-primary)] mb-1.5;
        }
      }

      .form-row {
        @apply grid grid-cols-2 gap-4;
      }

      .form-input {
        @apply w-full px-3 py-2 rounded-lg;
        @apply bg-[var(--color-bg-secondary)] border border-[var(--color-border)];
        @apply text-[var(--color-text-primary)];
        @apply focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)];
        @apply transition-colors duration-200;

        &::placeholder {
          @apply text-[var(--color-text-tertiary)];
        }
      }

      textarea.form-input {
        @apply resize-y;
      }

      .content-textarea {
        @apply font-mono text-sm;
        min-height: 300px;
      }

      select.form-input {
        @apply cursor-pointer;
      }

      .form-hint {
        @apply block text-xs text-[var(--color-text-tertiary)] mt-1;
      }

      .video-preview {
        @apply flex flex-col items-center justify-center gap-2;
        @apply p-8 rounded-lg mt-4;
        @apply bg-[var(--color-bg-secondary)] border-2 border-dashed border-[var(--color-border)];
        @apply text-[var(--color-text-tertiary)];

        .material-icons {
          @apply text-4xl;
        }
      }

      .quiz-placeholder {
        @apply flex flex-col items-center justify-center gap-2;
        @apply p-8 rounded-lg;
        @apply bg-[var(--color-bg-secondary)];
        @apply text-center;

        .material-icons {
          @apply text-4xl text-[var(--color-text-tertiary)];
        }

        p {
          @apply text-[var(--color-text-secondary)];
        }

        .hint {
          @apply text-sm text-[var(--color-text-tertiary)];
        }
      }

      .error-message {
        @apply flex items-center gap-2 p-4 rounded-lg;
        @apply bg-red-50 text-red-700 border border-red-200;

        .material-icons {
          @apply text-xl;
        }
      }

      :host-context([data-theme='dark']) .error-message {
        @apply bg-red-900/20 text-red-400 border-red-800;
      }

      .form-actions {
        @apply flex justify-end gap-3 pt-4;
      }

      .btn-primary {
        @apply flex items-center gap-2 px-6 py-2.5 rounded-lg;
        @apply bg-[var(--color-primary)] text-white;
        @apply hover:bg-[var(--color-primary-dark)];
        @apply transition-colors duration-200;
        @apply border-none cursor-pointer;

        &:disabled {
          @apply opacity-50 cursor-not-allowed;
        }

        .material-icons {
          @apply text-lg;
        }
      }

      .btn-secondary {
        @apply px-6 py-2.5 rounded-lg no-underline;
        @apply bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)];
        @apply hover:bg-[var(--color-bg-tertiary)];
        @apply transition-colors duration-200 border-none cursor-pointer;
      }

      .spinner-small {
        @apply w-4 h-4 border-2 border-white/30 rounded-full;
        border-top-color: white;
        animation: spin 1s linear infinite;
      }
    `,
  ],
})
export class LessonEditorComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminLessonsRepo = inject(AdminLessonsRepo);
  private readonly adminCoursesRepo = inject(AdminCoursesRepo);

  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly isEditMode = signal(false);
  readonly errorMessage = signal('');
  readonly course = signal<AdminCourse | null>(null);

  courseId = '';
  lessonId = '';

  form: LessonForm = {
    title: '',
    description: '',
    type: 'video',
    durationMinutes: 0,
    videoUrl: '',
    content: '',
  };

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get('courseId') || '';
    this.lessonId = this.route.snapshot.paramMap.get('lessonId') || '';
    this.isEditMode.set(!!this.lessonId && this.lessonId !== 'new');

    if (this.courseId) {
      this.loadCourse();

      if (this.isEditMode()) {
        this.loadLesson();
      } else {
        this.isLoading.set(false);
      }
    }
  }

  private loadCourse(): void {
    this.adminCoursesRepo.getCourseById$(this.courseId).subscribe({
      next: (course) => this.course.set(course),
      error: (err) => console.error('Error loading course:', err),
    });
  }

  private loadLesson(): void {
    this.adminLessonsRepo.getLessonById$(this.lessonId).subscribe({
      next: (lesson) => {
        if (lesson) {
          this.form = {
            title: lesson.title || '',
            description: lesson.description || '',
            type: lesson.type || 'video',
            durationMinutes: lesson.durationMinutes || 0,
            videoUrl: lesson.videoUrl || '',
            content: lesson.content || '',
          };
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading lesson:', err);
        this.errorMessage.set('שגיאה בטעינת השיעור');
        this.isLoading.set(false);
      },
    });
  }

  isFormValid(): boolean {
    if (!this.form.title.trim()) return false;

    if (this.form.type === 'video' && !this.form.videoUrl.trim()) {
      return false;
    }

    if (this.form.type === 'text' && !this.form.content.trim()) {
      return false;
    }

    return true;
  }

  async onSubmit(): Promise<void> {
    if (!this.isFormValid()) return;

    this.isSaving.set(true);
    this.errorMessage.set('');

    try {
      // Build lesson data, only including relevant fields
      const lessonData: CreateLessonData = {
        title: this.form.title.trim(),
        description: this.form.description.trim() || undefined,
        type: this.form.type,
        durationMinutes: this.form.durationMinutes || undefined,
      };

      // Add type-specific fields
      if (this.form.type === 'video' && this.form.videoUrl.trim()) {
        lessonData.videoUrl = this.form.videoUrl.trim();
      }

      if (this.form.type === 'text' && this.form.content.trim()) {
        lessonData.content = this.form.content.trim();
      }

      if (this.isEditMode()) {
        await this.adminLessonsRepo.updateLesson(this.lessonId, lessonData);
      } else {
        await this.adminLessonsRepo.createLesson(this.courseId, lessonData);
      }

      // Navigate back to lesson list
      this.router.navigate(['/admin/courses', this.courseId, 'lessons']);
    } catch (err: any) {
      console.error('Error saving lesson:', err);
      this.errorMessage.set(err.message || 'שגיאה בשמירת השיעור');
    } finally {
      this.isSaving.set(false);
    }
  }
}
