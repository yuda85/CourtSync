# User Profile Dashboard Feature

## Overview

The User Profile Dashboard is the primary entry point for authenticated users in CourtSync. It serves as a personalized learning hub that aggregates course progress, provides quick actions, and helps users resume their exam preparation efficiently.

**Route:** `/app/dashboard`

**Purpose:** Answer the user's primary question: *"What should I study next?"*

---

## Architecture

### File Structure

```
src/app/
├── core/
│   ├── services/
│   │   └── dashboard.service.ts          # Data aggregation service
│   └── utils/
│       └── date-labels.ts                # Hebrew relative date formatting
├── features/
│   └── dashboard/
│       ├── dashboard.component.ts        # Main component logic
│       ├── dashboard.component.html      # Template
│       └── dashboard.component.scss      # Styles
└── shared/
    └── components/
        ├── progress-bar/                 # Reusable progress indicator
        ├── course-progress-card/         # Course card with progress
        └── empty-state/                  # Empty state displays
```

### Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Entitlements   │     │    Progress     │     │     Lessons     │
│      Repo       │     │      Repo       │     │      Repo       │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    DashboardService     │
                    │   (Data Aggregation)    │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   DashboardComponent    │
                    │    (Presentation)       │
                    └─────────────────────────┘
```

---

## View Models

### DashboardVM (Main)

The primary view model aggregating all dashboard data:

```typescript
interface DashboardVM {
  user: {
    displayName: string;
    photoURL?: string;
  };
  stats: DashboardStats;
  continueLearning: ContinueLearningVM;
  myCourses: CourseProgressCardVM[];
  recentActivity: RecentActivityVM[];
  filters: {
    subjects: string[];
  };
  isLoading: boolean;
}
```

### DashboardStats

```typescript
interface DashboardStats {
  activeCourses: number;      // Courses with progress < 100%
  completedCourses: number;   // Courses with progress = 100%
  totalLessonsCompleted: number;
}
```

### ContinueLearningVM

Hero section showing the next course to study:

```typescript
interface ContinueLearningVM {
  type: 'resume' | 'start' | 'empty';
  course?: Course;
  lesson?: Lesson;
  route: string;
  ctaText: string;              // "המשך ללמוד" | "התחל ללמוד" | "עבור לקטלוג"
  progressText?: string;        // "3 מתוך 10 שיעורים"
  lastActivityLabel?: string;   // "היום" | "אתמול" | "לפני 3 ימים"
  progressPercent?: number;
}
```

### CourseProgressCardVM

Individual course card data:

```typescript
interface CourseProgressCardVM {
  course: Course;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  status: 'חדש' | 'בתהליך' | 'הושלם';
  statusColor: 'new' | 'progress' | 'complete';
  lastActivityAt: Timestamp | null;
  lastActivityLabel: string;
  ctaText: string;              // "פתח" | "המשך" | "חזרה"
  ctaRoute: string;
  currentLessonId?: string;
}
```

### RecentActivityVM

```typescript
interface RecentActivityVM {
  courseId: string;
  courseTitle: string;
  lastActivityLabel: string;
  route: string;
  progressPercent: number;
}
```

---

## UI Sections

### 1. Welcome Header

Personalized greeting with user avatar.

| Element | Description |
|---------|-------------|
| Title | "שלום, {displayName}!" |
| Subtitle | "ברוך הבא חזרה. הנה ההתקדמות שלך." |
| Avatar | User photo or initial placeholder |

### 2. Stats Bar

Three stat cards showing:

| Stat | Icon | Color |
|------|------|-------|
| Active Courses | `menu_book` | Blue |
| Completed Courses | `check_circle` | Green |
| Lessons Completed | `star` | Yellow |

### 3. Continue Learning Hero

Large, prominent card highlighting the next action:

- **Resume**: Shows course + current lesson for users with progress
- **Start**: Shows newest purchased course for users without progress
- **Empty**: Shows CTA to browse catalog when no courses purchased

Features:
- Course title (prominent)
- Current lesson title (if available)
- Last activity label ("היום", "אתמול", etc.)
- Progress bar with percentage
- Primary CTA button

### 4. My Courses Grid

Responsive grid of course progress cards:

| Breakpoint | Columns |
|------------|---------|
| Mobile (<640px) | 1 |
| Tablet | 2 |
| Desktop | 3 |

**Features:**
- Search filter by course title/subject
- Sort options: Recent activity, Progress, Name
- Status badges (חדש/בתהליך/הושלם)
- Progress bar per course

### 5. Recent Activity

Vertical list showing courses with actual progress (max 5 items).

- Only displays courses where `completedLessons > 0`
- Shows course name, relative time, progress bar
- Click navigates to continue lesson

### 6. Quick Links

Navigation shortcuts:

| Link | Icon | Route |
|------|------|-------|
| הספרייה שלי | `local_library` | `/app/library` |
| כל הקורסים | `search` | `/app/courses` |
| פרופיל | `person` | `/app/profile` |

### 7. Exam Mode Placeholder

"Coming soon" section for future exam review mode.

- Dashed border styling indicates future feature
- Disabled button

---

## DashboardService

### Key Methods

```typescript
/**
 * Get the full dashboard view model
 * Cached with shareReplay for performance
 */
