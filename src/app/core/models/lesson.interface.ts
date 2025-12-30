import { Timestamp } from '@angular/fire/firestore';

/**
 * Lesson document stored in /lessons/{lessonId}
 */
export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  type: 'video' | 'text' | 'quiz';
  order: number;
  sectionId?: string;
  durationMinutes?: number;
  videoUrl?: string;
  content?: string;
}

/**
 * Lesson type icons mapping
 */
export const LESSON_TYPE_ICONS: Record<Lesson['type'], string> = {
  video: 'play-circle',
  text: 'file-text',
  quiz: 'help-circle'
};
