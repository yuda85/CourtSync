# Feature #3: Enhanced Lesson Learning Experience

## Overview

This feature enhances the lesson learning page with a sticky sidebar navigation, user notes system, video bookmarks, and improved video player controls. The design focuses on creating a distraction-free learning environment with easy navigation and note-taking capabilities.

## Status: Complete

## Scope

### What's Included

1. **Course Sections & Navigation**
   - Courses organized into sections/modules
   - Collapsible section accordion in sidebar
   - Progress tracking per section
   - Visual indicators for current, completed, and flagged lessons

2. **Sticky Sidebar**
   - Desktop: Always visible, sticky at 89px below header
   - Mobile: Slide-in panel (75% width) with backdrop
   - Shows full course outline with sections
   - Progress bar showing overall completion

3. **Notes System**
   - Per-lesson notes with optional video timestamp
   - Course-wide general notes
   - Tab interface to switch between note types
   - Click timestamp to seek video
   - Auto-save support

4. **Video Enhancements**
   - Playback speed control (0.5x - 2x)
   - Timestamp bookmarks with titles
   - Picture-in-Picture support
   - Keyboard shortcuts (Space, arrows, M)
   - Auto-save/restore playback position

5. **Additional Learning Features**
   - Mark lessons for review (flag)
   - Lesson completion tracking
   - Navigation between lessons (prev/next)

## Data Models

### Section Interface

```typescript
// src/app/core/models/section.interface.ts
export interface Section {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  createdAt?: Timestamp;
}

export interface SectionWithLessons {
  section: Section;
  lessons: Lesson[];
  completedCount: number;
  totalCount: number;
}
```

### Note Interface

```typescript
// src/app/core/models/note.interface.ts
export interface Note {
  id: string;
  userId: string;
  courseId: string;
  lessonId?: string;         // null for course-wide notes
  content: string;
  videoTimestamp?: number;   // seconds
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Video Bookmark Interface

```typescript
// src/app/core/models/bookmark.interface.ts
export interface VideoBookmark {
  id: string;
  lessonId: string;
  courseId: string;
  timestamp: number;         // seconds
  title?: string;
  createdAt: Timestamp;
}
```

### Video Progress Interface

```typescript
// Added to src/app/core/models/progress.interface.ts
export interface VideoProgress {
  playbackPosition: number;
  playbackSpeed: number;
  lastUpdated: Timestamp;
}
```

## Firestore Structure

```
/courses/{courseId}/sections/{sectionId}   # Course sections
/users/{uid}/notes/{noteId}                 # User notes
/users/{uid}/bookmarks/{bookmarkId}         # Video bookmarks
/users/{uid}/courseProgress/{courseId}      # Modified - added videoProgress, flaggedLessons
```

## Components Created

### Lesson Page Components

| Component | Path | Purpose |
|-----------|------|---------|
| `lesson-sidebar` | `features/courses/lesson/components/` | Course outline with collapsible sections |
| `notes-panel` | `features/courses/lesson/components/` | Notes creation/viewing with tabs |
| `video-player` | `features/courses/lesson/components/` | Enhanced video with speed, PiP, shortcuts |
| `bookmarks-list` | `features/courses/lesson/components/` | Video timestamp bookmarks |

### Repositories

| Repository | Path | Purpose |
|------------|------|---------|
| `sections.repo.ts` | `core/repos/` | CRUD for course sections |
| `notes.repo.ts` | `core/repos/` | User notes management |
| `bookmarks.repo.ts` | `core/repos/` | Video bookmarks |

### Services

| Service | Path | Purpose |
|---------|------|---------|
| `notes.service.ts` | `core/services/` | Notes orchestration with caching |
| `video-player.service.ts` | `core/services/` | Video state, keyboard shortcuts |

## Modified Files

| File | Changes |
|------|---------|
| `lesson.component.ts` | New layout with sidebar, integrated new components |
| `lesson.component.html` | Shell layout with content-row + sidebar + bottom actions |
| `lesson.component.scss` | Responsive layout with sticky sidebar support |
| `learning.service.ts` | Added section-aware methods, video progress |
| `progress.repo.ts` | Added video progress persistence, flagged lessons |
| `progress.interface.ts` | Added VideoProgress interface, flaggedLessons field |

## Page Layout Structure

```
.lesson-shell (flex column)
├── .lesson-content-row (flex row)
│   ├── .lesson-main
│   │   ├── .lesson-page__topbar (sticky)
│   │   └── .lesson-page__content
│   │       ├── Title & Description
│   │       ├── Video Player / Text / Quiz
│   │       ├── Bookmarks List (video only)
│   │       └── Notes Panel
│   └── app-lesson-sidebar (sticky at 89px)
└── .lesson-page__actions (full-width bottom bar)
```

## Firestore Security Rules

Added rules for notes and bookmarks subcollections:

```javascript
// Notes subcollection
match /notes/{noteId} {
  allow read: if isOwner(userId);
  allow create: if isOwner(userId)
    && request.resource.data.keys().hasAll(['courseId', 'content', 'userId', 'createdAt', 'updatedAt']);
  allow update: if isOwner(userId) && request.resource.data.userId == userId;
  allow delete: if isOwner(userId);
}

// Bookmarks subcollection
match /bookmarks/{bookmarkId} {
  allow read: if isOwner(userId);
  allow create: if isOwner(userId)
    && request.resource.data.keys().hasAll(['lessonId', 'courseId', 'timestamp', 'createdAt']);
  allow update: if isOwner(userId);
  allow delete: if isOwner(userId);
}
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play/Pause |
| Arrow Left | Seek back 10s |
| Arrow Right | Seek forward 10s |
| Arrow Up | Volume up |
| Arrow Down | Volume down |
| M | Toggle mute |
| F | Toggle fullscreen |
| P | Toggle Picture-in-Picture |

## Playback Speeds

Available speeds: 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x

## Accessibility

- WCAG 2.1 AA compliant
- Full keyboard navigation
- ARIA labels and roles
- Focus indicators
- Screen reader friendly
- Reduced motion support
- RTL (Hebrew) layout

## Design Decisions

1. **Sidebar Sticky Positioning**: Uses `:host` selector with `position: sticky` at 89px to clear the header
2. **Notes Tabs**: Separate tabs for lesson-specific and course-wide notes
3. **Timestamp Links**: Clickable timestamps in notes seek to video position
4. **Mobile Sidebar**: Slide-in panel with backdrop, toggled via hamburger menu
5. **Bottom Actions**: Full-width bar below both content and sidebar for navigation

## Future Enhancements

- Resources/attachments per lesson
- Study timer tracking
- Transcript support for videos
- Admin interface for managing sections
