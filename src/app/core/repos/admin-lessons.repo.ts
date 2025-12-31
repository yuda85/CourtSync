import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from '@angular/fire/firestore';
import { Auth, authState } from '@angular/fire/auth';
import { Lesson } from '@core/models/lesson.interface';
import { RoleService } from '@core/services/role.service';
import { AdminCoursesRepo } from './admin-courses.repo';

/**
 * Lesson data for creating a new lesson
 */
export interface CreateLessonData {
  title: string;
  description?: string;
  type: 'video' | 'text' | 'quiz';
  sectionId?: string;
  durationMinutes?: number;
  videoUrl?: string;
  content?: string;
}

/**
 * Lesson data for updating an existing lesson
 */
export interface UpdateLessonData {
  title?: string;
  description?: string;
  type?: 'video' | 'text' | 'quiz';
  sectionId?: string;
  order?: number;
  durationMinutes?: number;
  videoUrl?: string;
  content?: string;
}

/**
 * Extended Lesson interface with timestamps for admin views
 */
export interface AdminLesson extends Lesson {
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Admin Lessons Repository
 * Provides CRUD operations for lesson management within courses
 * Respects role-based access through course ownership
 */
@Injectable({
  providedIn: 'root',
})
export class AdminLessonsRepo {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
  private readonly roleService = inject(RoleService);
  private readonly adminCoursesRepo = inject(AdminCoursesRepo);

  private readonly lessonsCollection = collection(this.firestore, 'lessons');

  /**
   * Get all lessons for a specific course
   */
  getLessonsForCourse$(courseId: string): Observable<AdminLesson[]> {
    const q = query(
      this.lessonsCollection,
      where('courseId', '==', courseId),
      orderBy('order', 'asc')
    );

    return collectionData(q, { idField: 'id' }).pipe(
      map((lessons) => lessons as AdminLesson[]),
      catchError((err) => {
        console.error('Error fetching lessons for course:', err);
        return of([]);
      })
    );
  }

  /**
   * Get lessons grouped by section
   */
  getLessonsBySection$(
    courseId: string
  ): Observable<Map<string, AdminLesson[]>> {
    return this.getLessonsForCourse$(courseId).pipe(
      map((lessons) => {
        const grouped = new Map<string, AdminLesson[]>();

        // Group lessons by sectionId
        lessons.forEach((lesson) => {
          const sectionKey = lesson.sectionId || 'no-section';
          if (!grouped.has(sectionKey)) {
            grouped.set(sectionKey, []);
          }
          grouped.get(sectionKey)!.push(lesson);
        });

        return grouped;
      })
    );
  }

  /**
   * Get a single lesson by ID
   */
  getLessonById$(lessonId: string): Observable<AdminLesson | null> {
    const lessonRef = doc(this.firestore, 'lessons', lessonId);

    return docData(lessonRef, { idField: 'id' }).pipe(
      map((lesson) => (lesson as AdminLesson) || null),
      catchError((err) => {
        console.error('Error fetching lesson:', err);
        return of(null);
      })
    );
  }

  /**
   * Check if current user can edit lessons in a course
   */
  async canEditLessonsInCourse(courseId: string): Promise<boolean> {
    const course = await new Promise<any>((resolve) => {
      this.adminCoursesRepo.getCourseById$(courseId).subscribe((c) => resolve(c));
    });

    if (!course) return false;
    return this.adminCoursesRepo.canEditCourse(course);
  }

  /**
   * Create a new lesson in a course
   */
  async createLesson(courseId: string, data: CreateLessonData): Promise<string> {
    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to create a lesson');
    }

    // Verify permission
    const canEdit = await this.canEditLessonsInCourse(courseId);
    if (!canEdit) {
      throw new Error('You do not have permission to add lessons to this course');
    }

    // Get the next order number
    const existingLessons = await new Promise<AdminLesson[]>((resolve) => {
      this.getLessonsForCourse$(courseId).subscribe((lessons) => resolve(lessons));
    });

    const maxOrder = existingLessons.reduce(
      (max, lesson) => Math.max(max, lesson.order || 0),
      0
    );

    const lessonData = {
      ...data,
      courseId,
      order: maxOrder + 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(this.lessonsCollection, lessonData);
    return docRef.id;
  }

