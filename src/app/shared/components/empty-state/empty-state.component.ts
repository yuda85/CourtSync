import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonComponent } from '@shared/components/button/button.component';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss'
})
export class EmptyStateComponent {
  private readonly router = inject(Router);

  /** Icon type to display */
  icon = input<'book' | 'search' | 'chart' | 'folder' | 'calendar'>('book');

  /** Main title text */
  title = input.required<string>();

  /** Optional description text */
  description = input<string>();

  /** Optional CTA button text */
  ctaText = input<string>();

  /** Optional route for CTA button */
  ctaRoute = input<string>();

  /** Size variant */
  size = input<'sm' | 'md' | 'lg'>('md');

  /** Emitted when CTA button is clicked */
  ctaClick = output<void>();

  onCtaClick(): void {
    const route = this.ctaRoute();
    if (route) {
      this.router.navigate([route]);
    }
    this.ctaClick.emit();
  }
}