dashboardVM$(): Observable<DashboardVM>

/**
 * Force refresh the dashboard data
 * Clears cache and triggers new fetch
 */
refresh(): void
```

### Data Aggregation Logic

1. **Fetch entitlements** - Get user's purchased courses
2. **Fetch progress** - Get completion data for all courses
3. **Fetch course details** - Load course metadata
4. **Fetch lesson counts** - Count lessons per course
5. **Build VMs** - Transform raw data into view models
6. **Cache** - Store result with `shareReplay(1)`

### Status Determination

| Condition | Status | Status Color | CTA Text |
|-----------|--------|--------------|----------|
| progressPercent = 100 | הושלם | complete | חזרה |
| completedLessons > 0 | בתהליך | progress | המשך |
| completedLessons = 0 | חדש | new | פתח |

---

## Shared Components

### ProgressBarComponent

Reusable horizontal progress indicator.

**Inputs:**
| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `percent` | `number` | required | Progress 0-100 |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size variant |
| `showLabel` | `boolean` | `false` | Show percentage text |
| `color` | `'primary' \| 'success' \| 'warning'` | `'primary'` | Color theme |

**Auto-behavior:** Switches to `success` color at 100% if color is `primary`.

### EmptyStateComponent

Reusable empty state display.

**Inputs:**
| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `icon` | `'book' \| 'search' \| 'chart' \| 'folder' \| 'calendar'` | `'book'` | Icon type |
| `title` | `string` | required | Main title |
| `description` | `string` | - | Optional description |
| `ctaText` | `string` | - | Button text |
| `ctaRoute` | `string` | - | Navigation route |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size variant |

**Outputs:**
| Output | Type | Description |
|--------|------|-------------|
| `ctaClick` | `void` | Emitted when CTA clicked |

### CourseProgressCardComponent

Course card with progress visualization.

**Inputs:**
| Input | Type | Description |
|-------|------|-------------|
| `data` | `CourseProgressCardVM` | Card data |
| `compact` | `boolean` | Compact mode |

**Outputs:**
| Output | Type | Description |
|--------|------|-------------|
| `cardClick` | `CourseProgressCardVM` | Emitted on card click |

---

## Date Labels Utility

Hebrew relative date formatting.

```typescript
// src/app/core/utils/date-labels.ts

getRelativeDateLabel(date: Timestamp | Date | null): string
// Returns: "היום" | "אתמול" | "לפני יומיים" | "לפני X ימים" |
//          "לפני שבוע" | "לפני שבועיים" | "לפני X שבועות" |
//          "לפני חודש" | "לפני X חודשים" | "לפני יותר משנה"

