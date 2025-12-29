# CourtSync Architecture

## Overview

CourtSync is a Hebrew-language Learning Management System (LMS) built with Angular 21 and Firebase. The application follows a modular architecture with clear separation of concerns, using standalone components throughout.

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend Framework | Angular 21 (Standalone Components) |
| Styling | Tailwind CSS + SCSS |
| Authentication | Firebase Auth (Google Sign-In) |
| Database | Cloud Firestore |
| Hosting | GitHub Pages |
| Language | Hebrew (RTL) |

## Project Structure

```
src/
├── app/
│   ├── core/                    # Singleton services, guards, models
│   │   ├── guards/
│   │   │   ├── auth.guard.ts    # Protects authenticated routes
│   │   │   └── guest.guard.ts   # Protects guest-only routes
│   │   ├── models/
│   │   │   └── user-profile.interface.ts
│   │   └── services/
│   │       ├── auth.service.ts
│   │       ├── theme.service.ts
│   │       └── user-profile.service.ts
│   │
│   ├── shared/                  # Reusable components
│   │   └── components/
│   │       ├── button/
│   │       ├── header/
│   │       └── theme-toggle/
│   │
│   ├── features/                # Feature modules (lazy-loaded)
│   │   ├── landing/             # Public landing page
│   │   ├── shell/               # Authenticated layout wrapper
│   │   └── dashboard/           # User dashboard
│   │
│   ├── app.component.ts         # Root component
│   ├── app.config.ts            # Application configuration
│   └── app.routes.ts            # Route definitions
│
├── environments/                # Environment configurations
│   ├── environment.ts
│   └── environment.prod.ts
│
├── styles/                      # Global SCSS
│   ├── _theme-tokens.scss       # CSS custom properties
│   ├── _direction.scss          # RTL enforcement
│   └── _tailwind-overrides.scss
│
└── index.html                   # Entry point with RTL setup
```

## Core Concepts

### 1. Standalone Components

All components use Angular's standalone architecture (no NgModules):

```typescript
@Component({
  selector: 'app-example',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './example.component.html'
})
export class ExampleComponent {}
```

### 2. Signal-Based State Management

The application uses Angular Signals for reactive state:

```typescript
// In AuthService
readonly user = toSignal(user(this.auth), { initialValue: null });
readonly isAuthenticated = computed(() => this.user() !== null);
readonly isLoading = signal(false);
```

### 3. Functional Route Guards

Guards use the `CanActivateFn` pattern with RxJS:

```typescript
export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  return authState(auth).pipe(
    first(),
    timeout(5000),
    map(user => user ? true : router.createUrlTree(['/']))
  );
};
```

### 4. Lazy Loading

Feature modules are lazy-loaded for optimal performance:

```typescript
{
  path: 'app',
  loadComponent: () => import('@features/shell/shell.component')
    .then(m => m.ShellComponent),
  children: [...]
}
```

## Theming System

### Theme Modes

The app supports three theme modes:
- **System**: Follows OS preference
- **Light**: Light color scheme
- **Dark**: Dark color scheme

### CSS Custom Properties

Themes are implemented using CSS custom properties defined in `_theme-tokens.scss`:

```scss
html[data-theme="light"] {
  --bg: #F6FAFF;
  --surface: #FFFFFF;
  --text: #0B1A33;
  --primary: #1E8ED8;
  // ...
}

html[data-theme="dark"] {
  --bg: #081020;
  --surface: #0B1A33;
  --text: #F8F8F8;
  --primary: #30B8F0;
  // ...
}
```

### Theme Initialization

Theme is initialized before Angular boots to prevent flash:

```html
<!-- In index.html -->
<script>
  (function() {
    var theme = localStorage.getItem('courtsync-theme');
    var resolved = theme === 'system' || !theme
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    document.documentElement.setAttribute('data-theme', resolved);
  })();
</script>
```

## RTL Support

The application is designed for Hebrew (RTL):

1. **HTML Direction**: `<html lang="he-IL" dir="rtl">`
2. **Runtime Enforcement**: MutationObserver prevents direction changes
3. **CSS Enforcement**: `direction: rtl !important` in global styles
4. **Flexbox Layouts**: Use `flex-row-reverse` for proper RTL flow

## Authentication Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Landing   │────▶│ Google Auth  │────▶│  Dashboard  │
│    Page     │     │    Popup     │     │             │
└─────────────┘     └──────────────┘     └─────────────┘
       │                                        │
       │         ┌──────────────┐               │
       └─────────│ Guest Guard  │◀──────────────┘
                 │ (redirects)  │
                 └──────────────┘
```

1. User visits landing page
2. Clicks "Sign in with Google"
3. Firebase Auth popup opens
4. On success, user profile created/updated in Firestore
5. Router navigates to `/app/dashboard`
6. Auth guard validates session
7. Guest guard redirects authenticated users away from landing

## Data Model

### UserProfile

```typescript
interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  roles: string[];
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
}
```

### Firestore Structure

```
firestore/
└── users/
    └── {uid}/
        ├── displayName: string
        ├── email: string
        ├── photoURL: string
        ├── roles: string[]
        ├── createdAt: Timestamp
        └── lastLoginAt: Timestamp
```

## Path Aliases

TypeScript path aliases for cleaner imports:

| Alias | Path |
|-------|------|
| `@core/*` | `src/app/core/*` |
| `@shared/*` | `src/app/shared/*` |
| `@features/*` | `src/app/features/*` |
| `@env` | `src/environments/environment` |

## Build & Deployment

### Development

```bash
npm start          # Runs ng serve
```

### Production Build

```bash
npm run build      # Builds with production config
```

### GitHub Pages Deployment

```bash
npm run deploy     # Builds and deploys to gh-pages
```

The production build uses:
- `baseHref: "/CourtSync/"` for GitHub Pages routing
- Output hashing for cache busting
- Budget limits for bundle size monitoring

## Security Considerations

1. **Firestore Rules**: Users can only read/write their own profile
2. **Route Guards**: Protected routes require authentication
3. **No Secrets in Code**: Firebase config is public (security via Firestore rules)
4. **HTTPS Only**: Enforced by GitHub Pages
