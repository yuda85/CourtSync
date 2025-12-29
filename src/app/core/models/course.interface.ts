import { Timestamp } from '@angular/fire/firestore';

/**
 * Course - Public course metadata stored in /courses/{courseId}
 */
export interface Course {
  id: string;
  title: string;
  subject: string;
  level: string;
  durationMinutes: number;
  priceIls: number;
  shortDescription: string;
  longDescription: string;
  coverImageUrl?: string;
  updatedAt: Timestamp;
  isPublished: boolean;
  isFeatured?: boolean;
  featuredOrder?: number;
}

/**
 * Course outline item - stored in /courses/{courseId}/outline/{itemId}
 */
export interface CourseOutlineItem {
  id: string;
  type: 'section' | 'lesson';
  title: string;
  order: number;
  lessonId?: string;
}

/**
 * Course filters for catalog queries
 */
export interface CourseFilters {
  subject?: string;
  searchTerm?: string;
  level?: string;
}

/**
 * Available course subjects - Law (Hebrew)
 */
export const COURSE_SUBJECTS = [
  'דיני חוזים',
  'דיני עונשין',
  'דיני נזיקין',
  'משפט חוקתי',
  'דיני קניין',
  'דיני משפחה'
] as const;

/**
 * Available course levels (Hebrew)
 */
export const COURSE_LEVELS = [
  'בסיסי',
  'בינוני',
  'מתקדם'
] as const;

export type CourseSubject = typeof COURSE_SUBJECTS[number];
export type CourseLevel = typeof COURSE_LEVELS[number];
