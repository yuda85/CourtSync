import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UsersRepo, AdminUser } from '@core/repos/users.repo';
import { UserRole } from '@core/models/user-profile.interface';
import { RoleService } from '@core/services/role.service';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page-header">
      <h1>{{ isSuperAdmin() ? 'ניהול משתמשים' : 'הסטודנטים שלי' }}</h1>
    </div>

    <!-- Stats for Superadmin -->
    @if (isSuperAdmin()) {
      <div class="stats-row">
        <div class="stat-item">
          <span class="stat-value">{{ stats().total }}</span>
          <span class="stat-label">סה"כ משתמשים</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ stats().admins }}</span>
          <span class="stat-label">מנהלים</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ stats().superadmins }}</span>
          <span class="stat-label">מנהלים ראשיים</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ stats().recentSignups }}</span>
          <span class="stat-label">הצטרפו החודש</span>
        </div>
      </div>
    } @else {
      <!-- Stats for Admin (students only) -->
      <div class="stats-row">
        <div class="stat-item">
          <span class="stat-value">{{ studentStats().total }}</span>
          <span class="stat-label">סטודנטים בקורסים שלי</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ studentStats().newThisMonth }}</span>
          <span class="stat-label">הצטרפו החודש</span>
        </div>
      </div>
    }

    <!-- Filters -->
    <div class="filters-bar">
      <div class="search-box">
        <span class="material-icons">search</span>
        <input
          type="text"
          placeholder="חיפוש לפי שם או אימייל..."
          [(ngModel)]="searchTerm"
          (ngModelChange)="onSearchChange()"
        />
      </div>

      @if (isSuperAdmin()) {
        <div class="filter-group">
          <select [(ngModel)]="roleFilter" (ngModelChange)="onFilterChange()">
            <option value="all">כל התפקידים</option>
            <option value="superadmin">מנהל ראשי</option>
            <option value="admin">מנהל</option>
            <option value="student">סטודנט</option>
          </select>
        </div>
      }
    </div>

    <!-- Loading -->
    @if (isLoading()) {
      <div class="loading-state">
        <div class="spinner"></div>
        <p>טוען משתמשים...</p>
      </div>
    }

    <!-- Empty state -->
    @if (!isLoading() && filteredUsers().length === 0) {
      <div class="empty-state">
        <span class="material-icons">people</span>
        @if (searchTerm || roleFilter !== 'all') {
          <p>לא נמצאו משתמשים התואמים לחיפוש</p>
          <button class="btn-secondary" (click)="clearFilters()">נקה סינון</button>
        } @else {
          <p>אין משתמשים במערכת</p>
        }
      </div>
    }

    <!-- Users table -->
    @if (!isLoading() && filteredUsers().length > 0) {
      <div class="table-container">
        <table class="users-table">
          <thead>
            <tr>
              <th class="col-user">משתמש</th>
              <th class="col-email">אימייל</th>
              <th class="col-roles">תפקידים</th>
              <th class="col-joined">הצטרף</th>
              <th class="col-last-login">כניסה אחרונה</th>
              <th class="col-actions">פעולות</th>
            </tr>
          </thead>
          <tbody>
            @for (user of filteredUsers(); track user.uid) {
              <tr>
                <td class="col-user">
                  <div class="user-cell">
                    @if (user.photoURL) {
                      <img [src]="user.photoURL" [alt]="user.displayName" class="user-avatar" />
                    } @else {
                      <div class="user-avatar-placeholder">
                        <span class="material-icons">person</span>
                      </div>
                    }
                    <span class="user-name">{{ user.displayName || 'ללא שם' }}</span>
                  </div>
                </td>
                <td class="col-email">{{ user.email }}</td>
                <td class="col-roles">
                  <div class="roles-badges">
                    @for (role of user.roles; track role) {
                      <span class="role-badge" [attr.data-role]="role">
                        {{ getRoleLabel(role) }}
                      </span>
                    }
                  </div>
                </td>
                <td class="col-joined">
                  {{ formatDate(user.createdAt) }}
                </td>
                <td class="col-last-login">
                  {{ formatDate(user.lastLoginAt) }}
                </td>
                <td class="col-actions">
                  <div class="actions-menu">
                    <a
                      [routerLink]="['/admin/users', user.uid]"
                      class="action-btn"
                      title="פרטים"
                    >
                      <span class="material-icons">visibility</span>
                    </a>

                    <!-- Only superadmins can promote/demote users -->
                    @if (isSuperAdmin()) {
                      @if (!isCurrentUser(user.uid) && !isUserSuperAdmin(user)) {
                        <button
                          class="action-btn action-promote"
                          (click)="promoteToAdmin(user)"
                          [disabled]="isUpdating()"
                          title="הפוך למנהל"
                        >
                          <span class="material-icons">admin_panel_settings</span>
                        </button>
                      }

                      @if (!isCurrentUser(user.uid) && isUserAdmin(user) && !isUserSuperAdmin(user)) {
                        <button
                          class="action-btn action-demote"
                          (click)="demoteFromAdmin(user)"
                          [disabled]="isUpdating()"
                          title="הסר הרשאות מנהל"
                        >
                          <span class="material-icons">person_remove</span>
                        </button>
                      }
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <!-- Role change confirmation modal -->
    @if (userToModify()) {
      <div class="modal-overlay" (click)="cancelRoleChange()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h3>{{ pendingAction() === 'promote' ? 'הפוך למנהל' : 'הסר הרשאות מנהל' }}</h3>
          <p>
            @if (pendingAction() === 'promote') {
              האם אתה בטוח שברצונך להפוך את {{ userToModify()?.displayName || userToModify()?.email }} למנהל?
              <br />
              <span class="hint-text">משתמש זה יוכל ליצור ולערוך קורסים.</span>
            } @else {
              האם אתה בטוח שברצונך להסיר את הרשאות המנהל מ-{{ userToModify()?.displayName || userToModify()?.email }}?
              <br />
              <span class="hint-text">משתמש זה לא יוכל יותר לגשת לממשק הניהול.</span>
            }
          </p>
          <div class="modal-actions">
            <button class="btn-secondary" (click)="cancelRoleChange()">ביטול</button>
            <button
              class="btn-primary"
              [class.btn-danger]="pendingAction() === 'demote'"
              (click)="confirmRoleChange()"
              [disabled]="isUpdating()"
            >
              @if (isUpdating()) {
                מעדכן...
              } @else {
                {{ pendingAction() === 'promote' ? 'הפוך למנהל' : 'הסר הרשאות' }}
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

      .stats-row {
        @apply flex flex-wrap gap-4 mb-6;
      }

      .stat-item {
        @apply flex flex-col items-center;
        @apply px-6 py-3 rounded-xl;
        @apply bg-[var(--color-bg-primary)] border border-[var(--color-border)];
        @apply min-w-[100px] flex-1;
      }

      .stat-value {
        @apply text-2xl font-bold text-[var(--color-primary)];
      }

      .stat-label {
        @apply text-sm text-[var(--color-text-secondary)];
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

      .btn-secondary {
        @apply px-4 py-2 rounded-lg;
        @apply bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)];
        @apply hover:bg-[var(--color-bg-tertiary)];
        @apply transition-colors duration-200 border-none cursor-pointer;
      }

      .table-container {
        @apply overflow-x-auto rounded-xl;
        @apply bg-[var(--color-bg-primary)] border border-[var(--color-border)];
      }

      .users-table {
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

      .user-cell {
        @apply flex items-center gap-3;
      }

      .user-avatar {
        @apply w-10 h-10 rounded-full object-cover;
      }

      .user-avatar-placeholder {
        @apply w-10 h-10 rounded-full;
        @apply bg-[var(--color-bg-tertiary)];
        @apply flex items-center justify-center;

        .material-icons {
          @apply text-[var(--color-text-tertiary)];
        }
      }

      .user-name {
        @apply font-medium text-[var(--color-text-primary)];
      }

      .roles-badges {
        @apply flex flex-wrap gap-1;
      }

      .role-badge {
        @apply px-2 py-0.5 rounded text-xs font-medium;

        &[data-role='superadmin'] {
          @apply bg-purple-100 text-purple-700;
        }

        &[data-role='admin'] {
          @apply bg-blue-100 text-blue-700;
        }

        &[data-role='student'] {
          @apply bg-gray-100 text-gray-700;
        }
      }

      :host-context([data-theme='dark']) {
        .role-badge {
          &[data-role='superadmin'] {
            @apply bg-purple-900/30 text-purple-400;
          }

          &[data-role='admin'] {
            @apply bg-blue-900/30 text-blue-400;
          }

          &[data-role='student'] {
            @apply bg-gray-800 text-gray-400;
          }
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

        &:disabled {
          @apply opacity-50 cursor-not-allowed;
        }

        &.action-promote:hover {
          @apply text-blue-600;
        }

        &.action-demote:hover {
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

        .hint-text {
          @apply text-sm text-[var(--color-text-tertiary)];
        }
      }

      .modal-actions {
        @apply flex gap-3 justify-end mt-6;
      }

      .btn-primary {
        @apply px-4 py-2 rounded-lg;
        @apply bg-[var(--color-primary)] text-white;
        @apply hover:bg-[var(--color-primary-dark)];
        @apply transition-colors duration-200 border-none cursor-pointer;

        &:disabled {
          @apply opacity-50 cursor-not-allowed;
        }

        &.btn-danger {
          @apply bg-red-600 hover:bg-red-700;
        }
      }
    `,
  ],
})
export class UserListComponent implements OnInit {
  private readonly usersRepo = inject(UsersRepo);
  private readonly roleService = inject(RoleService);

  readonly isLoading = signal(true);
  readonly isUpdating = signal(false);
  readonly users = signal<AdminUser[]>([]);
  readonly userToModify = signal<AdminUser | null>(null);
  readonly pendingAction = signal<'promote' | 'demote' | null>(null);

  /** Check if current user is superadmin */
  readonly isSuperAdmin = this.roleService.isSuperAdmin;

  readonly stats = signal({
    total: 0,
    admins: 0,
    superadmins: 0,
    students: 0,
    recentSignups: 0,
  });

  /** Stats for admins (their enrolled students) */
  readonly studentStats = signal({
    total: 0,
    newThisMonth: 0,
  });

  searchTerm = '';
  roleFilter = 'all';

  private currentUserUid: string | null = null;

  readonly filteredUsers = computed(() => {
    let result = this.users();

    // Search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(
        (u) =>
          u.email?.toLowerCase().includes(term) ||
          u.displayName?.toLowerCase().includes(term)
      );
    }

    // Role filter
    if (this.roleFilter !== 'all') {
      result = result.filter((u) =>
        u.roles?.includes(this.roleFilter as UserRole)
      );
    }

    return result;
  });

  ngOnInit(): void {
    this.loadUsers();
    this.loadStats();
  }

  private loadUsers(): void {
    this.isLoading.set(true);

    // Use filtered method that respects role
    this.usersRepo.getUsersForAdmin$().subscribe({
      next: (users) => {
        this.users.set(users);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.isLoading.set(false);
      },
    });
  }

  private loadStats(): void {
    if (this.isSuperAdmin()) {
      // Full stats for superadmins
      this.usersRepo.getUserStats$().subscribe({
        next: (stats) => {
          this.stats.set(stats);
        },
        error: (err) => {
          console.error('Error loading user stats:', err);
        },
      });
    } else {
      // Student stats for admins
      this.usersRepo.getMyStudentStats$().subscribe({
        next: (stats) => {
          this.studentStats.set(stats);
        },
        error: (err) => {
          console.error('Error loading student stats:', err);
        },
      });
    }
  }

  onSearchChange(): void {
    // Filtering handled by computed
  }

  onFilterChange(): void {
    // Filtering handled by computed
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.roleFilter = 'all';
  }

  getRoleLabel(role: UserRole): string {
    const labels: Record<UserRole, string> = {
      superadmin: 'מנהל ראשי',
      admin: 'מנהל',
      student: 'סטודנט',
    };
    return labels[role] || role;
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('he-IL');
  }

  isCurrentUser(uid: string): boolean {
    return uid === this.currentUserUid;
  }

  /** Check if a user has admin role */
  isUserAdmin(user: AdminUser): boolean {
    return user.roles?.includes('admin') || user.roles?.includes('superadmin');
  }

  /** Check if a user has superadmin role */
  isUserSuperAdmin(user: AdminUser): boolean {
    return user.roles?.includes('superadmin');
  }

  promoteToAdmin(user: AdminUser): void {
    this.userToModify.set(user);
    this.pendingAction.set('promote');
  }

  demoteFromAdmin(user: AdminUser): void {
    this.userToModify.set(user);
    this.pendingAction.set('demote');
  }

  cancelRoleChange(): void {
    this.userToModify.set(null);
    this.pendingAction.set(null);
  }

  async confirmRoleChange(): Promise<void> {
    const user = this.userToModify();
    const action = this.pendingAction();

    if (!user || !action) return;

    this.isUpdating.set(true);

    try {
      if (action === 'promote') {
        await this.usersRepo.promoteToAdmin(user.uid);
      } else {
        await this.usersRepo.demoteFromAdmin(user.uid);
      }

      this.loadUsers();
      this.loadStats();
      this.cancelRoleChange();
    } catch (err) {
      console.error('Error updating user role:', err);
    } finally {
      this.isUpdating.set(false);
    }
  }
}
