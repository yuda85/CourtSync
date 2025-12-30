import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, of } from 'rxjs';
import { map, shareReplay, switchMap, take } from 'rxjs/operators';
import { LessonsRepo } from '@core/repos/lessons.repo';
import { ProgressRepo } from '@core/repos/progress.repo';
import { SectionsRepo } from '@core/repos/sections.repo';
import { Lesson } from '@core/models/lesson.interface';
import { CourseProgress, VideoProgress } from '@core/models/progress.interface';
import { Section, SectionWithLessons } from '@core/models/section.interface';

/**
 * Learning Service
 * Orchestrates lessons, sections, and progress with caching
 */
@Injectable({
  providedIn: 'root'
})
export class LearningService {
  private readonly lessonsRepo = inject(LessonsRepo);
  private readonly progressRepo = inject(ProgressRepo);
  private readonly sectionsRepo = inject(SectionsRepo);

  /** Cache for course lessons */
  private lessonsCache = new Map<string, Observable<Lesson[]>>();

  /** Cache for course sections */
  private sectionsCache = new Map<string, Observable<Section[]>>();

  /**
   * Get lessons for a course with caching
   */
  getCourseLessons$(courseId: string): Observable<Lesson[]> {
    if (!this.lessonsCache.has(courseId)) {
      this.lessonsCache.set(
        courseId,
        this.lessonsRepo.getLessonsForCourse$(courseId).pipe(
          shareReplay({ bufferSize: 1, refCount: true })
        )
      );
    }
    return this.lessonsCache.get(courseId)!;
  }

  /**
   * Get a single lesson
   */
  getLesson$(lessonId: string): Observable<Lesson | null> {
    return this.lessonsRepo.getLesson$(lessonId);
  }

  /**
   * Get user's progress for a course
   */
  getCourseProgress$(courseId: string): Observable<CourseProgress | null> {
    return this.progressRepo.getCourseProgress$(courseId);
  }

  /**
   * Get all user progress
   */
  getAllProgress$(): Observable<CourseProgress[]> {
    return this.progressRepo.getAllProgress$();
  }

  /**
   * Mark a lesson as complete
   */
  async markComplete(courseId: string, lessonId: string): Promise<void> {
    const lessons = await this.getCourseLessons$(courseId)
      .pipe(take(1))
      .toPromise();
    const totalLessons = lessons?.length || 1;
    await this.progressRepo.markLessonComplete(courseId, lessonId, totalLessons);
  }

  /**
   * Update current lesson being viewed
   */
  async updateCurrentLesson(courseId: string, lessonId: string): Promise<void> {
    await this.progressRepo.updateCurrentLesson(courseId, lessonId);
  }

  /**
   * Start tracking a course
   */
  async startCourse(courseId: string): Promise<void> {
    await this.progressRepo.startCourse(courseId);
  }

  /**
   * Get the next lesson in the course
   */
  getNextLesson$(courseId: string, currentLessonId: string): Observable<Lesson | null> {
    return this.getCourseLessons$(courseId).pipe(
      map(lessons => {
        const currentIndex = lessons.findIndex(l => l.id === currentLessonId);
        if (currentIndex === -1 || currentIndex >= lessons.length - 1) {
          return null;
        }
        return lessons[currentIndex + 1];
      })
    );
  }

  /**
   * Get the previous lesson in the course
   */
  getPreviousLesson$(courseId: string, currentLessonId: string): Observable<Lesson | null> {
    return this.getCourseLessons$(courseId).pipe(
      map(lessons => {
        const currentIndex = lessons.findIndex(l => l.id === currentLessonId);
        if (currentIndex <= 0) {
          return null;
        }
        return lessons[currentIndex - 1];
      })
    );
  }

  /**
   * Get lesson position in course (e.g., "3/10")
   */
  getLessonPosition$(courseId: string, lessonId: string): Observable<{ current: number; total: number }> {
    return this.getCourseLessons$(courseId).pipe(
      map(lessons => {
        const index = lessons.findIndex(l => l.id === lessonId);
        return {
          current: index + 1,
          total: lessons.length
        };
      })
    );
  }

  /**
   * Get the first incomplete lesson or first lesson if none started
   */
  getResumeLesson$(courseId: string): Observable<Lesson | null> {
    return combineLatest([
      this.getCourseLessons$(courseId),
      this.getCourseProgress$(courseId)
    ]).pipe(
      map(([lessons, progress]) => {
        if (!lessons.length) return null;

        // If there's a current lesson, return it
        if (progress?.currentLessonId) {
          const current = lessons.find(l => l.id === progress.currentLessonId);
          if (current) return current;
        }

        // Otherwise find first incomplete lesson
        const completedSet = new Set(progress?.completedLessons || []);
        const incomplete = lessons.find(l => !completedSet.has(l.id));

        return incomplete || lessons[0];
      })
    );
  }

