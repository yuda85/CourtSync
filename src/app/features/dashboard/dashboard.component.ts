import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  private readonly authService = inject(AuthService);

  readonly user = this.authService.user;

  readonly stats = [
    {
      label: 'קורסים פעילים',
      value: '3',
      icon: 'book',
      color: 'blue'
    },
    {
      label: 'שיעורים שהושלמו',
      value: '24',
      icon: 'check',
      color: 'green'
    },
    {
      label: 'שעות למידה',
      value: '12.5',
      icon: 'clock',
      color: 'purple'
    },
    {
      label: 'רצף ימים',
      value: '7',
      icon: 'flame',
      color: 'orange'
    }
  ];
}