formatDate(date: Timestamp | Date | null): string
// Returns: Hebrew locale formatted date (e.g., "15 בינו׳ 2024")
```

---

## Component Features

### Local State (Signals)

```typescript
vm = signal<DashboardVM | null>(null);
isLoading = signal(true);
searchQuery = signal('');
selectedSubject = signal<string | null>(null);
sortBy = signal<'recent' | 'progress' | 'name'>('recent');
```

### Computed Values

```typescript
// Filtered and sorted courses based on search/sort state
filteredCourses = computed(() => { ... });

// Check if user has any courses
hasCourses = computed(() => (vm()?.myCourses.length ?? 0) > 0);
```

### Event Handlers

| Method | Description |
|--------|-------------|
| `onSearch(event)` | Updates search query |
| `onSubjectFilter(subject)` | Filters by subject |
| `onSortChange(sort)` | Changes sort order |
| `onCourseClick(card)` | Navigates to course |
| `onContinueLearning()` | Navigates to continue route |
| `onBrowseCatalog()` | Navigates to `/app/courses` |
| `onGoToLibrary()` | Navigates to `/app/library` |
| `onGoToProfile()` | Navigates to `/app/profile` |
| `onRefresh()` | Refreshes dashboard data |

---

## Styling

### Theme Support

Full light/dark mode support via CSS custom properties:

```scss
// Light mode
--surface: #ffffff
--surface-2: #f8fafc
--text: #1e293b
--muted: #64748b
--border: #e2e8f0
--primary: #3b82f6

// Dark mode (via [data-theme="dark"])
// Inverted values for dark backgrounds
```

### Animations

Staggered fade-in animations on page load:

```scss
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

// Applied with increasing delays:
// Header: 0s, Stats: 0.1s, Hero: 0.2s, etc.
```

### Responsive Breakpoints

| Breakpoint | Behavior |
|------------|----------|
| < 640px | Single column, compact layout |
| 640px+ | Multi-column grids, full avatars |

---

## Empty States

### No Purchased Courses

```
Icon: book
Title: "עדיין לא רכשת קורסים"
Description: "גלה את מגוון הקורסים שלנו והתחל את המסע שלך להכנה למבחן"
CTA: "עיין בקטלוג"
```

### No Search Results

```
Icon: search
Title: "לא נמצאו תוצאות"
Description: "נסה לחפש מונח אחר או בטל את הסינון"
Size: sm
```

### Error State

```
Icon: chart
Title: "אירעה שגיאה"
Description: "לא הצלחנו לטעון את הדשבורד. נסה לרענן את הדף."
CTA: "רענן"
```

---

## Icons

Using Material Icons (Google Fonts):

| Context | Icon |
|---------|------|
| Courses | `menu_book`, `school` |
| Completed | `check_circle` |
| Lessons | `star` |
| Time | `schedule` |
| Play/Continue | `play_arrow`, `play_circle` |
| Refresh | `refresh` |
| Search | `search` |
| Library | `local_library` |
| Profile | `person` |
| Exam | `assignment` |
| Navigation | `chevron_left`, `arrow_back`, `arrow_forward` |

---

## Testing Checklist

### Functionality
- [ ] Dashboard loads with user's purchased courses
- [ ] Stats show correct counts
- [ ] Continue Learning hero shows most recent course with progress
- [ ] Continue Learning shows newest purchased if no progress
- [ ] Continue Learning shows empty state if no purchases
- [ ] Course cards show correct progress percentages
- [ ] Course cards show correct status chips
- [ ] Recent Activity shows only courses with progress
- [ ] Search filters courses correctly
- [ ] Sort options work (recent, progress, name)
- [ ] Quick links navigate correctly
- [ ] Exam mode placeholder is visible but disabled

### Responsive
- [ ] Mobile: Single column layout
- [ ] Tablet: 2-column grid
- [ ] Desktop: 3-column grid

### Theme
- [ ] Light theme renders correctly
- [ ] Dark theme renders correctly
- [ ] Focus states are visible

### Edge Cases
- [ ] Empty state: No purchased courses
- [ ] Single course purchased
- [ ] All courses completed
- [ ] Long course titles truncate properly
