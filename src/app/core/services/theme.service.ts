import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ThemeMode = 'system' | 'light' | 'dark';

const THEME_STORAGE_KEY = 'courtsync-theme';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  /** Current theme mode setting */
  readonly themeMode = signal<ThemeMode>(this.getStoredTheme());

  /** Resolved theme (system preference resolved to light/dark) */
  readonly resolvedTheme = signal<'light' | 'dark'>('light');

  private mediaQuery: MediaQueryList | null = null;

  constructor() {
    if (this.isBrowser) {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.mediaQuery.addEventListener('change', this.handleSystemThemeChange.bind(this));
    }

    // Effect to apply theme whenever themeMode changes
    effect(() => {
      this.applyTheme(this.themeMode());
    });

    // Initial theme application
    this.applyTheme(this.themeMode());
  }

  /** Set the theme mode */
  setTheme(mode: ThemeMode): void {
    this.themeMode.set(mode);
    if (this.isBrowser) {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    }
  }

  /** Cycle through theme modes: system -> light -> dark -> system */
  cycleTheme(): void {
    const current = this.themeMode();
    const next: ThemeMode = current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system';
    this.setTheme(next);
  }

  /** Get the stored theme from localStorage */
  private getStoredTheme(): ThemeMode {
    if (!this.isBrowser) return 'system';
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    return 'system';
  }

  /** Apply the theme to the document */
  private applyTheme(mode: ThemeMode): void {
    if (!this.isBrowser) return;

    const resolved = this.resolveTheme(mode);
    this.resolvedTheme.set(resolved);

    // Apply data-theme attribute
    document.documentElement.setAttribute('data-theme', resolved);

    // Ensure RTL direction is maintained for Hebrew
    document.documentElement.setAttribute('dir', 'rtl');
    document.documentElement.style.direction = 'rtl';
  }

  /** Resolve system theme to actual light/dark */
  private resolveTheme(mode: ThemeMode): 'light' | 'dark' {
    if (mode === 'system') {
      return this.getSystemTheme();
    }
    return mode;
  }

  /** Get the system's preferred color scheme */
  private getSystemTheme(): 'light' | 'dark' {
    if (!this.isBrowser || !this.mediaQuery) return 'light';
    return this.mediaQuery.matches ? 'dark' : 'light';
  }

  /** Handle system theme changes when in system mode */
  private handleSystemThemeChange(): void {
    if (this.themeMode() === 'system') {
      this.applyTheme('system');
    }
  }
}

/** Factory function for APP_INITIALIZER to initialize theme on app startup */
export function initializeTheme(themeService: ThemeService): () => void {
  return () => {
    // Theme is already initialized in constructor
    // This ensures the service is created early
  };
}
