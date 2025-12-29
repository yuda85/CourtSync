# Feature #1: Foundation & Authentication

## Overview

This feature establishes the core foundation of CourtSync, including project setup, authentication, theming, and the initial user interface.

## Status: Complete

## Scope

### What's Included

1. **Project Configuration**
   - Angular 21 with standalone components
   - Tailwind CSS integration
   - SCSS styling with CSS custom properties
   - TypeScript path aliases
   - GitHub Pages deployment setup

2. **Firebase Integration**
   - Firebase App initialization
   - Firebase Authentication (Google Sign-In)
   - Cloud Firestore for user profiles

3. **Theme System**
   - Light/Dark/System modes
   - Persistent theme preference
   - Flash-free theme initialization
   - Theme toggle component

4. **RTL Support**
   - Hebrew language UI
   - Right-to-left text direction
   - RTL-aware layouts

5. **Authentication**
   - Google Sign-In popup
   - Route guards (auth & guest)
   - User profile management

6. **Core Pages**
   - Landing page (public)
   - Dashboard (authenticated)
   - Shell layout wrapper

## Components Created

### Core Services

| Service | Purpose |
|---------|---------|
| `AuthService` | Google auth, user state, sign in/out |
| `ThemeService` | Theme mode management, persistence |
| `UserProfileService` | Firestore user profile CRUD |

### Guards

| Guard | Purpose |
|-------|---------|
| `authGuard` | Protects `/app/*` routes, requires authentication |
| `guestGuard` | Protects landing page, redirects authenticated users |

### Shared Components

| Component | Purpose |
|-----------|---------|
| `ButtonComponent` | Reusable button with variants (primary, secondary, outline) |
| `ThemeToggleComponent` | Dropdown for theme selection |
| `HeaderComponent` | App header with logo, theme toggle, auth actions |

### Feature Components

| Component | Purpose |
|-----------|---------|
| `LandingComponent` | Public landing page with hero, features, CTA |
| `ShellComponent` | Authenticated layout wrapper with header |
| `DashboardComponent` | User dashboard with stats and quick actions |

## File Structure

```
src/
├── app/
│   ├── core/
│   │   ├── guards/
│   │   │   ├── auth.guard.ts
│   │   │   └── guest.guard.ts
│   │   ├── models/
│   │   │   └── user-profile.interface.ts
│   │   └── services/
│   │       ├── auth.service.ts
│   │       ├── theme.service.ts
│   │       └── user-profile.service.ts
│   │
│   ├── shared/
│   │   └── components/
│   │       ├── button/
│   │       │   ├── button.component.ts
│   │       │   ├── button.component.html
│   │       │   └── button.component.scss
│   │       ├── header/
│   │       │   ├── header.component.ts
│   │       │   ├── header.component.html
│   │       │   └── header.component.scss
│   │       └── theme-toggle/
│   │           ├── theme-toggle.component.ts
│   │           ├── theme-toggle.component.html
│   │           └── theme-toggle.component.scss
│   │
│   ├── features/
│   │   ├── landing/
│   │   │   ├── landing.component.ts
│   │   │   ├── landing.component.html
│   │   │   └── landing.component.scss
│   │   ├── shell/
│   │   │   ├── shell.component.ts
│   │   │   ├── shell.component.html
│   │   │   └── shell.component.scss
│   │   └── dashboard/
│   │       ├── dashboard.component.ts
│   │       ├── dashboard.component.html
│   │       └── dashboard.component.scss
│   │
│   ├── app.component.ts
│   ├── app.component.html
│   ├── app.config.ts
│   └── app.routes.ts
│
├── environments/
│   ├── environment.ts
│   └── environment.prod.ts
│
├── styles/
│   ├── _theme-tokens.scss
│   ├── _direction.scss
│   └── _tailwind-overrides.scss
│
├── styles.scss
└── index.html
```

## Routes

