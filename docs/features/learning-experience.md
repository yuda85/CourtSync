# Learning Experience Feature Documentation

**Last Updated:** December 31, 2024
**Status:** ✅ Complete

---

## Overview

The Learning Experience is the core feature of CourtSync, providing law students with a premium, focused environment for consuming course content. It supports video lessons, text content, and quiz navigation with full progress tracking, notes, bookmarks, and a sticky course outline sidebar.

---

## Features

### Lesson Player

| Feature | Description |
|---------|-------------|
| Video Playback | HTML5 native player with YouTube embed support |
| Speed Controls | 0.5x, 0.75x, 1x, 1.25x, 1.5x, 1.75x, 2x playback speeds |
| Picture-in-Picture | Native browser PiP support |
| Fullscreen | Native fullscreen toggle |
| Keyboard Shortcuts | Space (play/pause), arrows (seek), M (mute), F (fullscreen) |
| Text Lessons | Clean typography with reading-optimized layout |
| Quiz Navigation | Links to practice mode for quiz-type lessons |

### Progress Tracking

| Feature | Description |
|---------|-------------|
| Auto-Save | Video position saved every 10 seconds |
| Resume Playback | Automatically resumes from last watched position |
| Lesson Completion | Manual "Mark Complete" + auto-complete on video end |
| Course Progress | Aggregated progress across all lessons |
| Flagged Lessons | Mark lessons for later review |

### Notes System

| Feature | Description |
|---------|-------------|
| Per-Lesson Notes | Markdown-style notes saved per lesson |
| Timestamps | Click to insert current video timestamp |
| Timestamp Links | Click timestamps to seek video |
| Auto-Save | Notes saved on blur/change |
| Expandable Panel | Collapsible notes section |

### Bookmarks

| Feature | Description |
|---------|-------------|
| Video Bookmarks | Save specific timestamps with labels |
| Quick Navigation | Click bookmark to seek to timestamp |
| Keyboard Shortcut | Press B during video to bookmark |
| Sorted Display | Bookmarks shown in chronological order |

### Course Sidebar

| Feature | Description |
|---------|-------------|
| Sticky Position | Stays visible while scrolling (desktop) |
| Section Grouping | Lessons organized by course sections |
| Progress Rings | Visual progress indicators per section |
| Current Lesson | Highlighted with pulsing indicator |
| Completed Lessons | Gradient checkmark badges |
| Flagged Indicator | Bookmark icon on flagged lessons |
| Mobile Slide-Out | Full-screen drawer on mobile |

---

## Architecture

### Component Structure

```
src/app/features/courses/lesson/
├── lesson.component.ts          # Main orchestrator
├── lesson.component.html        # Page template
├── lesson.component.scss        # Page styles + layout
└── components/
    ├── video-player/
    │   ├── video-player.component.ts
    │   ├── video-player.component.html
    │   └── video-player.component.scss
    ├── lesson-sidebar/
    │   ├── lesson-sidebar.component.ts
    │   ├── lesson-sidebar.component.html
    │   └── lesson-sidebar.component.scss
    ├── notes-panel/
    │   ├── notes-panel.component.ts
    │   ├── notes-panel.component.html
    │   └── notes-panel.component.scss
    └── bookmarks-list/
        ├── bookmarks-list.component.ts
        ├── bookmarks-list.component.html
        └── bookmarks-list.component.scss
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    LessonComponent                          │
│  - Loads lesson data from LessonsRepo                       │
│  - Loads/saves progress via ProgressRepo                    │
│  - Manages sidebar open/close state                         │
│  - Coordinates video time with notes/bookmarks              │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ VideoPlayer │    │  LessonSidebar   │    │   NotesPanel    │
│             │    │                  │    │                 │
│ - Playback  │    │ - Section list   │    │ - Note editing  │
│ - Controls  │    │ - Navigation     │    │ - Timestamps    │
│ - Time emit │    │ - Progress rings │    │ - Auto-save     │
└─────────────┘    └──────────────────┘    └─────────────────┘
```

### State Management

The lesson page uses Angular Signals for reactive state:

```typescript
// Core state
lesson = signal<Lesson | null>(null);
isLoading = signal(true);
sidebarOpen = signal(false);

// Progress state
completedLessons = signal<Set<string>>(new Set());
flaggedLessons = signal<Set<string>>(new Set());
videoProgress = signal<number>(0);
currentVideoTime = signal<number>(0);

// Computed
isCompleted = computed(() => /* ... */);
isFlagged = computed(() => /* ... */);
position = computed(() => /* current/total */);
```

