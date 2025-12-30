import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RoleService } from '@core/services/role.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit {
  private readonly roleService = inject(RoleService);

  readonly isSuperAdmin = this.roleService.isSuperAdmin;
  readonly userProfile = signal(this.roleService.getProfile());

  // Stats (placeholder values)
  readonly stats = signal({
    totalCourses: 0,
    publishedCourses: 0,
    totalUsers: 0,
    pendingInvites: 0,
  });

  ngOnInit(): void {
    // Refresh profile on init
    this.userProfile.set(this.roleService.getProfile());
  }
}
