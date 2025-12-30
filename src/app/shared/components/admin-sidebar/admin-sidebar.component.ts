import { Component, inject, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { RoleService } from '@core/services/role.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  requiresSuperAdmin?: boolean;
}

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './admin-sidebar.component.html',
  styleUrl: './admin-sidebar.component.scss',
})
export class AdminSidebarComponent {
  private readonly roleService = inject(RoleService);

  /** Whether the sidebar is collapsed */
  readonly collapsed = input(false);

  /** Emitted when toggle button is clicked */
  readonly toggle = output<void>();

  /** Check if current user is superadmin */
  readonly isSuperAdmin = this.roleService.isSuperAdmin;

  /** Navigation items */
  readonly navItems: NavItem[] = [
    { label: 'לוח בקרה', route: '/admin/dashboard', icon: 'dashboard' },
    { label: 'קורסים', route: '/admin/courses', icon: 'school' },
    {
      label: 'משתמשים',
      route: '/admin/users',
      icon: 'people',
      requiresSuperAdmin: true,
    },
    {
      label: 'הזמנות',
      route: '/admin/invites',
      icon: 'mail',
      requiresSuperAdmin: true,
    },
  ];

  /** Filtered nav items based on user role */
  readonly visibleNavItems = computed(() => {
    return this.navItems.filter(
      (item) => !item.requiresSuperAdmin || this.isSuperAdmin()
    );
  });

  onToggle(): void {
    this.toggle.emit();
  }
}
