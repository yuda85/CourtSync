# Feature #2: Course Catalog & Entitlements

## Overview

This feature implements the course catalog system with public and authenticated access, course details pages, user entitlements for purchased courses, and a personal library view.

## Status: Complete

## Scope

### What's Included

1. **Data Models**
   - Course interface with Hebrew content support
   - Course outline (sections and lessons)
   - User entitlements for course access
   - Filter interfaces for catalog

2. **Data Layer (Repositories)**
   - CoursesRepo: Direct Firestore access for courses collection
   - EntitlementsRepo: User entitlements in subcollection

3. **Caching Layer**
   - CoursesCatalogService: Caching layer with shareReplay
   - Utility methods for formatting and styling

4. **Public Pages (No Auth Required)**
   - Course catalog with search and filters
   - Course details with syllabus preview

5. **Protected Pages (Auth Required)**
   - Course learning page
   - My Library (purchased courses)

6. **Access Control**
   - Entitlement guard for learning pages
   - Demo purchase flow

## Components Created

### Core Services & Repositories

| Service/Repo | Purpose |
|--------------|---------|
| `CoursesRepo` | Firestore queries for courses and outlines |
| `EntitlementsRepo` | User entitlements CRUD, access checks |
| `CoursesCatalogService` | Caching layer, formatting utilities |

### Guards

| Guard | Purpose |
|-------|---------|
| `entitlementGuard` | Protects `/app/courses/:id/learn`, requires course access |

### Models

| Interface | Purpose |
|-----------|---------|
| `Course` | Course data with Hebrew fields |
| `CourseOutlineItem` | Section or lesson in course outline |
| `Entitlement` | User's purchased/granted course access |
| `CourseFilters` | Search, subject, and level filters |

### Shared Components

| Component | Purpose |
|-----------|---------|
| `CourseCardComponent` | Reusable course card with image, badges, price |
| `CourseGridComponent` | Responsive grid of course cards with loading/empty states |

### Feature Components

| Component | Route | Purpose |
|-----------|-------|---------|
| `CatalogComponent` | `/courses` (public), `/app/courses` | Full course catalog with filters |
| `DetailsComponent` | `/courses/:id` (public), `/app/courses/:id` | Course details, syllabus, enrollment |
| `LearnComponent` | `/app/courses/:id/learn` | Learning page placeholder |
| `LibraryComponent` | `/app/library` | User's purchased courses |

## File Structure

```
src/app/
├── core/
│   ├── guards/
│   │   └── entitlement.guard.ts
│   ├── models/
│   │   ├── course.interface.ts
│   │   └── entitlement.interface.ts
│   ├── repos/
│   │   ├── courses.repo.ts
│   │   └── entitlements.repo.ts
│   ├── services/
│   │   └── courses-catalog.service.ts
│   └── data/
│       └── sample-courses.ts
│
├── shared/components/
│   ├── course-card/
│   │   ├── course-card.component.ts
│   │   ├── course-card.component.html
│   │   └── course-card.component.scss
│   └── course-grid/
│       ├── course-grid.component.ts
│       ├── course-grid.component.html
│       └── course-grid.component.scss
│
└── features/
    ├── courses/
    │   ├── catalog/
    │   │   ├── catalog.component.ts
    │   │   ├── catalog.component.html
    │   │   └── catalog.component.scss
    │   ├── details/
    │   │   ├── details.component.ts
    │   │   ├── details.component.html
    │   │   └── details.component.scss
    │   └── learn/
    │       ├── learn.component.ts
    │       ├── learn.component.html
    │       └── learn.component.scss
    └── library/
        ├── library.component.ts
        ├── library.component.html
        └── library.component.scss
```

## Routes

| Path | Component | Guard | Description |
|------|-----------|-------|-------------|
| `/courses` | CatalogComponent | - | Public course catalog |
| `/courses/:id` | DetailsComponent | - | Public course details |
| `/app/courses` | CatalogComponent | authGuard | Authenticated catalog |
| `/app/courses/:id` | DetailsComponent | authGuard | Authenticated details |
| `/app/courses/:id/learn` | LearnComponent | authGuard, entitlementGuard | Course learning (requires purchase) |
| `/app/library` | LibraryComponent | authGuard | User's purchased courses |

## Data Architecture

### Course Document Structure

```typescript
interface Course {
  id: string;
  title: string;           // Hebrew title
  subject: string;         // Law subject (דיני חוזים, etc.)
  level: string;           // בסיסי | בינוני | מתקדם
  durationMinutes: number;
  priceIls: number;        // Price in ILS (0 = free)
  shortDescription: string;
  longDescription: string;
  coverImageUrl?: string;
  updatedAt: Timestamp;
  isPublished: boolean;
  isFeatured?: boolean;
  featuredOrder?: number;
}
```

### Course Outline Subcollection

```typescript
interface CourseOutlineItem {
  id: string;
  type: 'section' | 'lesson';
  title: string;
  order: number;
  lessonId?: string;
}
```

### User Entitlements Subcollection

Path: `/users/{uid}/entitlements/{entId}`

```typescript
interface Entitlement {
  id: string;
  type: 'course' | 'path' | 'bundle';
  refId: string;           // courseId
  purchasedAt: Timestamp;
  source: 'demo' | 'payment';
  pricePaidIls?: number;
}
```

## User Flows

### Browse Courses (Public)

