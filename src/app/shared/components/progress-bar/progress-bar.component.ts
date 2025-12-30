import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './progress-bar.component.html',
  styleUrl: './progress-bar.component.scss'
})
export class ProgressBarComponent {
  /** Progress percentage (0-100) */
  percent = input.required<number>();

  /** Size variant */
  size = input<'sm' | 'md' | 'lg'>('md');

  /** Whether to show the percentage label */
  showLabel = input(false);

  /** Color variant */
  color = input<'primary' | 'success' | 'warning'>('primary');

  /** Clamped percentage value */
  readonly clampedPercent = computed(() =>
    Math.max(0, Math.min(100, this.percent()))
  );

  /** CSS class for size */
  readonly sizeClass = computed(() => `progress-bar--${this.size()}`);

  /** CSS class for color */
  readonly colorClass = computed(() => {
    const p = this.clampedPercent();
    // Auto-switch to success at 100%
    if (p === 100 && this.color() === 'primary') {
      return 'progress-bar--success';
    }
    return `progress-bar--${this.color()}`;
  });
}
