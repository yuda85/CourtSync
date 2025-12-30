import { Timestamp } from '@angular/fire/firestore';

/**
 * User note stored in /users/{uid}/notes/{noteId}
 * Notes can be attached to specific lessons or be course-wide
 */
export interface Note {
  id: string;
  userId: string;
  courseId: string;
  lessonId?: string;           // Optional - null/undefined for course-wide notes
  content: string;             // Plain text or simple markdown
  videoTimestamp?: number;     // Seconds into video (for video lessons)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Note creation payload (without auto-generated fields)
 */
export type CreateNotePayload = Omit<Note, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

/**
 * Note update payload
 */
export interface UpdateNotePayload {
  content: string;
  videoTimestamp?: number;
}