---

## Styling

### Design System

The Learning Experience uses a "Refined Scholarly" aesthetic:

- **Glass-morphism**: Backdrop blur on controls and panels
- **Subtle Gradients**: Ambient background effects
- **Spring Animations**: Bouncy micro-interactions
- **Hebrew RTL**: Full right-to-left support

### Key SCSS Variables

```scss
// Timing
$transition-smooth: 240ms cubic-bezier(0.4, 0, 0.2, 1);
$transition-spring: 300ms cubic-bezier(0.34, 1.56, 0.64, 1);

// Layout
$sidebar-width: 320px;
$header-height: 80px;
$content-max-width: 880px;

// Glass effect
$glass-bg: rgba(12, 12, 14, 0.85);
$glass-border: rgba(255, 255, 255, 0.08);
```

### Sticky Sidebar Implementation

The sidebar uses CSS sticky positioning with careful constraints:

```scss
// Host element (Angular component)
:host {
  @media (min-width: 1024px) {
    display: block;
    position: sticky;
    top: 80px;  // Below fixed header
    max-height: calc(100vh - 80px);
    align-self: flex-start;
  }
}

// Parent flex container
.lesson-content-row {
  display: flex;
  flex-direction: row-reverse;  // Sidebar on right
  align-items: flex-start;      // Required for sticky
  overflow: visible;            // Required for sticky
}
```

### Full-Width Breakout

The lesson page breaks out of the shell's constrained width:

```scss
:host {
  width: 100vw;
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
}
```

---

## Routes

```typescript
// In app.routes.ts
{
  path: 'courses/:id/learn/:lessonId',
  loadComponent: () => import('@features/courses/lesson/lesson.component')
    .then(m => m.LessonComponent),
  canActivate: [entitlementGuard]
}
```

**URL Pattern:** `/app/courses/{courseId}/learn/{lessonId}`

---

## Data Models

### Lesson Interface

