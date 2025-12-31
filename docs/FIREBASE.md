# Firebase Documentation - CourtSync

Complete documentation of Firebase implementation in the CourtSync learning platform.

---

## 1. Overview

| Property | Value |
|----------|-------|
| **Project ID** | `courtsync-cfb6b` |
| **Auth Domain** | `courtsync-cfb6b.firebaseapp.com` |
| **Storage Bucket** | `courtsync-cfb6b.firebasestorage.app` |
| **Configuration** | [src/environments/environment.ts](../src/environments/environment.ts) |

### Services Used

| Service | Status | Notes |
|---------|--------|-------|
| **Firestore** | Active | Primary database |
| **Authentication** | Active | Google OAuth only |
| **Storage** | Configured | Not yet implemented |
| **Cloud Functions** | Not Used | Payment processing is demo mode |

---

## 2. Database Structure

### Collection Tree

```
firestore/
├── courses/                          # Course catalog
│   └── {courseId}/
│       ├── outline/                  # Course structure
│       │   └── {itemId}
│       └── sections/                 # Course sections/modules
│           └── {sectionId}
│
├── lessons/                          # Lesson content
│   └── {lessonId}
│
├── questions/                        # Practice questions
│   └── {questionId}
│
├── users/                            # User profiles
│   └── {uid}/
│       ├── entitlements/             # Course purchases
│       │   └── {entId}
│       ├── courseProgress/           # Learning progress
│       │   └── {courseId}
│       ├── notes/                    # User notes
│       │   └── {noteId}
│       ├── bookmarks/                # Video bookmarks
│       │   └── {bookmarkId}
│       └── questionAttempts/         # Quiz history
│           └── {attemptId}
│
├── invites/                          # Admin invite tokens
│   └── {inviteId}
│
└── courseEnrollments/                # Reverse enrollment index
    └── {courseId}/
        └── users/
            └── {userId}
```

---

## 3. Collection Schemas

### 3.1 courses

**Path:** `/courses/{courseId}`
**Model:** [course.interface.ts](../src/app/core/models/course.interface.ts)

```typescript
interface Course {
  id: string;
  title: string;                    // Course title (Hebrew)
  subject: string;                  // Law subject (e.g., "דיני חוזים")
  level: string;                    // "בסיסי" | "בינוני" | "מתקדם"
  durationMinutes: number;          // Total duration
  priceIls: number;                 // Price in Israeli Shekels
  shortDescription: string;         // Brief description
  longDescription: string;          // Full description
  coverImageUrl?: string;           // Cover image URL
  updatedAt: Timestamp;             // Last update time
  isPublished: boolean;             // Visibility flag
  isFeatured?: boolean;             // Show on landing page
  featuredOrder?: number;           // Order in featured list
  creatorUid?: string;              // Admin who created (for ownership)
  creatorName?: string;             // Creator display name
  createdAt?: Timestamp;            // Creation time
}
```

**Subcollection: outline**
Path: `/courses/{courseId}/outline/{itemId}`

```typescript
interface CourseOutlineItem {
  id: string;
  type: 'section' | 'lesson';       // Item type
  title: string;                    // Display title
  order: number;                    // Sort order
  lessonId?: string;                // Reference to lesson (if type='lesson')
}
```

**Subcollection: sections**
Path: `/courses/{courseId}/sections/{sectionId}`

```typescript
interface Section {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  createdAt?: Timestamp;
}
```

---

### 3.2 lessons

**Path:** `/lessons/{lessonId}`
**Model:** [lesson.interface.ts](../src/app/core/models/lesson.interface.ts)

```typescript
interface Lesson {
  id: string;
  courseId: string;                 // Parent course reference
  title: string;
  description?: string;
  type: 'video' | 'text' | 'quiz';  // Lesson type
  order: number;                    // Sort order within course
  sectionId?: string;               // Optional section grouping
  durationMinutes?: number;         // Duration (video lessons)
  videoUrl?: string;                // External video URL
  content?: string;                 // Text content (text lessons)
}
```

---

### 3.3 questions

**Path:** `/questions/{questionId}`
**Model:** [question.interface.ts](../src/app/core/models/question.interface.ts)

