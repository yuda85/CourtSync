import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  AdminQuestionsRepo,
  AdminQuestion,
} from '@core/repos/admin-questions.repo';
import { AdminCoursesRepo, AdminCourse } from '@core/repos/admin-courses.repo';
import { QuestionDifficulty } from '@core/models/question.interface';

@Component({
  selector: 'app-question-list',
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
          <h1>ניהול שאלות</h1>
          @if (course()) {
            <span class="course-name">{{ course()?.title }}</span>
          }
        </div>
        <a
          [routerLink]="['/admin/courses', courseId, 'questions', 'new']"
          class="btn-primary"
        >
          <span class="material-icons">add</span>
          שאלה חדשה
        </a>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-item">
        <span class="stat-value">{{ totalQuestions() }}</span>
        <span class="stat-label">סה"כ שאלות</span>
      </div>
      <div class="stat-item published">
        <span class="stat-value">{{ publishedCount() }}</span>
        <span class="stat-label">פורסמו</span>
      </div>
      <div class="stat-item easy">
        <span class="stat-value">{{ easyCount() }}</span>
        <span class="stat-label">קל</span>
      </div>
      <div class="stat-item medium">
        <span class="stat-value">{{ mediumCount() }}</span>
        <span class="stat-label">בינוני</span>
      </div>
      <div class="stat-item hard">
        <span class="stat-value">{{ hardCount() }}</span>
        <span class="stat-label">קשה</span>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-row">
      <div class="filter-group">
        <label>רמת קושי:</label>
        <select [(ngModel)]="filterDifficulty" class="filter-select">
          <option value="">הכל</option>
          <option value="קל">קל</option>
          <option value="בינוני">בינוני</option>
          <option value="קשה">קשה</option>
        </select>
      </div>
      <div class="filter-group">
        <label>נושא:</label>
        <select [(ngModel)]="filterTopic" class="filter-select">
          <option value="">הכל</option>
          @for (topic of topics(); track topic) {
            <option [value]="topic">{{ topic }}</option>
          }
        </select>
      </div>
      <div class="filter-group">
        <label>סטטוס:</label>
        <select [(ngModel)]="filterStatus" class="filter-select">
          <option value="">הכל</option>
          <option value="published">פורסם</option>
          <option value="draft">טיוטה</option>
        </select>
      </div>
      @if (hasActiveFilters()) {
        <button class="clear-filters" (click)="clearFilters()">
          <span class="material-icons">clear</span>
          נקה סינון
        </button>
      }
    </div>

    <!-- Loading -->
    @if (isLoading()) {
      <div class="loading-state">
        <div class="spinner"></div>
        <p>טוען שאלות...</p>
      </div>
    }

    <!-- Empty state -->
    @if (!isLoading() && filteredQuestions().length === 0) {
      <div class="empty-state">
        <span class="material-icons">quiz</span>
        @if (hasActiveFilters()) {
          <p>לא נמצאו שאלות התואמות לסינון</p>
          <button class="btn-secondary" (click)="clearFilters()">נקה סינון</button>
        } @else {
          <p>עדיין אין שאלות בקורס זה</p>
          <a
            [routerLink]="['/admin/courses', courseId, 'questions', 'new']"
            class="btn-primary"
          >
            הוסף את השאלה הראשונה
          </a>
        }
      </div>
    }

    <!-- Questions list -->
    @if (!isLoading() && filteredQuestions().length > 0) {
      <div class="questions-list">
        @for (question of filteredQuestions(); track question.id) {
          <div class="question-card" [class.published]="question.isPublished">
            <div class="question-header">
              <div class="question-badges">
                <span
                  class="difficulty-badge"
                  [attr.data-difficulty]="question.difficulty"
                >
                  {{ question.difficulty }}
                </span>
                <span class="topic-badge">{{ question.topic }}</span>
                @if (question.isPublished) {
                  <span class="status-badge published">
                    <span class="material-icons">check_circle</span>
                    פורסם
                  </span>
                } @else {
                  <span class="status-badge draft">
                    <span class="material-icons">edit_note</span>
                    טיוטה
                  </span>
                }
              </div>
              <div class="question-actions">
                <a
                  [routerLink]="[
                    '/admin/courses',
                    courseId,
                    'questions',
                    question.id,
                    'edit'
                  ]"
                  class="action-btn"
                  title="עריכה"
                >
                  <span class="material-icons">edit</span>
                </a>
                @if (!question.isPublished) {
                  <button
                    class="action-btn action-publish"
                    (click)="publishQuestion(question)"
                    [disabled]="isUpdating()"
                    title="פרסם"
                  >
                    <span class="material-icons">publish</span>
                  </button>
                } @else {
                  <button
                    class="action-btn"
                    (click)="unpublishQuestion(question)"
                    [disabled]="isUpdating()"
                    title="בטל פרסום"
                  >
                    <span class="material-icons">unpublished</span>
                  </button>
                }
                <button
                  class="action-btn"
                  (click)="duplicateQuestion(question)"
                  [disabled]="isUpdating()"
                  title="שכפל"
                >
                  <span class="material-icons">content_copy</span>
                </button>
                <button
                  class="action-btn action-delete"
                  (click)="confirmDelete(question)"
                  title="מחק"
                >
                  <span class="material-icons">delete</span>
                </button>
              </div>
            </div>
            <div class="question-content">
              <p class="question-text">{{ question.questionText }}</p>
              <div class="options-preview">
                @for (option of question.options; track option.id) {
                  <span
                    class="option-chip"
                    [class.correct]="option.id === question.correctOptionId"
                  >
                    {{ option.text }}
                    @if (option.id === question.correctOptionId) {
                      <span class="material-icons correct-icon">check</span>
                    }
                  </span>
                }
              </div>
            </div>
          </div>
        }
      </div>
    }

    <!-- Delete confirmation modal -->
    @if (questionToDelete()) {
      <div class="modal-overlay" (click)="cancelDelete()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h3>מחיקת שאלה</h3>
          <p>האם אתה בטוח שברצונך למחוק שאלה זו?</p>
          <p class="question-preview">{{ questionToDelete()?.questionText }}</p>
          <p class="warning-text">פעולה זו אינה ניתנת לביטול.</p>
          <div class="modal-actions">
            <button class="btn-secondary" (click)="cancelDelete()">ביטול</button>
            <button
              class="btn-danger"
              (click)="deleteQuestion()"
              [disabled]="isDeleting()"
            >
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

        &.published .stat-value {
          @apply text-green-600;
        }

        &.easy .stat-value {
          @apply text-green-500;
        }

        &.medium .stat-value {
          @apply text-amber-500;
        }

        &.hard .stat-value {
          @apply text-red-500;
        }
      }

      .stat-value {
        @apply text-2xl font-bold text-[var(--color-primary)];
      }

      .stat-label {
        @apply text-sm text-[var(--color-text-secondary)];
      }

      .filters-row {
        @apply flex flex-wrap items-center gap-4 mb-6;
        @apply p-4 rounded-xl;
        @apply bg-[var(--color-bg-primary)] border border-[var(--color-border)];
      }

      .filter-group {
        @apply flex items-center gap-2;

        label {
          @apply text-sm text-[var(--color-text-secondary)];
        }
      }

      .filter-select {
        @apply px-3 py-1.5 rounded-lg;
        @apply bg-[var(--color-bg-secondary)] border border-[var(--color-border)];
        @apply text-[var(--color-text-primary)] text-sm;
        @apply cursor-pointer;
      }

      .clear-filters {
        @apply flex items-center gap-1 px-3 py-1.5 rounded-lg;
        @apply bg-transparent text-[var(--color-text-secondary)];
        @apply hover:text-red-600 hover:bg-red-50;
        @apply border-none cursor-pointer transition-colors duration-200;

        .material-icons {
          @apply text-sm;
        }
      }

      :host-context([data-theme='dark']) .clear-filters:hover {
        @apply bg-red-900/20;
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

      .questions-list {
        @apply space-y-4;
      }

      .question-card {
        @apply p-4 rounded-xl;
        @apply bg-[var(--color-bg-primary)] border border-[var(--color-border)];
        @apply transition-all duration-200;

        &:hover {
          @apply border-[var(--color-primary)] shadow-sm;
        }

        &.published {
          @apply border-l-4 border-l-green-500;
        }
      }

      .question-header {
        @apply flex items-start justify-between gap-4 mb-3;
      }

      .question-badges {
        @apply flex flex-wrap items-center gap-2;
      }

      .difficulty-badge {
        @apply px-2 py-0.5 rounded text-xs font-bold;

        &[data-difficulty='קל'] {
          @apply bg-green-100 text-green-700;
        }

        &[data-difficulty='בינוני'] {
          @apply bg-amber-100 text-amber-700;
        }

        &[data-difficulty='קשה'] {
          @apply bg-red-100 text-red-700;
        }
      }

      :host-context([data-theme='dark']) .difficulty-badge {
        &[data-difficulty='קל'] {
          @apply bg-green-900/30 text-green-400;
        }

        &[data-difficulty='בינוני'] {
          @apply bg-amber-900/30 text-amber-400;
        }

        &[data-difficulty='קשה'] {
          @apply bg-red-900/30 text-red-400;
        }
      }

      .topic-badge {
        @apply px-2 py-0.5 rounded text-xs;
        @apply bg-blue-100 text-blue-700;
      }

      :host-context([data-theme='dark']) .topic-badge {
        @apply bg-blue-900/30 text-blue-400;
      }

      .status-badge {
        @apply flex items-center gap-1 px-2 py-0.5 rounded text-xs;

        .material-icons {
          @apply text-sm;
        }

        &.published {
          @apply bg-green-100 text-green-700;
        }

        &.draft {
          @apply bg-gray-100 text-gray-600;
        }
      }

      :host-context([data-theme='dark']) .status-badge {
        &.published {
          @apply bg-green-900/30 text-green-400;
        }

        &.draft {
          @apply bg-gray-800 text-gray-400;
        }
      }

      .question-actions {
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

        &.action-publish:hover {
          @apply text-green-600;
        }

        &.action-delete:hover {
          @apply text-red-600;
        }
      }

      .question-content {
        .question-text {
          @apply text-[var(--color-text-primary)] mb-3;
          @apply line-clamp-2;
        }
      }

      .options-preview {
        @apply flex flex-wrap gap-2;
      }

      .option-chip {
        @apply inline-flex items-center gap-1;
        @apply px-2 py-1 rounded-lg text-sm;
        @apply bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)];
        @apply border border-[var(--color-border)];

        &.correct {
          @apply bg-green-100 text-green-700 border-green-200;
        }

        .correct-icon {
          @apply text-sm text-green-600;
        }
      }

      :host-context([data-theme='dark']) .option-chip.correct {
        @apply bg-green-900/30 text-green-400 border-green-800;
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

        .question-preview {
          @apply p-3 rounded-lg mb-3;
          @apply bg-[var(--color-bg-secondary)];
          @apply text-sm text-[var(--color-text-primary)];
          @apply line-clamp-2;
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
export class QuestionListComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly adminQuestionsRepo = inject(AdminQuestionsRepo);
  private readonly adminCoursesRepo = inject(AdminCoursesRepo);

  readonly isLoading = signal(true);
  readonly isUpdating = signal(false);
  readonly isDeleting = signal(false);
  readonly questions = signal<AdminQuestion[]>([]);
  readonly course = signal<AdminCourse | null>(null);
  readonly questionToDelete = signal<AdminQuestion | null>(null);
  readonly topics = signal<string[]>([]);

  courseId: string = '';

  // Filters
  filterDifficulty = '';
  filterTopic = '';
  filterStatus = '';

  readonly totalQuestions = computed(() => this.questions().length);
  readonly publishedCount = computed(
    () => this.questions().filter((q) => q.isPublished).length
  );
  readonly easyCount = computed(
    () => this.questions().filter((q) => q.difficulty === 'קל').length
  );
  readonly mediumCount = computed(
    () => this.questions().filter((q) => q.difficulty === 'בינוני').length
  );
  readonly hardCount = computed(
    () => this.questions().filter((q) => q.difficulty === 'קשה').length
  );

  readonly filteredQuestions = computed(() => {
    let result = this.questions();

    if (this.filterDifficulty) {
      result = result.filter((q) => q.difficulty === this.filterDifficulty);
    }

    if (this.filterTopic) {
      result = result.filter((q) => q.topic === this.filterTopic);
    }

    if (this.filterStatus === 'published') {
      result = result.filter((q) => q.isPublished);
    } else if (this.filterStatus === 'draft') {
      result = result.filter((q) => !q.isPublished);
    }

    return result;
  });

  readonly hasActiveFilters = computed(
    () => !!this.filterDifficulty || !!this.filterTopic || !!this.filterStatus
  );

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get('courseId') || '';
    if (this.courseId) {
      this.loadCourse();
      this.loadQuestions();
      this.loadTopics();
    }
  }

  private loadCourse(): void {
    this.adminCoursesRepo.getCourseById$(this.courseId).subscribe({
      next: (course) => this.course.set(course),
      error: (err) => console.error('Error loading course:', err),
    });
  }

  private loadQuestions(): void {
    this.isLoading.set(true);

    this.adminQuestionsRepo.getQuestionsForCourse$(this.courseId).subscribe({
      next: (questions) => {
        this.questions.set(questions);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading questions:', err);
        this.isLoading.set(false);
      },
    });
  }

  private loadTopics(): void {
    this.adminQuestionsRepo.getTopicsForCourse$(this.courseId).subscribe({
      next: (topics) => this.topics.set(topics),
      error: (err) => console.error('Error loading topics:', err),
    });
  }

  clearFilters(): void {
    this.filterDifficulty = '';
    this.filterTopic = '';
    this.filterStatus = '';
  }

  async publishQuestion(question: AdminQuestion): Promise<void> {
    this.isUpdating.set(true);
    try {
      await this.adminQuestionsRepo.publishQuestion(question.id);
      this.loadQuestions();
    } catch (err) {
      console.error('Error publishing question:', err);
    } finally {
      this.isUpdating.set(false);
    }
  }

  async unpublishQuestion(question: AdminQuestion): Promise<void> {
    this.isUpdating.set(true);
    try {
      await this.adminQuestionsRepo.unpublishQuestion(question.id);
      this.loadQuestions();
    } catch (err) {
      console.error('Error unpublishing question:', err);
    } finally {
      this.isUpdating.set(false);
    }
  }

  async duplicateQuestion(question: AdminQuestion): Promise<void> {
    this.isUpdating.set(true);
    try {
      await this.adminQuestionsRepo.duplicateQuestion(question.id);
      this.loadQuestions();
    } catch (err) {
      console.error('Error duplicating question:', err);
    } finally {
      this.isUpdating.set(false);
    }
  }

  confirmDelete(question: AdminQuestion): void {
    this.questionToDelete.set(question);
  }

  cancelDelete(): void {
    this.questionToDelete.set(null);
  }

  async deleteQuestion(): Promise<void> {
    const question = this.questionToDelete();
    if (!question) return;

    this.isDeleting.set(true);
    try {
      await this.adminQuestionsRepo.deleteQuestion(question.id);
      this.questionToDelete.set(null);
      this.loadQuestions();
    } catch (err) {
      console.error('Error deleting question:', err);
    } finally {
      this.isDeleting.set(false);
    }
  }
}
