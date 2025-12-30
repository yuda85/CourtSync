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
  /** Per-lesson video playback state */
  videoProgress?: Record<string, VideoProgress>;
  /** Lessons marked for review */
  flaggedLessons?: string[];
}

/**
 * Video playback state for auto-resume functionality
 */
export interface VideoProgress {
  /** Playback position in seconds */
  playbackPosition: number;
  /** Playback speed (0.5 - 2.0) */
  playbackSpeed: number;
  /** Last time this was updated */
  lastUpdated: Timestamp;
}
