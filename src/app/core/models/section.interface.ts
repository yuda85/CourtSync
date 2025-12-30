import { Timestamp } from '@angular/fire/firestore';

/**
 * Course section/module stored in /courses/{courseId}/sections/{sectionId}
 * Sections organize lessons into logical groups (e.g., "Module 1: Basics")
 */
export interface Section {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  createdAt?: Timestamp;
}

/**
 * Section with its lessons populated
 */
export interface SectionWithLessons {
  section: Section;
  lessons: import('./lesson.interface').Lesson[];
  completedCount: number;
  totalCount: number;
}
