import { Timestamp } from '@angular/fire/firestore';

/**
 * Video timestamp bookmark stored in /users/{uid}/bookmarks/{bookmarkId}
 * Allows users to save specific moments in video lessons
 */
export interface VideoBookmark {
  id: string;
  userId: string;
  lessonId: string;
  courseId: string;
  timestamp: number;           // Seconds into video
  title?: string;              // Optional label for the bookmark
  createdAt: Timestamp;
}

/**
 * Bookmark creation payload (without auto-generated fields)
 */
export type CreateBookmarkPayload = Omit<VideoBookmark, 'id' | 'userId' | 'createdAt'>;