```
1. User visits /courses (no login required)
2. CatalogComponent loads with header
3. Courses fetched from CoursesCatalogService
4. User can:
   - Search by title/description
   - Filter by subject (Law categories)
   - Filter by level (בסיסי/בינוני/מתקדם)
5. CTA at bottom encourages sign-up
```

### View Course Details (Public)

```
1. User clicks course card
2. Navigate to /courses/:id
3. DetailsComponent loads course and outline
4. User sees:
   - Course hero with gradient
   - Subject and level badges
   - Duration and lesson count
   - Price or "Free" indicator
   - Full description
   - Expandable course outline
5. Button shows "Sign in to Enroll"
```

### Sign In from Course Page

```
1. User on /courses/:id clicks "Sign in to Enroll"
2. Google OAuth popup opens
3. User authenticates
4. User stays on same page (not redirected to dashboard)
5. Page re-renders showing purchase button
6. User can now purchase/enroll
```

### Purchase Course

```
1. Authenticated user on course details
2. Clicks "Purchase" or "Start Free"
3. EntitlementsRepo.purchaseDemoCourse() called
4. Entitlement document created in Firestore
5. hasAccess signal updated to true
6. Navigate to /app/courses/:id/learn
```

### Access My Library

```
1. User navigates to /app/library
2. EntitlementsRepo fetches user's entitlements
3. Course details fetched for each entitlement
4. Grid shows only purchased courses
5. Click navigates to learning page
```

## UI Sections

### Course Catalog

1. **Header** (public only)
   - Logo, theme toggle, sign-in button

2. **Page Header**
   - Title: "קטלוג קורסים"
   - Subtitle

3. **Filter Bar** (sticky)
   - Search input with icon
   - Subject dropdown
   - Level dropdown
   - Clear filters button

4. **Results Info**
   - Count: "נמצאו X קורסים"

5. **Course Grid**
   - Responsive: 1/2/3 columns
   - Loading skeletons
   - Empty state message

6. **CTA Section** (public only)
   - Gradient background
   - Encourages sign-up
   - Google sign-in button

### Course Details

1. **Header** (public only)
   - Logo, theme toggle, sign-in button

2. **Hero Section**
   - Gradient background by subject
   - Back button
   - Subject and level badges
   - Title, description
   - Duration and lessons count
   - Price card with action button

3. **Content Section**
   - "About Course" with long description
   - "Course Content" with outline
   - Expandable sections
   - Lesson list with lock/play icons

### Course Card

- Cover image or gradient fallback
- Subject badge (colored)
- Level badge (colored)
- Title
- Duration
- Price (₪X or "חינם")
- Hover lift effect

## Subject Colors

| Subject | Color Class | Gradient |
|---------|-------------|----------|
| דיני חוזים | Blue | from-blue-600 to-blue-800 |
| דיני עונשין | Red | from-red-600 to-red-800 |
| דיני נזיקין | Amber | from-amber-600 to-amber-800 |
| משפט חוקתי | Purple | from-purple-600 to-purple-800 |
| דיני קניין | Emerald | from-emerald-600 to-emerald-800 |
| דיני משפחה | Pink | from-pink-600 to-pink-800 |

## Level Badges

| Level | Color |
|-------|-------|
| בסיסי | Emerald (green) |
| בינוני | Amber (yellow) |
| מתקדם | Red |

## Dark Mode Support

All components support dark mode through:
- CSS custom properties (`var(--color-bg-primary)`, etc.)
- `[data-theme="dark"]` selectors for specific overrides
- Tailwind dark variants where applicable

Key dark mode considerations:
- Filter bar background adapts
- Input fields and dropdowns use theme colors
- Course cards have appropriate shadows
- Badges remain readable with adjusted colors

## Testing Checklist

- [x] Public catalog loads without auth
- [x] Public course details loads without auth
- [x] Header shows on public pages only
- [x] Sign-in from course page stays on page
- [x] Search filters work correctly
- [x] Subject filter works correctly
- [x] Level filter works correctly
- [x] Clear filters resets all
- [x] Course cards display correctly
- [x] Course details hero renders
- [x] Course outline expands/collapses
- [x] Purchase creates entitlement
- [x] Entitlement guard blocks unauthorized access
- [x] My Library shows purchased courses only
- [x] Dark mode works on all pages
- [x] RTL text alignment correct
- [x] Responsive on mobile/tablet/desktop
- [x] App builds without errors

## Sample Data

6 law courses included:
1. דיני חוזים - יסודות (Free)
2. דיני עונשין - מבוא (₪149)
3. דיני נזיקין - עקרונות (₪129)
4. משפט חוקתי - יסודות (₪179)
5. דיני קניין - מבוא (₪149)
6. דיני משפחה - יסודות (₪99)

## Known Limitations

1. **Demo Purchases**: No real payment integration - entitlements created directly
2. **Course Content**: Learn page is placeholder only
3. **Progress Tracking**: Not yet implemented
4. **Offline Support**: Courses not cached for offline access
5. **Images**: Using gradient fallbacks, no actual cover images

## Future Enhancements

- Real payment integration (Stripe/PayPlus)
- Video player for lessons
- Progress tracking per lesson
- Quiz/assessment functionality
- Certificate generation
- Course ratings and reviews
- Instructor profiles
- Course recommendations
- Favorites/bookmarks
- Course bundles and paths