```typescript
interface Question {
  id: string;
  courseId: string;                 // Parent course
  subject: string;                  // Law subject
  topic: string;                    // Specific topic
  difficulty: 'קל' | 'בינוני' | 'קשה';
  questionText: string;             // Question content
  options: AnswerOption[];          // Answer choices
  correctOptionId: string;          // Correct answer ID
  explanation: string;              // Answer explanation
  relatedLessonId?: string;         // Link to related lesson
  isPublished: boolean;             // Visibility flag
  updatedAt: Timestamp;
}

interface AnswerOption {
  id: string;
  text: string;
}
```

---

### 3.4 users

**Path:** `/users/{uid}`
**Model:** [user-profile.interface.ts](../src/app/core/models/user-profile.interface.ts)

```typescript
interface UserProfile {
  uid: string;                      // Firebase Auth UID (document ID)
  displayName: string;
  email: string;
  photoURL: string;
  roles: UserRole[];                // ['student'] | ['student', 'admin'] | ['superadmin']
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  lastPurchaseAt?: Timestamp;       // Last course purchase
  createdBy?: string;               // UID of inviting superadmin
  invitedAt?: Timestamp;            // When invite was accepted
}

type UserRole = 'student' | 'admin' | 'superadmin';
```

**Subcollection: entitlements**
Path: `/users/{uid}/entitlements/{entId}`

```typescript
interface Entitlement {
  id: string;
  type: 'course' | 'path' | 'bundle';
  refId: string;                    // courseId, pathId, or bundleId
  purchasedAt: Timestamp;
  source: 'demo' | 'payment';
  pricePaidIls?: number;
}
```

**Subcollection: courseProgress**
Path: `/users/{uid}/courseProgress/{courseId}`

```typescript
interface CourseProgress {
  courseId: string;
  startedAt: Timestamp;
  lastAccessedAt: Timestamp;
  completedLessons: string[];       // Array of lesson IDs
  currentLessonId?: string;         // Last viewed lesson
  progressPercent: number;          // 0-100
  completedAt?: Timestamp;          // When course was completed
  videoProgress?: Record<string, VideoProgress>;  // Per-lesson video state
  flaggedLessons?: string[];        // Lessons marked for review
}

interface VideoProgress {
  playbackPosition: number;         // Seconds into video
  playbackSpeed: number;            // 0.5 - 2.0
  lastUpdated: Timestamp;
}
```

**Subcollection: notes**
Path: `/users/{uid}/notes/{noteId}`