```typescript
interface Lesson {
  id: string;
  courseId: string;
  sectionId?: string;
  title: string;
  description?: string;
  type: 'video' | 'text' | 'quiz';
  order: number;
  durationMinutes?: number;
  videoUrl?: string;      // For video lessons
  content?: string;       // For text lessons
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Progress Interface

```typescript
interface CourseProgress {
  oderId: string;
  courseId: string;
  completedLessons: string[];      // Lesson IDs
  flaggedLessons: string[];        // Lesson IDs
  lastViewedLessonId?: string;
  videoProgress: {                 // Per-lesson video positions
    [lessonId: string]: number;    // Seconds
  };
  updatedAt: Timestamp;
}
```

### Note Interface

```typescript
interface LessonNote {
  oderId: string;
  lessonId: string;
  courseId: string;
  content: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Bookmark Interface

```typescript
interface VideoBookmark {
  id: string;
  oderId: string;
  lessonId: string;
  courseId: string;
  timestamp: number;      // Seconds
  label?: string;
  createdAt: Timestamp;
}
```

---

## Firestore Structure

```
users/{userId}/
├── progress/{courseId}           # Course progress document
├── notes/{lessonId}              # Lesson notes
└── bookmarks/{bookmarkId}        # Video bookmarks
```

### Security Rules

```javascript
// Progress - user can only access their own
match /users/{userId}/progress/{courseId} {
  allow read, write: if request.auth.uid == userId;
}

// Notes - user can only access their own
match /users/{userId}/notes/{lessonId} {
  allow read, write: if request.auth.uid == userId;
}

// Bookmarks - user can only access their own
match /users/{userId}/bookmarks/{bookmarkId} {
  allow read, write: if request.auth.uid == userId;
}
```

---

## Video Player Features

### Supported Formats

| Source | Support |
|--------|---------|
| MP4 (H.264) | ✅ Native HTML5 |
| WebM | ✅ Native HTML5 |
| YouTube | ✅ Embedded iframe |
| Vimeo | ❌ Not implemented |
| HLS/DASH | ❌ Not implemented |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play/Pause |
| `←` | Seek back 10s |
| `→` | Seek forward 10s |
| `↑` | Volume up |
| `↓` | Volume down |
| `M` | Toggle mute |
| `F` | Toggle fullscreen |
| `P` | Toggle PiP |
| `B` | Add bookmark |
| `0-9` | Seek to 0%-90% |

### Control Bar Elements

```
┌─────────────────────────────────────────────────────────────┐
│   advancement bar (click to seek)                            │
├─────────────────────────────────────────────────────────────┤
│  [▶] [⏮] [⏭]  0:00 / 10:00  [1x▼] [🔊] [PiP] [⛶]           │
└─────────────────────────────────────────────────────────────┘
```

---

## Mobile Experience

### Responsive Breakpoints

| Breakpoint | Behavior |
|------------|----------|
| < 640px | Mobile: Full-width content, slide-out sidebar |
| 640px - 1023px | Tablet: Wider content, slide-out sidebar |
| ≥ 1024px | Desktop: Side-by-side layout, sticky sidebar |

### Mobile Sidebar

- Triggered by hamburger menu button
- Full-screen slide-out drawer from right
- Backdrop overlay with blur effect
- Tap backdrop or X button to close

### Touch Optimizations

- Larger tap targets (44px minimum)
- Swipe gestures on video (future)
- Pull-to-refresh disabled during video playback

---

## Dark Mode

Full dark mode support using CSS custom properties:

```scss
:host-context([data-theme="dark"]) {
  .video-controls {
    background: rgba(8, 16, 32, 0.95);
  }

  .lesson-sidebar {
    background: var(--color-surface);
    border-color: var(--color-border);
  }
}
```

---

## Accessibility

| Feature | Implementation |
|---------|----------------|
| Keyboard Navigation | Full keyboard support for all controls |
| Screen Reader | ARIA labels on buttons and progress |
| Focus Management | Visible focus rings, logical tab order |
| Reduced Motion | Respects `prefers-reduced-motion` |
| Color Contrast | WCAG AA compliant in both themes |

---

## Performance Considerations

### Lazy Loading

- Lesson component is lazy-loaded via route
- Video player only renders for video lessons
- Sidebar sections use virtual scrolling for long lists (future)

### Progress Auto-Save

- Debounced saves (10 second interval)
- Only saves on meaningful time changes (> 5 seconds difference)
- Batched writes to Firestore

### Video Optimization

- Progressive loading for MP4 files
- Poster image support (future)
- Quality selection for YouTube embeds (future)

---

## Sample Video URLs

For development and demos, the following sample videos are used:

```typescript
const sampleVideoUrls = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
];
```

These are Google-hosted creative commons videos that work reliably for testing.

---

## Testing Checklist

### Video Playback
- [ ] Play/pause works
- [ ] Seeking works (click progress bar)
- [ ] Speed control changes playback rate
- [ ] Volume control works
- [ ] Mute/unmute works
- [ ] Fullscreen toggle works
- [ ] PiP toggle works (where supported)
- [ ] Keyboard shortcuts work

### Progress Tracking
- [ ] Progress saves automatically
- [ ] Resuming lesson starts from saved position
- [ ] Marking lesson complete works
- [ ] Completion persists across sessions
- [ ] Flagging lesson works

### Notes & Bookmarks
- [ ] Creating note works
- [ ] Timestamp insertion works
- [ ] Clicking timestamp seeks video
- [ ] Creating bookmark works
- [ ] Clicking bookmark seeks video
- [ ] Deleting bookmark works

### Sidebar
- [ ] Sections expand/collapse
- [ ] Current lesson highlighted
- [ ] Completed lessons show checkmark
- [ ] Clicking lesson navigates
- [ ] Progress rings update
- [ ] Sticky on desktop scroll
- [ ] Slide-out on mobile

### Responsive
- [ ] Mobile layout works
- [ ] Tablet layout works
- [ ] Desktop layout works
- [ ] RTL direction correct

### Dark Mode
- [ ] All components support dark mode
- [ ] No contrast issues
- [ ] Smooth theme transitions

---

## Known Limitations

1. **No offline support** - Requires internet connection
2. **No download** - Videos cannot be downloaded for offline viewing
3. **YouTube only** - No Vimeo or other embed support yet
4. **No captions** - Subtitle/caption support not implemented
5. **No playback analytics** - Detailed watch analytics not tracked

---

## Future Enhancements

1. **Video Chapters** - Chapter markers with titles
2. **Transcript** - Searchable video transcript
3. **Playback Analytics** - Watch time, completion rates
4. **Offline Mode** - Download lessons for offline viewing
5. **Caption Support** - SRT/VTT subtitle files
6. **Video Quality** - Manual quality selection
7. **Virtual Scrolling** - For courses with 100+ lessons
