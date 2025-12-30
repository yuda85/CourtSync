import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss'
})
export class ButtonComponent {
  /** Button variant style */
  variant = input<ButtonVariant>('primary');

  /** Button size */
  size = input<ButtonSize>('md');

  /** Whether button is disabled */
  disabled = input(false);

  /** Whether button is in loading state */
  loading = input(false);

  /** Button type */
  type = input<'button' | 'submit' | 'reset'>('button');

  /** Full width button */
  fullWidth = input(false);

  /** Icon only button (circular) */
  iconOnly = input(false);

  /** Click event */
  buttonClick = output<MouseEvent>();

  onClick(event: MouseEvent): void {
    if (!this.disabled() && !this.loading()) {
      this.buttonClick.emit(event);
    }
  }

  get buttonClasses(): string {
    const classes = ['btn'];

    // Variant
    classes.push(`btn-${this.variant()}`);

    // Size
    classes.push(`btn-${this.size()}`);

    // States
    if (this.disabled() || this.loading()) {
      classes.push('btn-disabled');
    }

    if (this.loading()) {
      classes.push('btn-loading');
    }

    if (this.fullWidth()) {
      classes.push('btn-full');
    }

    if (this.iconOnly()) {
      classes.push('btn-icon');
    }

    return classes.join(' ');
  }
}
