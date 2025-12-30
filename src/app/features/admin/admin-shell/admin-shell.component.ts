import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AdminSidebarComponent } from '@shared/components/admin-sidebar/admin-sidebar.component';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AdminSidebarComponent],
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.scss',
})
export class AdminShellComponent {
  /** Whether the sidebar is collapsed */
  readonly sidebarCollapsed = signal(false);

  /** Toggle sidebar collapsed state */
  toggleSidebar(): void {
    this.sidebarCollapsed.update((v) => !v);
  }
}