| Path | Component | Guard | Description |
|------|-----------|-------|-------------|
| `/` | LandingComponent | guestGuard | Public landing page |
| `/app` | ShellComponent | authGuard | Authenticated layout |
| `/app/dashboard` | DashboardComponent | authGuard | User dashboard |
| `**` | - | - | Redirects to `/` |

## User Flows

### Sign In Flow

```
1. User lands on "/" (Landing Page)
2. Guest guard checks auth state
   - If authenticated → redirect to /app/dashboard
   - If not → show landing page
3. User clicks "Sign in with Google"
4. Google OAuth popup opens
5. User authenticates
6. AuthService receives Firebase user
7. UserProfileService creates/updates profile in Firestore
8. Router navigates to /app/dashboard
9. Auth guard validates → Dashboard loads
```

### Sign Out Flow

```
1. User clicks sign out in header
2. AuthService.signOut() called
3. Firebase session cleared
4. Router navigates to /
5. Landing page shown
```

### Theme Change Flow

```
1. User clicks theme toggle dropdown
2. Selects mode (System/Light/Dark)
3. ThemeService.setTheme() called
4. Mode saved to localStorage
5. data-theme attribute updated on <html>
6. CSS custom properties switch instantly
```

## UI Sections

### Landing Page

1. **Header** (sticky)
   - Logo: "CourtSync"
   - Theme toggle
   - "Sign in with Google" button

2. **Hero Section**
   - Headline: "הדרך החכמה ללמוד"
   - Subtitle with value proposition
   - CTA button
   - Visual card showing app preview

3. **Features Section** (3 cards)
   - "ממוקד מבחנים" - Exam focused
   - "קורסים קצרים וברורים" - Short, clear courses
   - "מסלולי למידה" - Learning paths

4. **CTA Section**
   - Secondary call-to-action with sign-in

5. **Footer**
   - Logo
   - Navigation links
   - Copyright

### Dashboard

1. **Welcome Section**
   - Personalized greeting with user name
   - User avatar

2. **Stats Grid** (4 cards)
   - Courses enrolled
   - Completed lessons
   - Study streak
   - Certificates

3. **Quick Actions** (3 buttons)
   - Continue learning
   - Browse courses
   - View progress

4. **Placeholder Section**
   - "Coming soon" message for future content

## Design Tokens

### Colors (Light Theme)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | #F6FAFF | Main background |
| `--surface` | #FFFFFF | Cards, panels |
| `--text` | #0B1A33 | Primary text |
| `--muted` | #4A6078 | Secondary text |
| `--primary` | #1E8ED8 | Brand color, CTAs |
| `--border` | #D6E6F5 | Borders, dividers |

### Colors (Dark Theme)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | #081020 | Main background |
| `--surface` | #0B1A33 | Cards, panels |
| `--text` | #F8F8F8 | Primary text |
| `--muted` | #B7C4D6 | Secondary text |
| `--primary` | #30B8F0 | Brand color, CTAs |
| `--border` | #1B2B45 | Borders, dividers |

## Testing Checklist

- [x] App builds without errors
- [x] Runs locally with `ng serve`
- [x] Firebase Google auth works
- [x] User profile created in Firestore
- [x] Theme toggle persists across sessions
- [x] All UI text displays in Hebrew
- [x] RTL direction works correctly
- [x] Responsive on mobile/tablet/desktop
- [x] Auth guard protects `/app/*` routes
- [x] Guest guard redirects authenticated users
- [x] Sign out returns to landing page

## Known Limitations

1. **Firestore Rules**: Currently uses basic user-owns-document pattern
2. **Error Handling**: Hebrew error messages for common auth errors only
3. **Offline Support**: No offline capability yet
4. **Loading States**: Basic loading indicators

## Future Enhancements

- Add more authentication providers (email/password, Apple, etc.)
- Implement remember me / persistent sessions
- Add user profile editing
- Implement proper error boundary components
- Add analytics tracking
- Implement service worker for offline support