```typescript
interface Note {
  id: string;
  userId: string;
  courseId: string;
  lessonId?: string;                // Optional - null for course-wide notes
  content: string;                  // Plain text or markdown
  videoTimestamp?: number;          // Seconds into video
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Subcollection: bookmarks**
Path: `/users/{uid}/bookmarks/{bookmarkId}`

```typescript
interface VideoBookmark {
  id: string;
  userId: string;
  lessonId: string;
  courseId: string;
  timestamp: number;                // Seconds into video
  title?: string;                   // Optional label
  createdAt: Timestamp;
}
```

**Subcollection: questionAttempts**
Path: `/users/{uid}/questionAttempts/{attemptId}`

```typescript
interface QuestionAttempt {
  id: string;
  questionId: string;
  courseId: string;
  selectedOptionId: string;
  isCorrect: boolean;
  attemptedAt: Timestamp;
}
```

---

### 3.5 invites

**Path:** `/invites/{inviteId}`
**Model:** [invite.interface.ts](../src/app/core/models/invite.interface.ts)

```typescript
interface AdminInvite {
  id: string;                       // Serves as shareable token
  role: 'admin' | 'superadmin';     // Role to assign
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  createdAt: Timestamp;
  createdBy: string;                // UID of creator
  createdByName: string;            // Display name for audit
  expiresAt: Timestamp;
  acceptedAt?: Timestamp;
  acceptedBy?: string;              // UID of accepting user
  acceptedByEmail?: string;
  revokedAt?: Timestamp;
  revokedBy?: string;
}
```

---

### 3.6 courseEnrollments

**Path:** `/courseEnrollments/{courseId}/users/{userId}`
**Model:** [course-enrollment.interface.ts](../src/app/core/models/course-enrollment.interface.ts)

Purpose: Reverse index enabling admins to query enrolled students efficiently.

```typescript
interface CourseEnrollment {
  courseId: string;                 // Parent collection ID
  userId: string;                   // Document ID
  userEmail: string;
  userDisplayName: string;
  enrolledAt: Timestamp;
  source: 'demo' | 'payment';
  progressPercent?: number;         // Optional progress snapshot
}
```

---

## 4. Security Rules

**Rules file:** [firebase/firestore.rules](../firebase/firestore.rules)

### Helper Functions

| Function | Purpose |
|----------|---------|
| `isAuthenticated()` | User has valid Firebase Auth session |
| `isOwner(userId)` | Request user matches the document's user |
| `getUserData()` | Fetches user profile for role checks |
| `hasRole(role)` | Checks if user has specific role in profile |
| `isAdmin()` | User has 'admin' or 'superadmin' role |
| `isSuperAdmin()` | User has 'superadmin' role |
| `isCourseCreator(courseId)` | User created the specified course |
| `canManageCourse(courseId)` | User is superadmin OR admin creator |

### Access Control Matrix

| Collection | Read | Create | Update | Delete |
|------------|------|--------|--------|--------|
| **courses** | Published: Anyone<br>Unpublished: Creator/Superadmin | Admin (self as creator) | Course manager | Draft only, by manager |
| **courses/outline** | Anyone | Course manager | Course manager | Course manager |
| **lessons** | Authenticated | Admin | Course manager | Course manager |
| **questions** | Published: Authenticated<br>Unpublished: Course manager | Admin | Course manager | Course manager |
| **users** | Self/Admin/Superadmin | Self | Self (no roles) or Superadmin | - |
| **users/entitlements** | Self | Self | Never | Never |
| **users/courseProgress** | Self | Self | Self | Never |
| **users/questionAttempts** | Self | Self | Never | Never |
| **users/notes** | Self | Self | Self | Self |
| **users/bookmarks** | Self | Self | Self | Self |
| **invites** | Anyone (for validation) | Superadmin | Superadmin or accepting user | Never |
| **courseEnrollments** | Superadmin or course creator | Authenticated | Self/Admin/Superadmin | Never |

### Key Security Features

1. **Role Protection**: Users cannot modify their own roles (prevents privilege escalation)
2. **Course Ownership**: Admins can only manage courses they created
3. **Immutable Audit Trail**: Entitlements, enrollments, attempts, and invites cannot be deleted
4. **Draft Protection**: Published courses cannot be deleted (only drafts)
5. **Invite Validation**: Anyone can read invites (for link validation) but only superadmins create them

---

## 5. Repository Usage Mapping

### Public Repositories

| Repository | Collection(s) | Operations | Used By |
|------------|--------------|------------|---------|
| `CoursesRepo` | courses, courses/outline | Read | Landing, Catalog, Course Detail |
| `LessonsRepo` | lessons | Read | Lesson Player |
| `QuestionsRepo` | questions | Read | Practice Session |

### User Data Repositories

| Repository | Collection(s) | Operations | Used By |
|------------|--------------|------------|---------|
| `EntitlementsRepo` | users/entitlements, courseEnrollments | Read, Create | Purchase Flow, Access Control |
| `ProgressRepo` | users/courseProgress | Read, Create, Update | Lesson Player, Dashboard |
| `NotesRepo` | users/notes | Full CRUD | Lesson Sidebar |
| `BookmarksRepo` | users/bookmarks | Read, Create, Delete | Video Player |
| `QuestionAttemptsRepo` | users/questionAttempts | Read, Create | Practice Session |

### Admin Repositories

| Repository | Collection(s) | Operations | Used By |
|------------|--------------|------------|---------|
| `AdminCoursesRepo` | courses, courses/outline | Full CRUD | Admin Course Editor |
| `AdminLessonsRepo` | lessons | Full CRUD + Reorder | Admin Lesson Editor |
| `AdminQuestionsRepo` | questions | Full CRUD | Admin Question Editor |
| `SectionsRepo` | courses/sections | Full CRUD | Admin Course Editor |
| `UsersRepo` | users | Read, Update roles | Superadmin Users Panel |
| `InvitesRepo` | invites, users | Full CRUD | Superadmin Invites Panel |
| `CourseEnrollmentsRepo` | courseEnrollments | Read, Create, Update | Admin Dashboard |

---

## 6. Authentication Flow

```
┌─────────────────┐
│   User clicks   │
│ "Sign in with   │
│    Google"      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Firebase Auth  │
│   Google OAuth  │
│     Popup       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ AuthService     │
│ signInWithGoogle│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│UserProfileService│
│createOrUpdate   │
│    Profile      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Check for pending invite           │
│  (InvitesRepo.validateInvite)       │
│                                     │
│  If valid invite found:             │
│  - Add role to user profile         │
│  - Mark invite as accepted          │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────┐
│   Navigate to   │
│    Dashboard    │
└─────────────────┘
```

**Key files:**
- [auth.service.ts](../src/app/core/services/auth.service.ts) - Google OAuth handling
- [user-profile.service.ts](../src/app/core/services/user-profile.service.ts) - Profile management

---

## 7. Data Patterns

### Real-time Subscriptions

All repositories use RxJS Observables with `collectionData()` and `docData()` for real-time updates:

```typescript
// Example: Real-time course progress
getCourseProgress$(courseId: string): Observable<CourseProgress | null> {
  return this.authState$.pipe(
    switchMap(user => {
      if (!user) return of(null);
      return docData(this.getProgressRef(user.uid, courseId));
    })
  );
}
```

### Server Timestamps

All timestamps use `serverTimestamp()` to ensure consistency:

```typescript
await setDoc(progressRef, {
  lastAccessedAt: serverTimestamp(),
  completedLessons,
  progressPercent
}, { merge: true });
```

### Merge Operations

Updates use `{ merge: true }` for partial updates without overwriting:

```typescript
await setDoc(ref, { field: value }, { merge: true });
```

### Error Fallbacks

Repositories include fallback to sample data for development:

```typescript
return collectionData(q).pipe(
  catchError((err) => {
    console.error('Error:', err);
    return of(SAMPLE_DATA);  // Fallback
  })
);
```

### Caching

EntitlementsRepo uses Angular signals for local caching:

```typescript
private readonly entitlementsCache = signal<Entitlement[]>([]);