  /**
   * Update an existing lesson
   */
  async updateLesson(lessonId: string, data: UpdateLessonData): Promise<void> {
    const lesson = await new Promise<AdminLesson | null>((resolve) => {
      this.getLessonById$(lessonId).subscribe((l) => resolve(l));
    });

    if (!lesson) {
      throw new Error('Lesson not found');
    }

    // Verify permission through course ownership
    const canEdit = await this.canEditLessonsInCourse(lesson.courseId);
    if (!canEdit) {
      throw new Error('You do not have permission to edit this lesson');
    }

    const lessonRef = doc(this.firestore, 'lessons', lessonId);
    await updateDoc(lessonRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Delete a lesson
   */
  async deleteLesson(lessonId: string): Promise<void> {
    const lesson = await new Promise<AdminLesson | null>((resolve) => {
      this.getLessonById$(lessonId).subscribe((l) => resolve(l));
    });

    if (!lesson) {
      throw new Error('Lesson not found');
    }

    // Verify permission through course ownership
    const canEdit = await this.canEditLessonsInCourse(lesson.courseId);
    if (!canEdit) {
      throw new Error('You do not have permission to delete this lesson');
    }

    const lessonRef = doc(this.firestore, 'lessons', lessonId);
    await deleteDoc(lessonRef);
  }

  /**
   * Reorder lessons within a course
   */
  async reorderLessons(courseId: string, lessonIds: string[]): Promise<void> {
    const canEdit = await this.canEditLessonsInCourse(courseId);
    if (!canEdit) {
      throw new Error('You do not have permission to reorder lessons');
    }

    // Update each lesson with new order
    for (let i = 0; i < lessonIds.length; i++) {
      const lessonRef = doc(this.firestore, 'lessons', lessonIds[i]);
      await updateDoc(lessonRef, {
        order: i + 1,
        updatedAt: serverTimestamp(),
      });
    }
  }

  /**
   * Move lesson to a different section
   */
  async moveLessonToSection(
    lessonId: string,
    sectionId: string | null
  ): Promise<void> {
    const lesson = await new Promise<AdminLesson | null>((resolve) => {
      this.getLessonById$(lessonId).subscribe((l) => resolve(l));
    });

    if (!lesson) {
      throw new Error('Lesson not found');
    }

    const canEdit = await this.canEditLessonsInCourse(lesson.courseId);
    if (!canEdit) {
      throw new Error('You do not have permission to move this lesson');
    }

    const lessonRef = doc(this.firestore, 'lessons', lessonId);
    await updateDoc(lessonRef, {
      sectionId: sectionId || null,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Duplicate a lesson
   */
  async duplicateLesson(lessonId: string): Promise<string> {
    const lesson = await new Promise<AdminLesson | null>((resolve) => {
      this.getLessonById$(lessonId).subscribe((l) => resolve(l));
    });

    if (!lesson) {
      throw new Error('Lesson not found');
    }

    const canEdit = await this.canEditLessonsInCourse(lesson.courseId);
    if (!canEdit) {
      throw new Error('You do not have permission to duplicate this lesson');
    }

    // Create a copy with "(עותק)" suffix
    const newLessonData: CreateLessonData = {
      title: `${lesson.title} (עותק)`,
      description: lesson.description,
      type: lesson.type,
      sectionId: lesson.sectionId,
      durationMinutes: lesson.durationMinutes,
      videoUrl: lesson.videoUrl,
      content: lesson.content,
    };

    return this.createLesson(lesson.courseId, newLessonData);
  }

  /**
   * Get lesson count for a course
   */
  getLessonCount$(courseId: string): Observable<number> {
    return this.getLessonsForCourse$(courseId).pipe(
      map((lessons) => lessons.length)
    );
  }

  /**
   * Get total duration for all lessons in a course
   */
  getTotalDuration$(courseId: string): Observable<number> {
    return this.getLessonsForCourse$(courseId).pipe(
      map((lessons) =>
        lessons.reduce((total, lesson) => total + (lesson.durationMinutes || 0), 0)
      )
    );
  }

  /**
   * Seed sample lessons for a course (temporary - remove after use)
   * Creates 10 lessons: 5 videos, 4 quizzes, 1 final exam
   */
  async seedSampleLessons(courseId: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('Must be logged in to seed lessons');
    }

    const canEdit = await this.canEditLessonsInCourse(courseId);
    if (!canEdit) {
      throw new Error('You do not have permission to add lessons to this course');
    }

    // Sample video URLs - using free test videos from various reliable sources
    const sampleVideoUrls = [
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    ];

    const sampleLessons = [
      // Video lessons (5)
      {
        title: 'מבוא לקורס',
        description: 'סקירה כללית של נושאי הקורס ומטרותיו',
        type: 'video' as const,
        order: 1,
        durationMinutes: 15,
        videoUrl: sampleVideoUrls[0],
      },
      {
        title: 'עקרונות יסוד',
        description: 'הכרת העקרונות הבסיסיים והמושגים המרכזיים',
        type: 'video' as const,
        order: 2,
        durationMinutes: 25,
        videoUrl: sampleVideoUrls[1],
      },
      {
        title: 'ניתוח מקרה ראשון',
        description: 'בחינת פסק דין מרכזי והשלכותיו',
        type: 'video' as const,
        order: 3,
        durationMinutes: 30,
        videoUrl: sampleVideoUrls[2],
      },
      {
        title: 'יישום מעשי',
        description: 'דוגמאות ליישום החומר בפרקטיקה',
        type: 'video' as const,
        order: 4,
        durationMinutes: 35,
        videoUrl: sampleVideoUrls[3],
      },
      {
        title: 'סוגיות מתקדמות',
        description: 'העמקה בנושאים מורכבים יותר',
        type: 'video' as const,
        order: 5,
        durationMinutes: 40,
        videoUrl: sampleVideoUrls[4],
      },
      // Quiz lessons (4)
      {
        title: 'בוחן 1 - מושגי יסוד',
        description: 'בדיקת הבנה של מושגי היסוד שנלמדו',
        type: 'quiz' as const,
        order: 6,
        durationMinutes: 15,
      },
      {
        title: 'בוחן 2 - ניתוח מקרים',
        description: 'יכולת ניתוח והבנת מקרים',
        type: 'quiz' as const,
        order: 7,
        durationMinutes: 20,
      },
      {
        title: 'בוחן 3 - יישום',
        description: 'יכולת יישום החומר על מצבים חדשים',
        type: 'quiz' as const,
        order: 8,
        durationMinutes: 20,
      },
      {
        title: 'בוחן 4 - סיכום ביניים',
        description: 'בחינה של כל החומר עד כה',
        type: 'quiz' as const,
        order: 9,
        durationMinutes: 25,
      },
      // Final exam (1)
      {
        title: 'מבחן מסכם',
        description: 'מבחן סופי מקיף על כל חומר הקורס',
        type: 'quiz' as const,
        order: 10,
        durationMinutes: 60,
      },
    ];

    for (const lesson of sampleLessons) {
      await addDoc(this.lessonsCollection, {
        ...lesson,
        courseId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }
}
