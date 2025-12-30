import { Timestamp } from '@angular/fire/firestore';

/**
 * Course progress document stored in /users/{uid}/courseProgress/{courseId}
 */
export interface CourseProgress {
  courseId: string;
  startedAt: Timestamp;
  lastAccessedAt: Timestamp;
  completedLessons: string[];
  currentLessonId?: string;
  progressPercent: number;
  completedAt?: Timestamp;
}