updateCache(entitlements: Entitlement[]) {
  this.entitlementsCache.set(entitlements);
}
```

---

## 8. Role Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                       SUPERADMIN                             │
│  - Full access to all collections                           │
│  - Can manage user roles                                    │
│  - Can create/revoke admin invites                          │
│  - Can view all courses and users                           │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                         ADMIN                                │
│  - Can create courses (becomes creator)                     │
│  - Can manage only their own courses                        │
│  - Can view enrolled students for their courses             │
│  - Cannot modify other admins' content                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                        STUDENT                               │
│  - Default role for all users                               │
│  - Can view published courses                               │
│  - Can purchase and access courses                          │
│  - Can track progress, add notes, bookmarks                 │
│  - Can practice questions                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Feature-to-Collection Mapping

| Feature | Collections Used |
|---------|-----------------|
| **Landing Page** | courses (featured) |
| **Course Catalog** | courses |
| **Course Detail** | courses, courses/outline |
| **Course Purchase** | users/entitlements, courseEnrollments, users |
| **Lesson Player** | lessons, users/courseProgress |
| **Video Player** | users/courseProgress (videoProgress) |
| **Notes Panel** | users/notes |
| **Bookmarks Panel** | users/bookmarks |
| **Practice Session** | questions, users/questionAttempts |
| **User Dashboard** | users/entitlements, users/courseProgress |
| **Admin - Courses** | courses, courses/outline, courses/sections |
| **Admin - Lessons** | lessons |
| **Admin - Questions** | questions |
| **Admin - Students** | courseEnrollments, users |
| **Superadmin - Users** | users |
| **Superadmin - Invites** | invites, users |

---

## 10. Indexes

No custom composite indexes are currently defined. Queries use single-field indexes which are automatically created by Firestore.

Potential optimization: Create composite index for `questions` collection if querying by multiple fields (courseId + isPublished + difficulty).

---

## 11. Best Practices Implemented

1. **Subcollections for User Data**: Personal data stored under `/users/{uid}/` for natural security boundaries
2. **Reverse Index Pattern**: `courseEnrollments` enables efficient admin queries without scanning all users
3. **Immutable Records**: Entitlements and attempts cannot be modified after creation (audit trail)
4. **Server Timestamps**: All timestamps generated server-side for consistency
5. **Merge Updates**: Partial updates preserve existing data
6. **Fallback Data**: Sample data provides graceful degradation during development
7. **Real-time Subscriptions**: UI updates automatically when data changes
