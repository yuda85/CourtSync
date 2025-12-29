import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, ThemeMode } from '@core/services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './theme-toggle.component.html',
  styleUrl: './theme-toggle.component.scss'
})
export class ThemeToggleComponent {
  private readonly themeService = inject(ThemeService);

  readonly themeMode = this.themeService.themeMode;
  readonly isOpen = signal(false);

  readonly themes: { mode: ThemeMode; label: string; icon: string }[] = [
    { mode: 'system', label: 'מערכת', icon: 'computer' },
    { mode: 'light', label: 'בהיר', icon: 'sun' },
    { mode: 'dark', label: 'כהה', icon: 'moon' }
  ];

  toggleDropdown(): void {
    this.isOpen.update(open => !open);
  }

  selectTheme(mode: ThemeMode): void {
    this.themeService.setTheme(mode);
    this.isOpen.set(false);
  }

  closeDropdown(): void {
    this.isOpen.set(false);
  }

  getCurrentThemeLabel(): string {
    return this.themes.find(t => t.mode === this.themeMode())?.label || 'מערכת';
  }

  getCurrentThemeIcon(): string {
    return this.themes.find(t => t.mode === this.themeMode())?.icon || 'computer';
  }
}
