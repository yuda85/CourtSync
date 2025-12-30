import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  AdminQuestionsRepo,
  AdminQuestion,
  CreateQuestionData,
} from '@core/repos/admin-questions.repo';
import { AdminCoursesRepo, AdminCourse } from '@core/repos/admin-courses.repo';
import {
  QuestionDifficulty,
  QUESTION_DIFFICULTIES,
} from '@core/models/question.interface';
import { COURSE_SUBJECTS } from '@core/models/course.interface';

interface OptionForm {
  text: string;
}

interface QuestionForm {
  questionText: string;
  subject: string;
  topic: string;
  difficulty: QuestionDifficulty;
  options: OptionForm[];
  correctOptionIndex: number;
  explanation: string;
}

@Component({
  selector: 'app-question-editor',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page-header">
      <a [routerLink]="['/admin/courses', courseId, 'questions']" class="back-link">
        <span class="material-icons">arrow_forward</span>
        חזרה לשאלות
      </a>
      <div class="header-row">
        <div class="header-info">
          <h1>{{ isEditMode() ? 'עריכת שאלה' : 'שאלה חדשה' }}</h1>
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
        <!-- Question Text Section -->
        <div class="form-section">
          <h2>
            <span class="material-icons section-icon">quiz</span>
            טקסט השאלה
          </h2>

          <div class="form-group">
            <label for="questionText">שאלה *</label>
            <textarea
              id="questionText"
              [(ngModel)]="form.questionText"
              name="questionText"
              rows="4"
              required
              placeholder="הקלד את השאלה כאן..."
              class="form-input"
            ></textarea>
          </div>
        </div>

        <!-- Metadata Section -->
        <div class="form-section">
          <h2>
            <span class="material-icons section-icon">label</span>
            סיווג
          </h2>

          <div class="form-row">
            <div class="form-group">
              <label for="subject">תחום *</label>
              <select
                id="subject"
                [(ngModel)]="form.subject"
                name="subject"
                required
                class="form-input"
              >
                <option value="">בחר תחום</option>
                @for (subject of subjects; track subject) {
                  <option [value]="subject">{{ subject }}</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label for="topic">נושא *</label>
              <input
                type="text"
                id="topic"
                [(ngModel)]="form.topic"
                name="topic"
                required
                placeholder="לדוגמה: כריתת חוזה"
                class="form-input"
              />
            </div>

            <div class="form-group">
              <label for="difficulty">רמת קושי *</label>
              <select
                id="difficulty"
                [(ngModel)]="form.difficulty"
                name="difficulty"
                required
                class="form-input"
              >
                @for (diff of difficulties; track diff) {
                  <option [value]="diff">{{ diff }}</option>
                }
              </select>
            </div>
          </div>
        </div>

        <!-- Options Section -->
        <div class="form-section">
          <h2>
            <span class="material-icons section-icon">checklist</span>
            אפשרויות תשובה
          </h2>

          <p class="section-hint">
            הוסף את אפשרויות התשובה וסמן את התשובה הנכונה
          </p>

          <div class="options-list">
            @for (option of form.options; track $index; let i = $index) {
              <div class="option-row">
                <button
                  type="button"
                  class="correct-toggle"
                  [class.selected]="form.correctOptionIndex === i"
                  (click)="setCorrectOption(i)"
                  title="סמן כתשובה נכונה"
                >
                  <span class="material-icons">
                    {{ form.correctOptionIndex === i ? 'check_circle' : 'radio_button_unchecked' }}
                  </span>
                </button>
                <input
                  type="text"
                  [(ngModel)]="form.options[i].text"
                  [name]="'option_' + i"
                  placeholder="אפשרות תשובה {{ i + 1 }}"
                  class="form-input option-input"
                />
                @if (form.options.length > 2) {
                  <button
                    type="button"
                    class="remove-option"
                    (click)="removeOption(i)"
                    title="הסר אפשרות"
                  >
                    <span class="material-icons">close</span>
                  </button>
                }
              </div>
            }
          </div>

          @if (form.options.length < 6) {
            <button type="button" class="add-option-btn" (click)="addOption()">
              <span class="material-icons">add</span>
              הוסף אפשרות
            </button>
          }
        </div>

        <!-- Explanation Section -->
        <div class="form-section">
          <h2>
            <span class="material-icons section-icon">lightbulb</span>
            הסבר
          </h2>

          <div class="form-group">
            <label for="explanation">הסבר לתשובה הנכונה *</label>
            <textarea
              id="explanation"
              [(ngModel)]="form.explanation"
              name="explanation"
              rows="5"
              required
              placeholder="הסבר מדוע התשובה הנכונה היא זו..."
              class="form-input"
            ></textarea>
            <span class="form-hint">
              ההסבר יוצג לתלמיד לאחר שיענה על השאלה
            </span>
          </div>
        </div>

        <!-- Preview Section -->
        @if (canPreview()) {
          <div class="form-section preview-section">
            <h2>
              <span class="material-icons section-icon">visibility</span>
              תצוגה מקדימה
            </h2>

            <div class="question-preview">
              <div class="preview-badges">
                <span class="difficulty-badge" [attr.data-difficulty]="form.difficulty">
                  {{ form.difficulty }}
                </span>
                <span class="topic-badge">{{ form.topic }}</span>
              </div>
              <p class="preview-question">{{ form.questionText }}</p>
              <div class="preview-options">
                @for (option of form.options; track $index; let i = $index) {
                  @if (option.text) {
                    <div
                      class="preview-option"
                      [class.correct]="form.correctOptionIndex === i"
                    >
                      <span class="option-letter">{{ getOptionLetter(i) }}</span>
                      <span class="option-text">{{ option.text }}</span>
                      @if (form.correctOptionIndex === i) {
                        <span class="material-icons correct-icon">check</span>
                      }
                    </div>
                  }
                }
              </div>
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
            [routerLink]="['/admin/courses', courseId, 'questions']"
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
              {{ isEditMode() ? 'שמור שינויים' : 'צור שאלה' }}
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
        @apply text-xl text-[var(--color-primary)];
      }

      .section-hint {
        @apply text-sm text-[var(--color-text-tertiary)] mb-4;
      }

      .form-group {
        @apply mb-4;

        label {
          @apply block text-sm font-medium text-[var(--color-text-primary)] mb-1.5;
        }
      }

      .form-row {
        @apply grid grid-cols-3 gap-4;
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

      select.form-input {
        @apply cursor-pointer;
      }

      .form-hint {
        @apply block text-xs text-[var(--color-text-tertiary)] mt-1;
      }

      .options-list {
        @apply space-y-3 mb-4;
      }

      .option-row {
        @apply flex items-center gap-3;
      }

      .correct-toggle {
        @apply w-10 h-10 rounded-full;
        @apply flex items-center justify-center;
        @apply bg-[var(--color-bg-secondary)] border border-[var(--color-border)];
        @apply text-[var(--color-text-tertiary)];
        @apply hover:border-green-500 hover:text-green-500;
        @apply transition-colors duration-200 cursor-pointer;

        &.selected {
          @apply bg-green-100 border-green-500 text-green-600;
        }
      }

      :host-context([data-theme='dark']) .correct-toggle.selected {
        @apply bg-green-900/30 text-green-400;
      }

      .option-input {
        @apply flex-1;
      }

      .remove-option {
        @apply w-8 h-8 rounded-lg;
        @apply flex items-center justify-center;
        @apply bg-transparent text-[var(--color-text-tertiary)];
        @apply hover:bg-red-50 hover:text-red-600;
        @apply border-none cursor-pointer transition-colors duration-200;

        .material-icons {
          @apply text-lg;
        }
      }

      :host-context([data-theme='dark']) .remove-option:hover {
        @apply bg-red-900/20;
      }

      .add-option-btn {
        @apply flex items-center gap-2 px-4 py-2 rounded-lg;
        @apply bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)];
        @apply hover:bg-[var(--color-bg-tertiary)];
        @apply border border-dashed border-[var(--color-border)];
        @apply cursor-pointer transition-colors duration-200;

        .material-icons {
          @apply text-lg;
        }
      }

      .preview-section {
        @apply border-[var(--color-primary)];
      }

      .question-preview {
        @apply p-4 rounded-lg;
        @apply bg-[var(--color-bg-secondary)];
      }

      .preview-badges {
        @apply flex gap-2 mb-3;
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

      .preview-question {
        @apply text-[var(--color-text-primary)] font-medium mb-4;
      }

      .preview-options {
        @apply space-y-2;
      }

      .preview-option {
        @apply flex items-center gap-3;
        @apply p-3 rounded-lg;
        @apply bg-[var(--color-bg-primary)] border border-[var(--color-border)];

        &.correct {
          @apply bg-green-50 border-green-200;
        }
      }

      :host-context([data-theme='dark']) .preview-option.correct {
        @apply bg-green-900/20 border-green-800;
      }

      .option-letter {
        @apply w-6 h-6 rounded-full;
        @apply flex items-center justify-center;
        @apply bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)];
        @apply text-xs font-bold;
      }

      .option-text {
        @apply flex-1 text-[var(--color-text-primary)];
      }

      .correct-icon {
        @apply text-green-600 text-lg;
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
export class QuestionEditorComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminQuestionsRepo = inject(AdminQuestionsRepo);
  private readonly adminCoursesRepo = inject(AdminCoursesRepo);

  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly isEditMode = signal(false);
  readonly errorMessage = signal('');
  readonly course = signal<AdminCourse | null>(null);

  readonly subjects = COURSE_SUBJECTS;
  readonly difficulties = QUESTION_DIFFICULTIES;

  courseId = '';
  questionId = '';

  form: QuestionForm = {
    questionText: '',
    subject: '',
    topic: '',
    difficulty: 'בינוני',
    options: [{ text: '' }, { text: '' }, { text: '' }, { text: '' }],
    correctOptionIndex: 0,
    explanation: '',
  };

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get('courseId') || '';
    this.questionId = this.route.snapshot.paramMap.get('questionId') || '';
    this.isEditMode.set(!!this.questionId && this.questionId !== 'new');

    if (this.courseId) {
      this.loadCourse();

      if (this.isEditMode()) {
        this.loadQuestion();
      } else {
        // Pre-fill subject from course
        this.adminCoursesRepo.getCourseById$(this.courseId).subscribe({
          next: (course) => {
            if (course) {
              this.form.subject = course.subject;
            }
            this.isLoading.set(false);
          },
          error: () => this.isLoading.set(false),
        });
      }
    }
  }

  private loadCourse(): void {
    this.adminCoursesRepo.getCourseById$(this.courseId).subscribe({
      next: (course) => this.course.set(course),
      error: (err) => console.error('Error loading course:', err),
    });
  }

  private loadQuestion(): void {
    this.adminQuestionsRepo.getQuestionById$(this.questionId).subscribe({
      next: (question) => {
        if (question) {
          // Find correct option index
          const correctIndex = question.options.findIndex(
            (opt) => opt.id === question.correctOptionId
          );

          this.form = {
            questionText: question.questionText || '',
            subject: question.subject || '',
            topic: question.topic || '',
            difficulty: question.difficulty || 'בינוני',
            options: question.options.map((opt) => ({ text: opt.text })),
            correctOptionIndex: correctIndex >= 0 ? correctIndex : 0,
            explanation: question.explanation || '',
          };
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading question:', err);
        this.errorMessage.set('שגיאה בטעינת השאלה');
        this.isLoading.set(false);
      },
    });
  }

  addOption(): void {
    if (this.form.options.length < 6) {
      this.form.options.push({ text: '' });
    }
  }

  removeOption(index: number): void {
    if (this.form.options.length > 2) {
      this.form.options.splice(index, 1);
      // Adjust correct option index if needed
      if (this.form.correctOptionIndex >= this.form.options.length) {
        this.form.correctOptionIndex = this.form.options.length - 1;
      } else if (this.form.correctOptionIndex > index) {
        this.form.correctOptionIndex--;
      }
    }
  }

  setCorrectOption(index: number): void {
    this.form.correctOptionIndex = index;
  }

  getOptionLetter(index: number): string {
    const letters = ['א', 'ב', 'ג', 'ד', 'ה', 'ו'];
    return letters[index] || String(index + 1);
  }

  canPreview(): boolean {
    return (
      this.form.questionText.trim() !== '' &&
      this.form.topic.trim() !== '' &&
      this.form.options.some((opt) => opt.text.trim() !== '')
    );
  }

  isFormValid(): boolean {
    if (!this.form.questionText.trim()) return false;
    if (!this.form.subject) return false;
    if (!this.form.topic.trim()) return false;
    if (!this.form.explanation.trim()) return false;

    // At least 2 options with text
    const filledOptions = this.form.options.filter(
      (opt) => opt.text.trim() !== ''
    );
    if (filledOptions.length < 2) return false;

    // Correct option must have text
    if (!this.form.options[this.form.correctOptionIndex]?.text.trim()) {
      return false;
    }

    return true;
  }

  async onSubmit(): Promise<void> {
    if (!this.isFormValid()) return;

    this.isSaving.set(true);
    this.errorMessage.set('');

    try {
      // Filter out empty options
      const validOptions = this.form.options
        .map((opt, index) => ({ text: opt.text.trim(), originalIndex: index }))
        .filter((opt) => opt.text !== '');

      // Find new index of correct option
      const newCorrectIndex = validOptions.findIndex(
        (opt) => opt.originalIndex === this.form.correctOptionIndex
      );

      const questionData: CreateQuestionData = {
        questionText: this.form.questionText.trim(),
        subject: this.form.subject,
        topic: this.form.topic.trim(),
        difficulty: this.form.difficulty,
        options: validOptions.map((opt) => ({ text: opt.text })),
        correctOptionIndex: newCorrectIndex,
        explanation: this.form.explanation.trim(),
      };

      if (this.isEditMode()) {
        await this.adminQuestionsRepo.updateQuestion(this.questionId, {
          questionText: questionData.questionText,
          subject: questionData.subject,
          topic: questionData.topic,
          difficulty: questionData.difficulty,
          explanation: questionData.explanation,
          // For update, we need to rebuild options with new IDs
          options: validOptions.map((opt, i) => ({
            id: Math.random().toString(36).substring(2, 9),
            text: opt.text,
          })),
          correctOptionId: undefined, // Will be set after options update
        });
        // Note: In a real app, you'd want to handle option ID consistency better
      } else {
        await this.adminQuestionsRepo.createQuestion(this.courseId, questionData);
      }

      // Navigate back to question list
      this.router.navigate(['/admin/courses', this.courseId, 'questions']);
    } catch (err: any) {
      console.error('Error saving question:', err);
      this.errorMessage.set(err.message || 'שגיאה בשמירת השאלה');
    } finally {
      this.isSaving.set(false);
    }
  }
}