  /**
   * Check if a lesson is completed
   */
  isLessonCompleted$(courseId: string, lessonId: string): Observable<boolean> {
    return this.progressRepo.isLessonCompleted$(courseId, lessonId);
  }

  /**
   * Clear lessons cache for a course
   */
  invalidateLessonsCache(courseId?: string): void {
    if (courseId) {
      this.lessonsCache.delete(courseId);
    } else {
      this.lessonsCache.clear();
    }
  }

  // ===========================================
  // Section-aware methods
  // ===========================================

  /**
   * Get sections for a course with caching
   */
  getCourseSections$(courseId: string): Observable<Section[]> {
    if (!this.sectionsCache.has(courseId)) {
      this.sectionsCache.set(
        courseId,
        this.sectionsRepo.getSectionsForCourse$(courseId).pipe(
          shareReplay({ bufferSize: 1, refCount: true })
        )
      );
    }
    return this.sectionsCache.get(courseId)!;
  }

  /**
   * Get sections with their lessons populated
   * Groups lessons by section and includes progress counts
   */
  getSectionsWithLessons$(courseId: string): Observable<SectionWithLessons[]> {
    return combineLatest([
      this.getCourseSections$(courseId),
      this.getCourseLessons$(courseId),
      this.getCourseProgress$(courseId)
    ]).pipe(
      map(([sections, lessons, progress]) => {
        const completedSet = new Set(progress?.completedLessons || []);

        // If no sections defined, create a default section
        if (sections.length === 0) {
          return [{
            section: {
              id: 'default',
              courseId,
              title: 'שיעורים',
              order: 1
            },
            lessons,
            completedCount: lessons.filter(l => completedSet.has(l.id)).length,
            totalCount: lessons.length
          }];
        }

        // Group lessons by section
        const sectionMap = new Map<string, Lesson[]>();
        const unassigned: Lesson[] = [];

        lessons.forEach(lesson => {
          if (lesson.sectionId) {
            const existing = sectionMap.get(lesson.sectionId) || [];
            existing.push(lesson);
            sectionMap.set(lesson.sectionId, existing);
          } else {
            unassigned.push(lesson);
          }
        });

        // Build sections with lessons
        const result: SectionWithLessons[] = sections.map(section => {
          const sectionLessons = sectionMap.get(section.id) || [];
          return {
            section,
            lessons: sectionLessons.sort((a, b) => a.order - b.order),
            completedCount: sectionLessons.filter(l => completedSet.has(l.id)).length,
            totalCount: sectionLessons.length
          };
        });

        // Add unassigned lessons to a default section if any
        if (unassigned.length > 0) {
          result.push({
            section: {
              id: 'unassigned',
              courseId,
              title: 'שיעורים נוספים',
              order: 999
            },
            lessons: unassigned.sort((a, b) => a.order - b.order),
            completedCount: unassigned.filter(l => completedSet.has(l.id)).length,
            totalCount: unassigned.length
          });
        }

        return result;
      })
    );
  }

  // ===========================================
  // Video progress methods
  // ===========================================

  /**
   * Get video progress for a specific lesson
   */
  getVideoProgress$(courseId: string, lessonId: string): Observable<VideoProgress | null> {
    return this.progressRepo.getVideoProgress$(courseId, lessonId);
  }

  /**
   * Save video playback progress
   */
  async saveVideoProgress(
    courseId: string,
    lessonId: string,
    progress: Omit<VideoProgress, 'lastUpdated'>
  ): Promise<void> {
    await this.progressRepo.saveVideoProgress(courseId, lessonId, progress);
  }

  // ===========================================
  // Flagged lessons methods
  // ===========================================

  /**
   * Toggle lesson flag (mark for review)
   */
  async toggleLessonFlag(courseId: string, lessonId: string): Promise<void> {
    await this.progressRepo.toggleLessonFlag(courseId, lessonId);
  }

  /**
   * Check if a lesson is flagged
   */
  isLessonFlagged$(courseId: string, lessonId: string): Observable<boolean> {
    return this.progressRepo.isLessonFlagged$(courseId, lessonId);
  }

  /**
   * Get all flagged lessons for a course
   */
  getFlaggedLessons$(courseId: string): Observable<string[]> {
    return this.getCourseProgress$(courseId).pipe(
      map(progress => progress?.flaggedLessons || [])
    );
  }

  /**
   * Clear sections cache
   */
  invalidateSectionsCache(courseId?: string): void {
    if (courseId) {
      this.sectionsCache.delete(courseId);
    } else {
      this.sectionsCache.clear();
    }
  }
}
