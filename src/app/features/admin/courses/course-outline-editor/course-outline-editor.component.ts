import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-course-outline-editor',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-header">
      <a routerLink="/admin/courses" class="back-link">
        <span class="material-icons">arrow_forward</span>
        חזרה לרשימה
      </a>
      <h1>עריכת מבנה הקורס</h1>
    </div>
    <div class="placeholder-content">
      <span class="material-icons placeholder-icon">account_tree</span>
      <p>עורך מבנה הקורס יופיע כאן</p>
      <p class="placeholder-hint">בקרוב: גרירה ושחרור של פרקים ושיעורים</p>
    </div>
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

      .placeholder-content {
        @apply flex flex-col items-center justify-center;
        @apply p-12 rounded-xl;
        @apply bg-[var(--color-bg-primary)] border-2 border-dashed border-[var(--color-border)];
        @apply text-center;
      }

      .placeholder-icon {
        @apply text-6xl text-[var(--color-text-tertiary)] mb-4;
      }

      p {
        @apply text-[var(--color-text-secondary)] mb-2;
      }

      .placeholder-hint {
        @apply text-sm text-[var(--color-text-tertiary)];
      }
    `,
  ],
})
export class CourseOutlineEditorComponent {}
