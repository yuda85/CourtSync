import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-progress-pill',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './progress-pill.component.html',
  styleUrl: './progress-pill.component.scss'
})
export class ProgressPillComponent {
  @Input() set percent(value: number) {
    this._percent.set(Math.max(0, Math.min(100, value)));
  }

  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() showLabel = true;

  private readonly _percent = signal(0);

  readonly displayPercent = computed(() => this._percent());

  readonly colorClass = computed(() => {
    const p = this._percent();
    if (p === 100) return 'progress-pill--complete';
    if (p >= 75) return 'progress-pill--high';
    if (p >= 50) return 'progress-pill--medium';
    if (p >= 25) return 'progress-pill--low';
    return 'progress-pill--start';
  });
}
