import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminCoursesRepo, AdminCourse } from '@core/repos/admin-courses.repo';
import { RoleService } from '@core/services/role.service';
import { COURSE_SUBJECTS, COURSE_LEVELS } from '@core/models/course.interface';

@Component({
  selector: 'app-course-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page-header">
      <h1>ניהול קורסים</h1>
      <div class="header-actions">
        <!-- Seed button - uncomment if needed
        @if (isSuperAdmin()) {
          <button class="btn-secondary" (click)="seedCourses()" [disabled]="isSeeding()">
            @if (isSeeding()) {
              יוצר...
            } @else {
              הוסף 3 קורסים לדוגמה
            }
          </button>
        }
        -->
        <a routerLink="/admin/courses/new" class="btn-primary">
          <span class="material-icons">add</span>
          קורס חדש
        </a>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <div class="search-box">
        <span class="material-icons">search</span>
        <input
          type="text"
          placeholder="חיפוש לפי שם קורס..."
          [(ngModel)]="searchTerm"
          (ngModelChange)="onSearchChange()"
        />
      </div>

      <div class="filter-group">
        <select [(ngModel)]="statusFilter" (ngModelChange)="onFilterChange()">
          <option value="all">כל הסטטוסים</option>
          <option value="published">פורסם</option>
          <option value="draft">טיוטה</option>
        </select>

        <select [(ngModel)]="subjectFilter" (ngModelChange)="onFilterChange()">
          <option value="all">כל הנושאים</option>
          @for (subject of subjects; track subject) {
            <option [value]="subject">{{ subject }}</option>
          }
        </select>
      </div>
    </div>

    <!-- Stats summary -->
    <div class="stats-row">
      <div class="stat-item">
        <span class="stat-value">{{ totalCourses() }}</span>
        <span class="stat-label">סה"כ קורסים</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ publishedCount() }}</span>
        <span class="stat-label">פורסמו</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ draftCount() }}</span>
        <span class="stat-label">טיוטות</span>
      </div>
    </div>

    <!-- Loading state -->
    @if (isLoading()) {
      <div class="loading-state">
        <div class="spinner"></div>
        <p>טוען קורסים...</p>
      </div>
    }

    <!-- Empty state -->
    @if (!isLoading() && filteredCourses().length === 0) {
      <div class="empty-state">
        <span class="material-icons">school</span>
        @if (searchTerm || statusFilter !== 'all' || subjectFilter !== 'all') {
          <p>לא נמצאו קורסים התואמים לחיפוש</p>
          <button class="btn-secondary" (click)="clearFilters()">
            נקה סינון
          </button>
        } @else {
          <p>עדיין אין קורסים</p>
          <a routerLink="/admin/courses/new" class="btn-primary">
            צור את הקורס הראשון
          </a>
        }
      </div>
    }

    <!-- Courses table -->
    @if (!isLoading() && filteredCourses().length > 0) {
      <div class="table-container">
        <table class="courses-table">
          <thead>
            <tr>
              <th class="col-title">שם הקורס</th>
              <th class="col-subject">נושא</th>
              <th class="col-level">רמה</th>
              <th class="col-price">מחיר</th>
              <th class="col-status">סטטוס</th>
              @if (isSuperAdmin()) {
                <th class="col-creator">יוצר</th>
              }
              <th class="col-actions">פעולות</th>
            </tr>
          </thead>
          <tbody>
            @for (course of filteredCourses(); track course.id) {
              <tr>
                <td class="col-title">
                  <div class="course-title-cell">
                    @if (course.coverImageUrl) {
                      <img [src]="course.coverImageUrl" [alt]="course.title" class="course-thumb" />
                    } @else {
                      <div class="course-thumb-placeholder">
                        <span class="material-icons">school</span>
                      </div>
                    }
                    <div class="course-info">
                      <span class="course-name">{{ course.title }}</span>
                      <span class="course-desc">{{ course.shortDescription | slice:0:50 }}...</span>
                    </div>
                  </div>
                </td>
                <td class="col-subject">{{ course.subject }}</td>
                <td class="col-level">
                  <span class="level-badge" [attr.data-level]="course.level">
                    {{ course.level }}
                  </span>
                </td>
                <td class="col-price">₪{{ course.priceIls }}</td>
                <td class="col-status">
                  <span
                    class="status-badge"
                    [class.status-published]="course.isPublished"
                    [class.status-draft]="!course.isPublished"
                  >
                    @if (course.isPublished) {
                      <span class="material-icons">check_circle</span>
                      פורסם
                    } @else {
                      <span class="material-icons">edit_note</span>
                      טיוטה
                    }
                  </span>
                  @if (course.isFeatured) {
                    <span class="featured-badge" title="קורס מומלץ">
                      <span class="material-icons">star</span>
                    </span>
                  }
                </td>
                @if (isSuperAdmin()) {
                  <td class="col-creator">{{ course.creatorName }}</td>
                }
                <td class="col-actions">
                  <div class="actions-menu">
                    <a
                      [routerLink]="['/admin/courses', course.id, 'edit']"
                      class="action-btn"
                      title="עריכה"
                    >
                      <span class="material-icons">edit</span>
                    </a>
                    <a
                      [routerLink]="['/admin/courses', course.id, 'lessons']"
                      class="action-btn"
                      title="שיעורים"
                    >
                      <span class="material-icons">list</span>
                    </a>
                    <a
                      [routerLink]="['/admin/courses', course.id, 'questions']"
                      class="action-btn"
                      title="שאלות"
                    >
                      <span class="material-icons">quiz</span>
                    </a>
                    <button
                      class="action-btn"
                      [class.action-publish]="!course.isPublished"
                      [class.action-unpublish]="course.isPublished"
                      (click)="togglePublish(course)"
                      [title]="course.isPublished ? 'הסתר' : 'פרסם'"
                    >
                      <span class="material-icons">
                        {{ course.isPublished ? 'visibility_off' : 'visibility' }}
                      </span>
                    </button>
                    @if (isSuperAdmin()) {
                      <button
                        class="action-btn"
                        [class.action-featured]="course.isFeatured"
                        (click)="toggleFeatured(course)"
                        [title]="course.isFeatured ? 'הסר מהמומלצים' : 'הוסף למומלצים'"
                      >
                        <span class="material-icons">
                          {{ course.isFeatured ? 'star' : 'star_border' }}
                        </span>
                      </button>
                    }
                    @if (!course.isPublished) {
                      <button
                        class="action-btn action-delete"
                        (click)="confirmDelete(course)"
                        title="מחק"
                      >
                        <span class="material-icons">delete</span>
                      </button>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <!-- Delete confirmation modal -->
    @if (courseToDelete()) {
      <div class="modal-overlay" (click)="cancelDelete()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h3>מחיקת קורס</h3>
          <p>האם אתה בטוח שברצונך למחוק את הקורס "{{ courseToDelete()?.title }}"?</p>
          <p class="warning-text">פעולה זו אינה ניתנת לביטול.</p>
          <div class="modal-actions">
            <button class="btn-secondary" (click)="cancelDelete()">ביטול</button>
            <button class="btn-danger" (click)="deleteCourse()" [disabled]="isDeleting()">
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
        @apply flex items-center justify-between mb-6;

        h1 {
          @apply text-xl font-bold text-[var(--color-text-primary)];
        }
      }

      .header-actions {
        @apply flex items-center gap-3;
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

      .filters-bar {
        @apply flex flex-wrap gap-4 mb-6;
        @apply p-4 rounded-xl;
        @apply bg-[var(--color-bg-primary)] border border-[var(--color-border)];
      }

      .search-box {
        @apply flex items-center gap-2 flex-1 min-w-[200px];
        @apply px-3 py-2 rounded-lg;
        @apply bg-[var(--color-bg-secondary)] border border-[var(--color-border)];

        .material-icons {
          @apply text-[var(--color-text-tertiary)];
        }

        input {
          @apply flex-1 bg-transparent border-none outline-none;
          @apply text-[var(--color-text-primary)];

          &::placeholder {
            @apply text-[var(--color-text-tertiary)];
          }
        }
      }

      .filter-group {
        @apply flex gap-2;

        select {
          @apply px-3 py-2 rounded-lg;
          @apply bg-[var(--color-bg-secondary)] border border-[var(--color-border)];
          @apply text-[var(--color-text-primary)];
          @apply cursor-pointer outline-none;

          &:focus {
            @apply border-[var(--color-primary)];
          }
        }
      }

      .stats-row {
        @apply flex gap-4 mb-6;
      }

      .stat-item {
        @apply flex flex-col items-center;
        @apply px-6 py-3 rounded-xl;
        @apply bg-[var(--color-bg-primary)] border border-[var(--color-border)];
        @apply min-w-[100px];
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

      .table-container {
        @apply overflow-x-auto rounded-xl;
        @apply bg-[var(--color-bg-primary)] border border-[var(--color-border)];
      }

      .courses-table {
        @apply w-full border-collapse;

        th,
        td {
          @apply px-4 py-3 text-right;
          @apply border-b border-[var(--color-border)];
        }

        th {
          @apply bg-[var(--color-bg-secondary)];
          @apply text-sm font-semibold text-[var(--color-text-secondary)];
        }

        tbody tr {
          @apply transition-colors duration-200;

          &:hover {
            @apply bg-[var(--color-bg-secondary)];
          }

          &:last-child td {
            @apply border-b-0;
          }
        }
      }

      .course-title-cell {
        @apply flex items-center gap-3;
      }

      .course-thumb {
        @apply w-12 h-12 rounded-lg object-cover;
      }

      .course-thumb-placeholder {
        @apply w-12 h-12 rounded-lg;
        @apply bg-[var(--color-bg-tertiary)];
        @apply flex items-center justify-center;

        .material-icons {
          @apply text-[var(--color-text-tertiary)];
        }
      }

      .course-info {
        @apply flex flex-col;
      }

      .course-name {
        @apply font-medium text-[var(--color-text-primary)];
      }

      .course-desc {
        @apply text-sm text-[var(--color-text-tertiary)];
      }

      .level-badge {
        @apply px-2 py-1 rounded text-xs font-medium;
        @apply bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)];
      }

      .status-badge {
        @apply inline-flex items-center gap-1;
        @apply px-2 py-1 rounded text-xs font-medium;

        .material-icons {
          @apply text-sm;
        }

        &.status-published {
          @apply bg-emerald-100 text-emerald-700;
        }

        &.status-draft {
          @apply bg-amber-100 text-amber-700;
        }
      }

      :host-context([data-theme='dark']) {
        .status-badge.status-published {
          @apply bg-emerald-900/30 text-emerald-400;
        }

        .status-badge.status-draft {
          @apply bg-amber-900/30 text-amber-400;
        }
      }

      .featured-badge {
        @apply inline-flex items-center;
        @apply ml-2 text-amber-500;

        .material-icons {
          @apply text-sm;
        }
      }

      .actions-menu {
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

        &.action-publish:hover {
          @apply text-emerald-600;
        }

        &.action-unpublish:hover {
          @apply text-amber-600;
        }

        &.action-delete:hover {
          @apply text-red-600;
        }

        &.action-featured {
          @apply text-amber-500;
        }

        &:not(.action-featured):hover .material-icons {
          @apply text-amber-500;
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
    `,
  ],
})
export class CourseListComponent implements OnInit {
  private readonly adminCoursesRepo = inject(AdminCoursesRepo);
  private readonly roleService = inject(RoleService);
  private readonly router = inject(Router);

  readonly subjects = COURSE_SUBJECTS;
  readonly levels = COURSE_LEVELS;

  readonly isLoading = signal(true);
  readonly courses = signal<AdminCourse[]>([]);
  readonly courseToDelete = signal<AdminCourse | null>(null);
  readonly isDeleting = signal(false);
  readonly isSeeding = signal(false);

  searchTerm = '';
  statusFilter = 'all';
  subjectFilter = 'all';

  readonly isSuperAdmin = this.roleService.isSuperAdmin;

  readonly totalCourses = computed(() => this.courses().length);
  readonly publishedCount = computed(
    () => this.courses().filter((c) => c.isPublished).length
  );
  readonly draftCount = computed(
    () => this.courses().filter((c) => !c.isPublished).length
  );

  readonly filteredCourses = computed(() => {
    let result = this.courses();

    // Search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(term) ||
          c.shortDescription?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (this.statusFilter === 'published') {
      result = result.filter((c) => c.isPublished);
    } else if (this.statusFilter === 'draft') {
      result = result.filter((c) => !c.isPublished);
    }

    // Subject filter
    if (this.subjectFilter !== 'all') {
      result = result.filter((c) => c.subject === this.subjectFilter);
    }

    return result;
  });

  ngOnInit(): void {
    this.loadCourses();
  }

  private loadCourses(): void {
    this.isLoading.set(true);

    this.adminCoursesRepo.getCoursesForAdmin$().subscribe({
      next: (courses) => {
        this.courses.set(courses);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading courses:', err);
        this.isLoading.set(false);
      },
    });
  }

  onSearchChange(): void {
    // Filtering is handled by computed signal
  }

  onFilterChange(): void {
    // Filtering is handled by computed signal
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.subjectFilter = 'all';
  }

  async togglePublish(course: AdminCourse): Promise<void> {
    try {
      if (course.isPublished) {
        await this.adminCoursesRepo.unpublishCourse(course.id);
      } else {
        await this.adminCoursesRepo.publishCourse(course.id);
      }
      this.loadCourses();
    } catch (err) {
      console.error('Error toggling publish:', err);
    }
  }

  async toggleFeatured(course: AdminCourse): Promise<void> {
    try {
      await this.adminCoursesRepo.toggleFeatured(course.id, !course.isFeatured);
      this.loadCourses();
    } catch (err) {
      console.error('Error toggling featured:', err);
    }
  }

  async seedCourses(): Promise<void> {
    this.isSeeding.set(true);
    try {
      await this.adminCoursesRepo.seedSampleCourses();
      this.loadCourses();
    } catch (err) {
      console.error('Error seeding courses:', err);
    } finally {
      this.isSeeding.set(false);
    }
  }

  confirmDelete(course: AdminCourse): void {
    this.courseToDelete.set(course);
  }

  cancelDelete(): void {
    this.courseToDelete.set(null);
  }

  async deleteCourse(): Promise<void> {
    const course = this.courseToDelete();
    if (!course) return;

    this.isDeleting.set(true);

    try {
      await this.adminCoursesRepo.deleteCourse(course.id);
      this.courseToDelete.set(null);
      this.loadCourses();
    } catch (err) {
      console.error('Error deleting course:', err);
    } finally {
      this.isDeleting.set(false);
    }
  }
}
