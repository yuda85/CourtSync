import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  AdminCoursesRepo,
  CreateCourseData,
  UpdateCourseData,
} from '@core/repos/admin-courses.repo';
import { COURSE_SUBJECTS, COURSE_LEVELS } from '@core/models/course.interface';

@Component({
  selector: 'app-course-editor',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  template: `
    <div class="page-header">
      <a routerLink="/admin/courses" class="back-link">
        <span class="material-icons">arrow_forward</span>
        חזרה לרשימה
      </a>
      <h1>{{ isEditMode() ? 'עריכת קורס' : 'קורס חדש' }}</h1>
    </div>

    @if (isLoading()) {
      <div class="loading-state">
        <div class="spinner"></div>
        <p>טוען...</p>
      </div>
    } @else {
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="course-form">
        <!-- Basic Info Section -->
        <div class="form-section">
          <h2>פרטי הקורס</h2>

          <div class="form-group">
            <label for="title">שם הקורס *</label>
            <input
              type="text"
              id="title"
              formControlName="title"
              placeholder="לדוגמה: יסודות דיני חוזים"
            />
            @if (form.get('title')?.touched && form.get('title')?.errors?.['required']) {
              <span class="error-text">שדה חובה</span>
            }
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="subject">נושא *</label>
              <select id="subject" formControlName="subject">
                <option value="">בחר נושא</option>
                @for (subject of subjects; track subject) {
                  <option [value]="subject">{{ subject }}</option>
                }
              </select>
              @if (form.get('subject')?.touched && form.get('subject')?.errors?.['required']) {
                <span class="error-text">שדה חובה</span>
              }
            </div>

            <div class="form-group">
              <label for="level">רמה *</label>
              <select id="level" formControlName="level">
                <option value="">בחר רמה</option>
                @for (level of levels; track level) {
                  <option [value]="level">{{ level }}</option>
                }
              </select>
              @if (form.get('level')?.touched && form.get('level')?.errors?.['required']) {
                <span class="error-text">שדה חובה</span>
              }
            </div>
          </div>

          <div class="form-group">
            <label for="shortDescription">תיאור קצר *</label>
            <input
              type="text"
              id="shortDescription"
              formControlName="shortDescription"
              placeholder="תיאור קצר שיופיע בכרטיס הקורס (עד 150 תווים)"
              maxlength="150"
            />
            <span class="char-count">
              {{ form.get('shortDescription')?.value?.length || 0 }}/150
            </span>
            @if (form.get('shortDescription')?.touched && form.get('shortDescription')?.errors?.['required']) {
              <span class="error-text">שדה חובה</span>
            }
          </div>

          <div class="form-group">
            <label for="longDescription">תיאור מלא *</label>
            <textarea
              id="longDescription"
              formControlName="longDescription"
              rows="5"
              placeholder="תיאור מפורט של הקורס, מה הסטודנטים ילמדו, דרישות קדם וכו'"
            ></textarea>
            @if (form.get('longDescription')?.touched && form.get('longDescription')?.errors?.['required']) {
              <span class="error-text">שדה חובה</span>
            }
          </div>
        </div>

        <!-- Pricing & Duration Section -->
        <div class="form-section">
          <h2>מחיר ומשך</h2>

          <div class="form-row">
            <div class="form-group">
              <label for="priceIls">מחיר (₪) *</label>
              <input
                type="number"
                id="priceIls"
                formControlName="priceIls"
                min="0"
                placeholder="0"
              />
              @if (form.get('priceIls')?.touched && form.get('priceIls')?.errors?.['required']) {
                <span class="error-text">שדה חובה</span>
              }
              @if (form.get('priceIls')?.errors?.['min']) {
                <span class="error-text">המחיר לא יכול להיות שלילי</span>
              }
            </div>

            <div class="form-group">
              <label for="durationMinutes">משך (דקות)</label>
              <input
                type="number"
                id="durationMinutes"
                formControlName="durationMinutes"
                min="0"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <!-- Media Section -->
        <div class="form-section">
          <h2>תמונה</h2>

          <div class="form-group">
            <label for="coverImageUrl">קישור לתמונת כיסוי</label>
            <input
              type="url"
              id="coverImageUrl"
              formControlName="coverImageUrl"
              placeholder="https://example.com/image.jpg"
            />
            <span class="hint-text">הזן URL לתמונה (רוחב מומלץ: 800px)</span>
          </div>

          @if (form.get('coverImageUrl')?.value) {
            <div class="image-preview">
              <img
                [src]="form.get('coverImageUrl')?.value"
                alt="תצוגה מקדימה"
                (error)="onImageError($event)"
              />
            </div>
          }
        </div>

        <!-- Actions -->
        <div class="form-actions">
          <a routerLink="/admin/courses" class="btn-secondary">ביטול</a>

          @if (isEditMode()) {
            <button
              type="button"
              class="btn-secondary"
              (click)="saveDraft()"
              [disabled]="isSaving()"
            >
              שמור טיוטה
            </button>
          }

          <button
            type="submit"
            class="btn-primary"
            [disabled]="form.invalid || isSaving()"
          >
            @if (isSaving()) {
              <span class="spinner-small"></span>
              שומר...
            } @else {
              {{ isEditMode() ? 'עדכן קורס' : 'צור קורס' }}
            }
          </button>
        </div>

        @if (errorMessage()) {
          <div class="error-banner">
            <span class="material-icons">error</span>
            {{ errorMessage() }}
          </div>
        }

        @if (successMessage()) {
          <div class="success-banner">
            <span class="material-icons">check_circle</span>
            {{ successMessage() }}
          </div>
        }
      </form>
    }
  `,
  styles: [
    `
      .page-header {
        @apply mb-6;

        h1 {
          @apply text-xl font-bold text-[var(--color-text-primary)] mt-2;
        }
      }

      .back-link {
        @apply inline-flex items-center gap-1;
        @apply text-sm text-[var(--color-text-secondary)] no-underline;
        @apply hover:text-[var(--color-primary)];

        .material-icons {
          @apply text-lg;
        }
      }

      .loading-state {
        @apply flex flex-col items-center justify-center;
        @apply p-12 rounded-xl;
        @apply bg-[var(--color-bg-primary)] border border-[var(--color-border)];

        p {
          @apply text-[var(--color-text-secondary)];
        }
      }

      .spinner {
        @apply w-8 h-8 border-4 border-[var(--color-border)] rounded-full mb-4;
        border-top-color: var(--color-primary);
        animation: spin 1s linear infinite;
      }

      .spinner-small {
        @apply w-4 h-4 border-2 border-white/30 rounded-full inline-block mr-2;
        border-top-color: white;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .course-form {
        @apply space-y-6;
      }

      .form-section {
        @apply p-6 rounded-xl;
        @apply bg-[var(--color-bg-primary)] border border-[var(--color-border)];

        h2 {
          @apply text-lg font-semibold text-[var(--color-text-primary)] mb-4;
          @apply pb-2 border-b border-[var(--color-border)];
        }
      }

      .form-group {
        @apply mb-4;

        label {
          @apply block text-sm font-medium text-[var(--color-text-secondary)] mb-1;
        }

        input,
        select,
        textarea {
          @apply w-full px-3 py-2 rounded-lg;
          @apply bg-[var(--color-bg-secondary)] border border-[var(--color-border)];
          @apply text-[var(--color-text-primary)];
          @apply outline-none transition-colors duration-200;

          &:focus {
            @apply border-[var(--color-primary)];
          }

          &::placeholder {
            @apply text-[var(--color-text-tertiary)];
          }
        }

        textarea {
          @apply resize-y min-h-[100px];
        }

        select {
          @apply cursor-pointer;
        }
      }

      .form-row {
        @apply grid grid-cols-1 md:grid-cols-2 gap-4;
      }

      .char-count {
        @apply block text-xs text-[var(--color-text-tertiary)] mt-1 text-left;
      }

      .hint-text {
        @apply block text-xs text-[var(--color-text-tertiary)] mt-1;
      }

      .error-text {
        @apply block text-xs text-red-500 mt-1;
      }

      .image-preview {
        @apply mt-4 rounded-lg overflow-hidden;
        @apply border border-[var(--color-border)];
        @apply max-w-md;

        img {
          @apply w-full h-auto;
        }
      }

      .form-actions {
        @apply flex gap-3 justify-end;
        @apply p-6 rounded-xl;
        @apply bg-[var(--color-bg-primary)] border border-[var(--color-border)];
      }

      .btn-primary {
        @apply flex items-center justify-center gap-2 px-6 py-2 rounded-lg;
        @apply bg-[var(--color-primary)] text-white;
        @apply hover:bg-[var(--color-primary-dark)];
        @apply transition-colors duration-200;
        @apply border-none cursor-pointer;

        &:disabled {
          @apply opacity-50 cursor-not-allowed;
        }
      }

      .btn-secondary {
        @apply px-6 py-2 rounded-lg;
        @apply bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)];
        @apply hover:bg-[var(--color-bg-tertiary)];
        @apply transition-colors duration-200;
        @apply border-none cursor-pointer no-underline;
      }

      .error-banner {
        @apply flex items-center gap-2;
        @apply p-4 rounded-lg mt-4;
        @apply bg-red-100 text-red-700;

        .material-icons {
          @apply text-xl;
        }
      }

      :host-context([data-theme='dark']) .error-banner {
        @apply bg-red-900/30 text-red-400;
      }

      .success-banner {
        @apply flex items-center gap-2;
        @apply p-4 rounded-lg mt-4;
        @apply bg-emerald-100 text-emerald-700;

        .material-icons {
          @apply text-xl;
        }
      }

      :host-context([data-theme='dark']) .success-banner {
        @apply bg-emerald-900/30 text-emerald-400;
      }
    `,
  ],
})
export class CourseEditorComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly adminCoursesRepo = inject(AdminCoursesRepo);

  readonly subjects = COURSE_SUBJECTS;
  readonly levels = COURSE_LEVELS;

  readonly isEditMode = signal(false);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  private courseId: string | null = null;

  form: FormGroup = this.fb.group({
    title: ['', [Validators.required]],
    subject: ['', [Validators.required]],
    level: ['', [Validators.required]],
    shortDescription: ['', [Validators.required]],
    longDescription: ['', [Validators.required]],
    priceIls: [0, [Validators.required, Validators.min(0)]],
    durationMinutes: [0],
    coverImageUrl: [''],
  });

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get('courseId');
    this.isEditMode.set(!!this.courseId && this.courseId !== 'new');

    if (this.isEditMode()) {
      this.loadCourse();
    }
  }

  private loadCourse(): void {
    if (!this.courseId) return;

    this.isLoading.set(true);

    this.adminCoursesRepo.getCourseById$(this.courseId).subscribe({
      next: (course) => {
        if (course) {
          this.form.patchValue({
            title: course.title,
            subject: course.subject,
            level: course.level,
            shortDescription: course.shortDescription,
            longDescription: course.longDescription,
            priceIls: course.priceIls,
            durationMinutes: course.durationMinutes || 0,
            coverImageUrl: course.coverImageUrl || '',
          });
        } else {
          this.errorMessage.set('הקורס לא נמצא');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading course:', err);
        this.errorMessage.set('שגיאה בטעינת הקורס');
        this.isLoading.set(false);
      },
    });
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      if (this.isEditMode() && this.courseId) {
        await this.updateCourse();
      } else {
        await this.createCourse();
      }
    } catch (err: any) {
      console.error('Error saving course:', err);
      this.errorMessage.set(err.message || 'שגיאה בשמירת הקורס');
    } finally {
      this.isSaving.set(false);
    }
  }

  private async createCourse(): Promise<void> {
    const data: CreateCourseData = {
      title: this.form.value.title,
      subject: this.form.value.subject,
      level: this.form.value.level,
      shortDescription: this.form.value.shortDescription,
      longDescription: this.form.value.longDescription,
      priceIls: this.form.value.priceIls,
      durationMinutes: this.form.value.durationMinutes || 0,
      coverImageUrl: this.form.value.coverImageUrl || undefined,
    };

    const courseId = await this.adminCoursesRepo.createCourse(data);
    this.successMessage.set('הקורס נוצר בהצלחה!');

    // Navigate to edit mode after creation
    setTimeout(() => {
      this.router.navigate(['/admin/courses', courseId, 'edit']);
    }, 1500);
  }

  private async updateCourse(): Promise<void> {
    if (!this.courseId) return;

    const data: UpdateCourseData = {
      title: this.form.value.title,
      subject: this.form.value.subject,
      level: this.form.value.level,
      shortDescription: this.form.value.shortDescription,
      longDescription: this.form.value.longDescription,
      priceIls: this.form.value.priceIls,
      durationMinutes: this.form.value.durationMinutes || 0,
      coverImageUrl: this.form.value.coverImageUrl || undefined,
    };

    await this.adminCoursesRepo.updateCourse(this.courseId, data);
    this.successMessage.set('הקורס עודכן בהצלחה!');
  }

  async saveDraft(): Promise<void> {
    if (!this.courseId) return;

    this.isSaving.set(true);
    this.errorMessage.set(null);

    try {
      const data: UpdateCourseData = {
        title: this.form.value.title || 'טיוטה ללא שם',
        subject: this.form.value.subject,
        level: this.form.value.level,
        shortDescription: this.form.value.shortDescription,
        longDescription: this.form.value.longDescription,
        priceIls: this.form.value.priceIls || 0,
        durationMinutes: this.form.value.durationMinutes || 0,
        coverImageUrl: this.form.value.coverImageUrl || undefined,
      };

      await this.adminCoursesRepo.updateCourse(this.courseId, data);
      this.successMessage.set('הטיוטה נשמרה');

      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'שגיאה בשמירת הטיוטה');
    } finally {
      this.isSaving.set(false);
    }
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }
}
