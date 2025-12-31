import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InvitesRepo } from '@core/repos/invites.repo';
import { AdminInvite, InviteStatus, InviteRole } from '@core/models/invite.interface';

@Component({
  selector: 'app-invite-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h1>ניהול הזמנות</h1>
      <button class="btn-primary" (click)="openInviteDialog()">
        <span class="material-icons">link</span>
        צור קישור הזמנה
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
        <span class="stat-label">פעילות</span>
      </div>
      <div class="stat-item stat-accepted" [class.active]="statusFilter === 'accepted'" (click)="filterByStatus('accepted')">
        <span class="stat-value">{{ counts().accepted }}</span>
        <span class="stat-label">נוצלו</span>
      </div>
      <div class="stat-item stat-expired" [class.active]="statusFilter === 'expired'" (click)="filterByStatus('expired')">
        <span class="stat-value">{{ counts().expired }}</span>
        <span class="stat-label">פג תוקף</span>
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
        <span class="material-icons">link</span>
        @if (statusFilter !== 'all') {
          <p>לא נמצאו הזמנות בסטטוס זה</p>
          <button class="btn-secondary" (click)="clearFilters()">הצג הכל</button>
        } @else {
          <p>עדיין לא נוצרו קישורי הזמנה</p>
          <button class="btn-primary" (click)="openInviteDialog()">
            צור קישור ראשון
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
              <th class="col-role">תפקיד</th>
              <th class="col-status">סטטוס</th>
              <th class="col-created">נוצר</th>
              <th class="col-expires">תפוגה</th>
              <th class="col-creator">נוצר ע"י</th>
              <th class="col-accepted">נוצל ע"י</th>
              <th class="col-actions">פעולות</th>
            </tr>
          </thead>
          <tbody>
            @for (invite of filteredInvites(); track invite.id) {
              <tr [class.expired]="isExpired(invite)" [class.used]="invite.status === 'accepted'">
                <td class="col-role">
                  <span class="role-badge" [attr.data-role]="invite.role">
                    {{ getRoleLabel(invite.role) }}
                  </span>
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
                  @if (invite.status === 'pending' && !isExpired(invite)) {
                    {{ formatDate(invite.expiresAt) }}
                  } @else {
                    -
                  }
                </td>
                <td class="col-creator">
                  {{ invite.createdByName }}
                </td>
                <td class="col-accepted">
                  @if (invite.acceptedByEmail) {
                    {{ invite.acceptedByEmail }}
                  } @else {
                    -
                  }
                </td>
                <td class="col-actions">
                  <div class="actions-menu">
                    @if (invite.status === 'pending' && !isExpired(invite)) {
                      <button
                        class="action-btn action-copy"
                        (click)="copyInviteLink(invite)"
                        title="העתק קישור"
                      >
                        <span class="material-icons">content_copy</span>
                      </button>
                      <button
                        class="action-btn action-revoke"
                        (click)="confirmRevoke(invite)"
                        [disabled]="isUpdating()"
                        title="בטל הזמנה"
                      >
                        <span class="material-icons">cancel</span>
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

    <!-- Copy success toast -->
    @if (showCopyToast()) {
      <div class="copy-toast">
        <span class="material-icons">check_circle</span>
        הקישור הועתק ללוח
      </div>
    }

    <!-- New invite modal -->
    @if (showInviteDialog()) {
      <div class="modal-overlay" (click)="closeInviteDialog()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h3>צור קישור הזמנה</h3>

          <div class="form-group">
            <label>תפקיד</label>
            <div class="role-options">
              <button
                class="role-option"
                [class.selected]="newInviteRole === 'admin'"
                (click)="newInviteRole = 'admin'"
              >
                <span class="material-icons">manage_accounts</span>
                <span class="role-name">מנהל תוכן</span>
                <span class="role-desc">יכול לנהל קורסים ושיעורים</span>
              </button>
              <button
                class="role-option"
                [class.selected]="newInviteRole === 'superadmin'"
                (click)="newInviteRole = 'superadmin'"
              >
                <span class="material-icons">admin_panel_settings</span>
                <span class="role-name">מנהל ראשי</span>
                <span class="role-desc">גישה מלאה כולל ניהול משתמשים</span>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label for="expirationDays">תוקף הקישור</label>
            <select
              id="expirationDays"
              [(ngModel)]="newInviteExpiration"
              class="select-input"
            >
              <option [value]="1">יום אחד</option>
              <option [value]="3">3 ימים</option>
              <option [value]="7">שבוע</option>
              <option [value]="14">שבועיים</option>
              <option [value]="30">חודש</option>
            </select>
          </div>

          <p class="info-text">
            הקישור ניתן לשימוש פעם אחת בלבד.
            <br />
            שתף את הקישור עם האדם שברצונך להזמין.
          </p>

          @if (inviteError()) {
            <p class="error-text">{{ inviteError() }}</p>
          }

          <div class="modal-actions">
            <button class="btn-secondary" (click)="closeInviteDialog()" [disabled]="isCreating()">
              ביטול
            </button>
            <button
              class="btn-primary"
              (click)="createInvite()"
              [disabled]="isCreating()"
            >
              @if (isCreating()) {
                יוצר...
              } @else {
                צור קישור
              }
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Link created modal -->
    @if (createdInviteUrl()) {
      <div class="modal-overlay" (click)="closeCreatedDialog()">
        <div class="modal-content link-modal" (click)="$event.stopPropagation()">
          <div class="success-icon">
            <span class="material-icons">check_circle</span>
          </div>
          <h3>הקישור נוצר בהצלחה!</h3>

          <div class="link-box">
            <input
              type="text"
              [value]="createdInviteUrl()"
              readonly
              class="link-input"
              #linkInput
            />
            <button class="btn-copy" (click)="copyCreatedLink()">
              <span class="material-icons">content_copy</span>
            </button>
          </div>

          <p class="info-text">
            שתף את הקישור הזה עם האדם שברצונך להזמין.
            <br />
            הקישור יפוג בעוד {{ newInviteExpiration }} {{ newInviteExpiration === 1 ? 'יום' : 'ימים' }}.
          </p>

          <div class="modal-actions">
            <button class="btn-primary" (click)="closeCreatedDialog()">
              סגור
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
            האם אתה בטוח שברצונך לבטל את קישור ההזמנה הזה?
            <br />
            לאחר הביטול, הקישור לא יהיה פעיל יותר.
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
        @apply text-emerald-600;
      }

      .stat-accepted .stat-value {
        @apply text-blue-600;
      }

      .stat-expired .stat-value {
        @apply text-red-600;
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

          &.expired,
          &.used {
            @apply opacity-60;
          }
        }
      }

      .role-badge {
        @apply px-2 py-0.5 rounded text-xs font-medium;

        &[data-role='admin'] {
          @apply bg-blue-100 text-blue-700;
        }

        &[data-role='superadmin'] {
          @apply bg-purple-100 text-purple-700;
        }
      }

      :host-context([data-theme='dark']) .role-badge {
        &[data-role='admin'] {
          @apply bg-blue-900/30 text-blue-400;
        }

        &[data-role='superadmin'] {
          @apply bg-purple-900/30 text-purple-400;
        }
      }

      .status-badge {
        @apply px-2 py-0.5 rounded text-xs font-medium;

        &[data-status='pending'] {
          @apply bg-emerald-100 text-emerald-700;
        }

        &[data-status='accepted'] {
          @apply bg-blue-100 text-blue-700;
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
            @apply bg-emerald-900/30 text-emerald-400;
          }

          &[data-status='accepted'] {
            @apply bg-blue-900/30 text-blue-400;
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

        &.action-copy:hover {
          @apply text-blue-600;
        }

        &.action-revoke:hover {
          @apply text-red-600;
        }
      }

      .copy-toast {
        @apply fixed bottom-6 left-1/2 transform -translate-x-1/2;
        @apply flex items-center gap-2 px-4 py-2 rounded-lg;
        @apply bg-emerald-600 text-white shadow-lg;
        @apply animate-fade-in-up;
        z-index: 100;

        .material-icons {
          @apply text-lg;
        }
      }

      @keyframes fade-in-up {
        from {
          opacity: 0;
          transform: translate(-50%, 10px);
        }
        to {
          opacity: 1;
          transform: translate(-50%, 0);
        }
      }

      .animate-fade-in-up {
        animation: fade-in-up 0.2s ease-out;
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

        &.link-modal {
          @apply text-center;

          .success-icon {
            @apply mb-4;

            .material-icons {
              @apply text-5xl text-emerald-500;
            }
          }
        }
      }

      .form-group {
        @apply mb-4;

        label {
          @apply block text-sm font-medium text-[var(--color-text-secondary)] mb-2;
        }
      }

      .role-options {
        @apply flex flex-col gap-2;
      }

      .role-option {
        @apply flex flex-col items-start p-4 rounded-lg;
        @apply bg-[var(--color-bg-secondary)] border-2 border-[var(--color-border)];
        @apply text-right cursor-pointer transition-all duration-200;
        @apply w-full relative;

        &:hover:not(.selected) {
          @apply border-[var(--color-primary)] border-opacity-50;
        }

        &.selected {
          @apply border-[var(--color-primary)] bg-blue-50;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);

          &::after {
            content: '';
            @apply absolute top-3 left-3 w-5 h-5 rounded-full;
            @apply bg-[var(--color-primary)];
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z'/%3E%3C/svg%3E");
            background-size: 14px;
            background-position: center;
            background-repeat: no-repeat;
          }

          .material-icons {
            @apply text-[var(--color-primary)];
          }

          .role-name {
            @apply text-[var(--color-primary)] font-semibold;
          }
        }

        .material-icons {
          @apply text-2xl text-[var(--color-text-tertiary)] mb-2;
          transition: color 0.2s;
        }

        .role-name {
          @apply font-medium text-[var(--color-text-primary)] text-base;
        }

        .role-desc {
          @apply text-xs text-[var(--color-text-tertiary)] mt-1;
        }
      }

      :host-context([data-theme='dark']) .role-option {
        &.selected {
          @apply bg-blue-900/30;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
        }
      }

      .select-input {
        @apply w-full px-3 py-2 rounded-lg;
        @apply bg-[var(--color-bg-secondary)] border border-[var(--color-border)];
        @apply text-[var(--color-text-primary)];
        @apply outline-none cursor-pointer;

        &:focus {
          @apply border-[var(--color-primary)];
        }
      }

      .link-box {
        @apply flex items-center gap-2 p-2 rounded-lg mb-4;
        @apply bg-[var(--color-bg-secondary)] border border-[var(--color-border)];
      }

      .link-input {
        @apply flex-1 bg-transparent border-none outline-none;
        @apply text-sm text-[var(--color-text-primary)];
        direction: ltr;
      }

      .btn-copy {
        @apply p-2 rounded-lg;
        @apply bg-[var(--color-primary)] text-white;
        @apply hover:bg-[var(--color-primary-dark)];
        @apply transition-colors duration-200;
        @apply border-none cursor-pointer;

        .material-icons {
          @apply text-lg;
        }
      }

      .error-text {
        @apply text-sm text-red-500 mb-4;
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
  readonly isCreating = signal(false);
  readonly invites = signal<AdminInvite[]>([]);
  readonly showInviteDialog = signal(false);
  readonly inviteToRevoke = signal<AdminInvite | null>(null);
  readonly inviteError = signal<string | null>(null);
  readonly showCopyToast = signal(false);
  readonly createdInviteUrl = signal<string | null>(null);

  readonly counts = signal({
    pending: 0,
    accepted: 0,
    expired: 0,
    revoked: 0,
  });

  statusFilter: InviteStatus | 'all' = 'all';
  newInviteRole: InviteRole = 'admin';
  newInviteExpiration = 7;

  readonly filteredInvites = computed(() => {
    let result = this.invites();

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
      pending: 'פעיל',
      accepted: 'נוצל',
      expired: 'פג תוקף',
      revoked: 'בוטל',
    };
    return labels[status] || status;
  }

  getRoleLabel(role: InviteRole): string {
    return role === 'superadmin' ? 'מנהל ראשי' : 'מנהל תוכן';
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('he-IL');
  }

  openInviteDialog(): void {
    this.newInviteRole = 'admin';
    this.newInviteExpiration = 7;
    this.inviteError.set(null);
    this.showInviteDialog.set(true);
  }

  closeInviteDialog(): void {
    this.showInviteDialog.set(false);
    this.inviteError.set(null);
  }

  closeCreatedDialog(): void {
    this.createdInviteUrl.set(null);
    this.loadInvites();
    this.loadCounts();
  }

  async createInvite(): Promise<void> {
    this.isCreating.set(true);
    this.inviteError.set(null);

    try {
      const inviteId = await this.invitesRepo.createInvite({
        role: this.newInviteRole,
        expirationDays: this.newInviteExpiration,
      });

      const url = this.invitesRepo.getInviteUrl(inviteId);
      this.closeInviteDialog();
      this.createdInviteUrl.set(url);
    } catch (err: any) {
      console.error('Error creating invite:', err);
      this.inviteError.set(err.message || 'שגיאה ביצירת ההזמנה');
    } finally {
      this.isCreating.set(false);
    }
  }

  async copyInviteLink(invite: AdminInvite): Promise<void> {
    const url = this.invitesRepo.getInviteUrl(invite.id);
    await navigator.clipboard.writeText(url);
    this.showCopyToast.set(true);
    setTimeout(() => this.showCopyToast.set(false), 2000);
  }

  async copyCreatedLink(): Promise<void> {
    const url = this.createdInviteUrl();
    if (url) {
      await navigator.clipboard.writeText(url);
      this.showCopyToast.set(true);
      setTimeout(() => this.showCopyToast.set(false), 2000);
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
}
