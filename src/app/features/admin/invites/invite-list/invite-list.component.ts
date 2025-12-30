import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InvitesRepo } from '@core/repos/invites.repo';
import { AdminInvite, InviteStatus } from '@core/models/invite.interface';

@Component({
  selector: 'app-invite-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h1>ניהול הזמנות</h1>
      <button class="btn-primary" (click)="openInviteDialog()">
        <span class="material-icons">person_add</span>
        הזמנה חדשה
      </button>
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-item" [class.active]="statusFilter === 'all'" (click)="filterByStatus('all')">
        <span class="stat-value">{{ counts().pending + counts().accepted + counts().expired + counts().revoked }}</span>
        <span class="stat-label">סה"כ</span>
      </div>
      <div class="stat-item stat-pending" [class.active]="statusFilter === 'pending'" (click)="filterByStatus('pending')">
        <span class="stat-value">{{ counts().pending }}</span>
        <span class="stat-label">ממתינות</span>
      </div>
      <div class="stat-item stat-accepted" [class.active]="statusFilter === 'accepted'" (click)="filterByStatus('accepted')">
        <span class="stat-value">{{ counts().accepted }}</span>
        <span class="stat-label">התקבלו</span>
      </div>
      <div class="stat-item stat-expired" [class.active]="statusFilter === 'expired'" (click)="filterByStatus('expired')">
        <span class="stat-value">{{ counts().expired }}</span>
        <span class="stat-label">פג תוקף</span>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <div class="search-box">
        <span class="material-icons">search</span>
        <input
          type="text"
          placeholder="חיפוש לפי אימייל..."
          [(ngModel)]="searchTerm"
        />
      </div>
    </div>

    <!-- Loading -->
    @if (isLoading()) {
      <div class="loading-state">
        <div class="spinner"></div>
        <p>טוען הזמנות...</p>
      </div>
    }

    <!-- Empty state -->
    @if (!isLoading() && filteredInvites().length === 0) {
      <div class="empty-state">
        <span class="material-icons">mail</span>
        @if (searchTerm || statusFilter !== 'all') {
          <p>לא נמצאו הזמנות התואמות לחיפוש</p>
          <button class="btn-secondary" (click)="clearFilters()">נקה סינון</button>
        } @else {
          <p>עדיין לא נשלחו הזמנות</p>
          <button class="btn-primary" (click)="openInviteDialog()">
            שלח הזמנה ראשונה
          </button>
        }
      </div>
    }

    <!-- Invites table -->
    @if (!isLoading() && filteredInvites().length > 0) {
      <div class="table-container">
        <table class="invites-table">
          <thead>
            <tr>
              <th class="col-email">אימייל</th>
              <th class="col-role">תפקיד</th>
              <th class="col-status">סטטוס</th>
              <th class="col-created">נשלח</th>
              <th class="col-expires">תפוגה</th>
              <th class="col-creator">נשלח ע"י</th>
              <th class="col-actions">פעולות</th>
            </tr>
          </thead>
          <tbody>
            @for (invite of filteredInvites(); track invite.id) {
              <tr [class.expired]="isExpired(invite)">
                <td class="col-email">
                  <span class="email-text">{{ invite.email }}</span>
                </td>
                <td class="col-role">
                  <span class="role-badge">מנהל</span>
                </td>
                <td class="col-status">
                  <span class="status-badge" [attr.data-status]="getDisplayStatus(invite)">
                    {{ getStatusLabel(invite) }}
                  </span>
                </td>
                <td class="col-created">
                  {{ formatDate(invite.createdAt) }}
                </td>
                <td class="col-expires">
                  @if (invite.status === 'pending') {
                    {{ formatDate(invite.expiresAt) }}
                  } @else {
                    -
                  }
                </td>
                <td class="col-creator">
                  {{ invite.createdByName }}
                </td>
                <td class="col-actions">
                  <div class="actions-menu">
                    @if (invite.status === 'pending' && !isExpired(invite)) {
                      <button
                        class="action-btn action-revoke"
                        (click)="confirmRevoke(invite)"
                        [disabled]="isUpdating()"
                        title="בטל הזמנה"
                      >
                        <span class="material-icons">cancel</span>
                      </button>
                    }

                    @if (invite.status === 'pending' && isExpired(invite)) {
                      <button
                        class="action-btn action-resend"
                        (click)="resendInvite(invite)"
                        [disabled]="isUpdating()"
                        title="שלח מחדש"
                      >
                        <span class="material-icons">refresh</span>
                      </button>
                    }

                    @if (invite.status === 'revoked' || (invite.status === 'pending' && isExpired(invite))) {
                      <button
                        class="action-btn action-resend"
                        (click)="resendInvite(invite)"
                        [disabled]="isUpdating()"
                        title="שלח מחדש"
                      >
                        <span class="material-icons">send</span>
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

    <!-- New invite modal -->
    @if (showInviteDialog()) {
      <div class="modal-overlay" (click)="closeInviteDialog()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h3>הזמנת מנהל חדש</h3>

          <div class="form-group">
            <label for="inviteEmail">כתובת אימייל</label>
            <input
              type="email"
              id="inviteEmail"
              [(ngModel)]="newInviteEmail"
              placeholder="email@example.com"
              [disabled]="isSending()"
            />
            @if (inviteError()) {
              <span class="error-text">{{ inviteError() }}</span>
            }
          </div>

          <p class="info-text">
            ההזמנה תהיה בתוקף למשך 7 ימים.
            <br />
            המשתמש יקבל הרשאות מנהל עם ההתחברות הראשונה.
          </p>

          <div class="modal-actions">
            <button class="btn-secondary" (click)="closeInviteDialog()" [disabled]="isSending()">
              ביטול
            </button>
            <button
              class="btn-primary"
              (click)="sendInvite()"
              [disabled]="!newInviteEmail || isSending()"
            >
              @if (isSending()) {
                שולח...
              } @else {
                שלח הזמנה
              }
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Revoke confirmation modal -->
    @if (inviteToRevoke()) {
      <div class="modal-overlay" (click)="cancelRevoke()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h3>ביטול הזמנה</h3>
          <p>
            האם אתה בטוח שברצונך לבטל את ההזמנה ל-{{ inviteToRevoke()?.email }}?
          </p>
          <div class="modal-actions">
            <button class="btn-secondary" (click)="cancelRevoke()">לא</button>
            <button class="btn-danger" (click)="revokeInvite()" [disabled]="isUpdating()">
              @if (isUpdating()) {
                מבטל...
              } @else {
                בטל הזמנה
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

      .btn-primary {
        @apply flex items-center gap-2 px-4 py-2 rounded-lg;
        @apply bg-[var(--color-primary)] text-white;
        @apply hover:bg-[var(--color-primary-dark)];
        @apply transition-colors duration-200;
        @apply cursor-pointer border-none;

        .material-icons {
          @apply text-lg;
        }

        &:disabled {
          @apply opacity-50 cursor-not-allowed;
        }
      }

      .btn-secondary {
        @apply px-4 py-2 rounded-lg;
        @apply bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)];
        @apply hover:bg-[var(--color-bg-tertiary)];
        @apply transition-colors duration-200 border-none cursor-pointer;

        &:disabled {
          @apply opacity-50 cursor-not-allowed;
        }
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

      .stats-row {
        @apply flex flex-wrap gap-4 mb-6;
      }

      .stat-item {
        @apply flex flex-col items-center;
        @apply px-6 py-3 rounded-xl;
        @apply bg-[var(--color-bg-primary)] border border-[var(--color-border)];
        @apply min-w-[100px] flex-1;
        @apply cursor-pointer transition-all duration-200;

        &:hover {
          @apply border-[var(--color-primary)];
        }

        &.active {
          @apply border-[var(--color-primary)] bg-blue-50;
        }
      }

      :host-context([data-theme='dark']) .stat-item.active {
        @apply bg-blue-900/10;
      }

      .stat-value {
        @apply text-2xl font-bold text-[var(--color-primary)];
      }

      .stat-label {
        @apply text-sm text-[var(--color-text-secondary)];
      }

      .stat-pending .stat-value {
        @apply text-amber-600;
      }

      .stat-accepted .stat-value {
        @apply text-emerald-600;
      }

      .stat-expired .stat-value {
        @apply text-red-600;
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

      .invites-table {
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

          &.expired {
            @apply opacity-60;
          }
        }
      }

      .email-text {
        @apply font-medium text-[var(--color-text-primary)];
      }

      .role-badge {
        @apply px-2 py-0.5 rounded text-xs font-medium;
        @apply bg-blue-100 text-blue-700;
      }

      :host-context([data-theme='dark']) .role-badge {
        @apply bg-blue-900/30 text-blue-400;
      }

      .status-badge {
        @apply px-2 py-0.5 rounded text-xs font-medium;

        &[data-status='pending'] {
          @apply bg-amber-100 text-amber-700;
        }

        &[data-status='accepted'] {
          @apply bg-emerald-100 text-emerald-700;
        }

        &[data-status='expired'] {
          @apply bg-red-100 text-red-700;
        }

        &[data-status='revoked'] {
          @apply bg-gray-100 text-gray-700;
        }
      }

      :host-context([data-theme='dark']) {
        .status-badge {
          &[data-status='pending'] {
            @apply bg-amber-900/30 text-amber-400;
          }

          &[data-status='accepted'] {
            @apply bg-emerald-900/30 text-emerald-400;
          }

          &[data-status='expired'] {
            @apply bg-red-900/30 text-red-400;
          }

          &[data-status='revoked'] {
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
        @apply border-none cursor-pointer bg-transparent;

        .material-icons {
          @apply text-lg;
        }

        &:disabled {
          @apply opacity-50 cursor-not-allowed;
        }

        &.action-revoke:hover {
          @apply text-red-600;
        }

        &.action-resend:hover {
          @apply text-blue-600;
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
      }

      .form-group {
        @apply mb-4;

        label {
          @apply block text-sm font-medium text-[var(--color-text-secondary)] mb-1;
        }

        input {
          @apply w-full px-3 py-2 rounded-lg;
          @apply bg-[var(--color-bg-secondary)] border border-[var(--color-border)];
          @apply text-[var(--color-text-primary)];
          @apply outline-none transition-colors duration-200;

          &:focus {
            @apply border-[var(--color-primary)];
          }

          &:disabled {
            @apply opacity-50;
          }
        }
      }

      .error-text {
        @apply block text-xs text-red-500 mt-1;
      }

      .info-text {
        @apply text-sm text-[var(--color-text-tertiary)] mb-4;
      }

      .modal-actions {
        @apply flex gap-3 justify-end mt-6;
      }
    `,
  ],
})
export class InviteListComponent implements OnInit {
  private readonly invitesRepo = inject(InvitesRepo);

  readonly isLoading = signal(true);
  readonly isUpdating = signal(false);
  readonly isSending = signal(false);
  readonly invites = signal<AdminInvite[]>([]);
  readonly showInviteDialog = signal(false);
  readonly inviteToRevoke = signal<AdminInvite | null>(null);
  readonly inviteError = signal<string | null>(null);

  readonly counts = signal({
    pending: 0,
    accepted: 0,
    expired: 0,
    revoked: 0,
  });

  searchTerm = '';
  statusFilter: InviteStatus | 'all' = 'all';
  newInviteEmail = '';

  readonly filteredInvites = computed(() => {
    let result = this.invites();

    // Search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter((i) => i.email.toLowerCase().includes(term));
    }

    // Status filter
    if (this.statusFilter !== 'all') {
      if (this.statusFilter === 'expired') {
        result = result.filter((i) => this.isExpired(i) && i.status === 'pending');
      } else {
        result = result.filter(
          (i) => i.status === this.statusFilter && !this.isExpired(i)
        );
      }
    }

    return result;
  });

  ngOnInit(): void {
    this.loadInvites();
    this.loadCounts();
  }

  private loadInvites(): void {
    this.isLoading.set(true);

    this.invitesRepo.getAllInvites$().subscribe({
      next: (invites) => {
        this.invites.set(invites);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading invites:', err);
        this.isLoading.set(false);
      },
    });
  }

  private loadCounts(): void {
    this.invitesRepo.getInviteCounts$().subscribe({
      next: (counts) => {
        this.counts.set(counts);
      },
      error: (err) => {
        console.error('Error loading invite counts:', err);
      },
    });
  }

  filterByStatus(status: InviteStatus | 'all'): void {
    this.statusFilter = status;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
  }

  isExpired(invite: AdminInvite): boolean {
    if (!invite.expiresAt) return false;
    return invite.expiresAt.toMillis() < Date.now();
  }

  getDisplayStatus(invite: AdminInvite): string {
    if (invite.status === 'pending' && this.isExpired(invite)) {
      return 'expired';
    }
    return invite.status;
  }

  getStatusLabel(invite: AdminInvite): string {
    const status = this.getDisplayStatus(invite);
    const labels: Record<string, string> = {
      pending: 'ממתין',
      accepted: 'התקבל',
      expired: 'פג תוקף',
      revoked: 'בוטל',
    };
    return labels[status] || status;
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('he-IL');
  }

  openInviteDialog(): void {
    this.newInviteEmail = '';
    this.inviteError.set(null);
    this.showInviteDialog.set(true);
  }

  closeInviteDialog(): void {
    this.showInviteDialog.set(false);
    this.newInviteEmail = '';
    this.inviteError.set(null);
  }

  async sendInvite(): Promise<void> {
    if (!this.newInviteEmail) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.newInviteEmail)) {
      this.inviteError.set('כתובת אימייל לא תקינה');
      return;
    }

    this.isSending.set(true);
    this.inviteError.set(null);

    try {
      await this.invitesRepo.createInvite({
        email: this.newInviteEmail,
        role: 'admin',
      });

      this.closeInviteDialog();
      this.loadInvites();
      this.loadCounts();
    } catch (err: any) {
      console.error('Error sending invite:', err);
      this.inviteError.set(err.message || 'שגיאה בשליחת ההזמנה');
    } finally {
      this.isSending.set(false);
    }
  }

  confirmRevoke(invite: AdminInvite): void {
    this.inviteToRevoke.set(invite);
  }

  cancelRevoke(): void {
    this.inviteToRevoke.set(null);
  }

  async revokeInvite(): Promise<void> {
    const invite = this.inviteToRevoke();
    if (!invite) return;

    this.isUpdating.set(true);

    try {
      await this.invitesRepo.revokeInvite(invite.id);
      this.cancelRevoke();
      this.loadInvites();
      this.loadCounts();
    } catch (err) {
      console.error('Error revoking invite:', err);
    } finally {
      this.isUpdating.set(false);
    }
  }

  async resendInvite(invite: AdminInvite): Promise<void> {
    this.isUpdating.set(true);

    try {
      await this.invitesRepo.resendInvite(invite.id);
      this.loadInvites();
      this.loadCounts();
    } catch (err) {
      console.error('Error resending invite:', err);
    } finally {
      this.isUpdating.set(false);
    }
  }
}
