# Profile Page

## Overview

The Profile page serves as the unified user hub, combining identity management, learning progress, and personal settings into a single cohesive experience. It replaces the previous separate Dashboard and Profile pages.

## Features

### User Identity Section
- **Avatar Display**: Shows user photo from Google auth or generates a letter placeholder
- **Name & Email**: User's display name and email address
- **Role Badge**: Visual indicator showing user role (סטודנט, מנהל תוכן, מנהל ראשי)
- **Member Since**: Date when user joined the platform
- **Admin Link**: Quick access to admin dashboard (visible only for admin/superadmin)

### Continue Learning Hero
A prominent hero section that helps users resume their learning:
- Shows the most recently accessed course that isn't completed
- Displays current lesson title
- Progress bar with percentage
- "Continue" CTA button
- Last activity timestamp
- Automatically hidden when user has no courses or all courses completed

### Statistics Cards
Three stat cards showing learning progress:
1. **Active Courses** - Number of courses currently in progress
2. **Completed Courses** - Number of finished courses
3. **Lessons Completed** - Total number of lessons completed across all courses

### My Courses Section
A complete list of all user's purchased courses:
- Sorted by most recent activity
- Each course shows:
  - Course title
  - Subject area
  - Last activity timestamp
  - Progress indicator (pill component)
  - Status badge (חדש / בתהליך / הושלם)
- Empty state with CTA to browse catalog when no courses owned

### Settings Section
User preferences:
- **Theme Toggle**: Switch between light, dark, or system theme
  - Persisted to localStorage
  - Applied globally via `data-theme` attribute

### Sign Out
Prominent sign out button at the bottom of the page.

## Technical Implementation

### Component Structure

```
src/app/features/profile/
├── profile.component.ts      # Component logic with signals
├── profile.component.html    # Template with sections
└── profile.component.scss    # Premium styling
```

### Dependencies

- **DashboardService** (`@core/services/dashboard.service.ts`)
  - Provides `DashboardVM` with all learning data
  - Aggregates entitlements, courses, progress, and lessons
  - Builds continue learning hero data
  - Calculates stats

- **ThemeService** (`@core/services/theme.service.ts`)
  - Manages theme preference
  - Persists to localStorage
  - Applies theme via CSS custom properties

- **RoleService** (`@core/services/role.service.ts`)
  - Provides `isAdmin()` and `isSuperAdmin()` signals
  - Used for role badge display and admin link visibility

### Key Interfaces

```typescript
interface ContinueLearningVM {
  type: 'resume' | 'start' | 'empty';
  course?: Course;
  lesson?: Lesson;
  route: string;
  ctaText: string;
  progressText?: string;
  lastActivityLabel?: string;
  progressPercent?: number;
}

interface CourseProgressCardVM {
  course: Course;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  status: 'חדש' | 'בתהליך' | 'הושלם';
  statusColor: 'new' | 'progress' | 'complete';
  lastActivityAt: Timestamp | null;
  lastActivityLabel: string;
  ctaText: string;
  ctaRoute: string;
  currentLessonId?: string;
}
```

### Signals

```typescript
// User identity
profile: Signal<UserProfile | null>
firebaseUser: Signal<FirebaseUser | null>

// Dashboard data
dashboardData: Signal<DashboardVM | null>

// Computed from dashboard
continueLearning: Computed<ContinueLearningVM | null>
allCourses: Computed<CourseProgressCardVM[]>
activeCourses: Computed<number>
completedCourses: Computed<number>
totalLessonsCompleted: Computed<number>
hasCourses: Computed<boolean>

// Theme
currentTheme: Computed<ThemeMode>

// Roles
isAdmin: Signal<boolean>
isSuperAdmin: Signal<boolean>
```

## Design System

### Color Palette

The Profile page uses a warm, sophisticated color scheme with golden amber accents:

**Light Mode:**
- Background: Warm cream gradient (`#fef9e7` → `#fdf6e3` → `#f8f4ea`)
- Accent: Golden amber (`#c9a227`)
- Text Primary: Deep slate (`#1a1f2e`)
- Text Secondary: Muted gray (`#5a6178`)
- Glass: White at 85% opacity

**Dark Mode:**
- Background: Deep slate gradient (`#0f1219` → `#151922` → `#1a1f2e`)
- Accent: Bright gold (`#d4af37`)
- Text Primary: Light gray (`#f0f2f5`)
- Text Secondary: Muted gray (`#8b92a5`)
- Glass: Dark slate at 90% opacity

### Visual Effects

- **Glass-morphism**: Hero card and content cards use backdrop blur
- **Grain Texture**: Subtle noise overlay for premium feel
- **Animated Orb**: Floating gradient in hero section
- **Grid Pattern**: Subtle grid lines in hero background
- **Golden Ring**: Pulsing accent ring around avatar

### Animations

- **Content Reveal**: Staggered fade-up animation on page load
- **Card Hover**: Lift effect with shadow enhancement
- **Course Items**: Slide effect with accent line on hover
- **Icon Scale**: Icons grow on parent hover
- **Ring Pulse**: Avatar ring subtle breathing animation

### Responsive Design

- **Desktop (>640px)**: Full layout with horizontal stats grid
- **Mobile (≤640px)**:
  - Centered header with stacked elements
  - Compact stat cards
  - Full-width hero CTA
  - Stacked course item elements
  - Wrapped theme buttons

## Routes

- `/app/profile` - Main profile page
- `/app/dashboard` - Redirects to profile (backward compatibility)

## Related Components

- `ProgressBarComponent` - Used in hero section
- `ProgressPillComponent` - Used in course list items
- `ButtonComponent` - Used for CTAs and sign out

## Migration Notes

The Dashboard component was removed and its functionality merged into Profile:
- Continue Learning hero - moved from Dashboard
- Stats cards - unified format from Dashboard
- Course list - shows all courses, sorted by recent activity
- Removed: Search/sort UI, subject filters, quick links grid, exam mode placeholder
