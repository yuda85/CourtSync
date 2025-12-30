import { Injectable, inject } from '@angular/core';
import { Observable, of, combineLatest } from 'rxjs';
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
  Timestamp,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Auth, authState } from '@angular/fire/auth';
import { Course, CourseOutlineItem } from '@core/models/course.interface';
import { RoleService } from '@core/services/role.service';

/**
 * Course data for creating a new course
 */
export interface CreateCourseData {
  title: string;
  subject: string;
  level: string;
  shortDescription: string;
  longDescription: string;
  priceIls: number;
  coverImageUrl?: string;
  durationMinutes?: number;
}

/**
 * Course data for updating an existing course
 */
export interface UpdateCourseData {
  title?: string;
  subject?: string;
  level?: string;
  shortDescription?: string;
  longDescription?: string;
  priceIls?: number;
  coverImageUrl?: string;
  durationMinutes?: number;
  isPublished?: boolean;
  isFeatured?: boolean;
  featuredOrder?: number;
}

/**
 * Extended Course interface with creator info for admin views
 */
export interface AdminCourse extends Course {
  creatorUid: string;
  creatorName: string;
  createdAt: Timestamp;
}

/**
 * Admin Courses Repository
 * Provides CRUD operations for course management
 * Respects role-based access:
 * - Admins: Can only manage their own courses
 * - Superadmins: Can manage all courses
 */
@Injectable({
  providedIn: 'root',
})
export class AdminCoursesRepo {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
  private readonly roleService = inject(RoleService);

  private readonly coursesCollection = collection(this.firestore, 'courses');

  /**
   * Get courses created by the current admin
   * Returns empty array if user is not authenticated
   */
  getMyCourses$(): Observable<AdminCourse[]> {
    return authState(this.auth).pipe(
      switchMap((user) => {
        if (!user) return of([]);

        const q = query(
          this.coursesCollection,
          where('creatorUid', '==', user.uid),
          orderBy('createdAt', 'desc')
        );

        return collectionData(q, { idField: 'id' }).pipe(
          map((courses) => courses as AdminCourse[]),
          catchError((err) => {
            console.error('Error fetching my courses:', err);
            return of([]);
          })
        );
      })
    );
  }

  /**
   * Get all courses (superadmin only)
   * For regular admins, falls back to getMyCourses$
   */
  getAllCourses$(): Observable<AdminCourse[]> {
    if (!this.roleService.isSuperAdmin()) {
      return this.getMyCourses$();
    }

    const q = query(this.coursesCollection, orderBy('createdAt', 'desc'));

    return collectionData(q, { idField: 'id' }).pipe(
      map((courses) => courses as AdminCourse[]),
      catchError((err) => {
        console.error('Error fetching all courses:', err);
        return of([]);
      })
    );
  }

  /**
   * Get courses for admin view
   * Returns all courses for superadmin, own courses for admin
   */
  getCoursesForAdmin$(): Observable<AdminCourse[]> {
    if (this.roleService.isSuperAdmin()) {
      return this.getAllCourses$();
    }
    return this.getMyCourses$();
  }

  /**
   * Get a single course by ID
   */
  getCourseById$(courseId: string): Observable<AdminCourse | null> {
    const courseRef = doc(this.firestore, 'courses', courseId);

    return docData(courseRef, { idField: 'id' }).pipe(
      map((course) => (course as AdminCourse) || null),
      catchError((err) => {
        console.error('Error fetching course:', err);
        return of(null);
      })
    );
  }

  /**
   * Check if current user can edit a course
   */
  canEditCourse(course: AdminCourse): boolean {
    const currentUid = this.roleService.getCurrentUid();
    return (
      this.roleService.isSuperAdmin() || course.creatorUid === currentUid
    );
  }

  /**
   * Create a new course
   * Sets the creator to the current user
   */
  async createCourse(data: CreateCourseData): Promise<string> {
    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to create a course');
    }

    const profile = this.roleService.getProfile();

    // Build course data, excluding undefined values
    const courseData: Record<string, any> = {
      title: data.title,
      subject: data.subject,
      level: data.level,
      shortDescription: data.shortDescription,
      longDescription: data.longDescription,
      priceIls: data.priceIls,
      durationMinutes: data.durationMinutes ?? 0,
      isPublished: false,
      isFeatured: false,
      creatorUid: user.uid,
      creatorName: profile?.displayName || user.displayName || 'Unknown',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Only add coverImageUrl if it has a value
    if (data.coverImageUrl) {
      courseData['coverImageUrl'] = data.coverImageUrl;
    }

    const docRef = await addDoc(this.coursesCollection, courseData);
    return docRef.id;
  }

  /**
   * Update an existing course
   * Only allows updates if user is creator or superadmin
   */
  async updateCourse(courseId: string, data: UpdateCourseData): Promise<void> {
    const courseRef = doc(this.firestore, 'courses', courseId);

    // Verify permission (Firestore rules will also check, but good to check client-side)
    const course = await new Promise<AdminCourse | null>((resolve) => {
      this.getCourseById$(courseId).subscribe((c) => resolve(c));
    });

    if (!course) {
      throw new Error('Course not found');
    }

    if (!this.canEditCourse(course)) {
      throw new Error('You do not have permission to edit this course');
    }

    // Filter out undefined values (Firestore doesn't accept undefined)
    const updateData: Record<string, any> = { updatedAt: serverTimestamp() };
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }

    await updateDoc(courseRef, updateData);
  }

  /**
   * Delete a course
   * Only draft courses can be deleted
   * Only creator or superadmin can delete
   */
  async deleteCourse(courseId: string): Promise<void> {
    const course = await new Promise<AdminCourse | null>((resolve) => {
      this.getCourseById$(courseId).subscribe((c) => resolve(c));
    });

    if (!course) {
      throw new Error('Course not found');
    }

    if (!this.canEditCourse(course)) {
      throw new Error('You do not have permission to delete this course');
    }

    if (course.isPublished) {
      throw new Error('Cannot delete a published course. Unpublish it first.');
    }

    const courseRef = doc(this.firestore, 'courses', courseId);
    await deleteDoc(courseRef);
  }

  /**
   * Publish a course
   */
  async publishCourse(courseId: string): Promise<void> {
    await this.updateCourse(courseId, { isPublished: true });
  }

  /**
   * Unpublish a course
   */
  async unpublishCourse(courseId: string): Promise<void> {
    await this.updateCourse(courseId, { isPublished: false });
  }

  /**
   * Toggle featured status (superadmin only)
   */
  async toggleFeatured(courseId: string, isFeatured: boolean): Promise<void> {
    if (!this.roleService.isSuperAdmin()) {
      throw new Error('Only superadmins can feature courses');
    }

    await this.updateCourse(courseId, { isFeatured });
  }

  /**
   * Get course outline
   */
  getOutline$(courseId: string): Observable<CourseOutlineItem[]> {
    const outlineCollection = collection(
      this.firestore,
      'courses',
      courseId,
      'outline'
    );

    const q = query(outlineCollection, orderBy('order', 'asc'));

    return collectionData(q, { idField: 'id' }).pipe(
      map((items) => items as CourseOutlineItem[]),
      catchError((err) => {
        console.error('Error fetching course outline:', err);
        return of([]);
      })
    );
  }

  /**
   * Update course outline
   * Replaces entire outline with new items
   */
  async updateOutline(
    courseId: string,
    items: Omit<CourseOutlineItem, 'id'>[]
  ): Promise<void> {
    // This would need batch operations for proper implementation
    // For now, we'll use a simple approach
    const outlineCollection = collection(
      this.firestore,
      'courses',
      courseId,
      'outline'
    );

    // Add items with order
    for (let i = 0; i < items.length; i++) {
      await addDoc(outlineCollection, {
        ...items[i],
        order: i,
      });
    }
  }

  /**
   * Get course statistics
   */
  getCourseStats$(courseId: string): Observable<{
    lessonCount: number;
    questionCount: number;
    enrolledCount: number;
  }> {
    // This would query subcollections and entitlements
    // For now, return placeholder data
    return of({
      lessonCount: 0,
      questionCount: 0,
      enrolledCount: 0,
    });
  }

  /**
   * Seed sample courses (temporary - remove after use)
   */
  async seedSampleCourses(): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('Must be logged in to seed courses');
    }

    const profile = this.roleService.getProfile();
    const creatorName = profile?.displayName || user.displayName || 'Admin';

    const sampleCourses = [
      {
        title: 'דיני חוזים למתקדמים',
        subject: 'דיני חוזים',
        level: 'מתקדם',
        shortDescription: 'העמקה בסוגיות מורכבות בדיני חוזים - חוזים אחידים, פרשנות וסעדים',
        longDescription: `קורס מתקדם בדיני חוזים המיועד לסטודנטים שסיימו את הקורס הבסיסי.

נושאי הקורס:
• חוזים אחידים וחוק החוזים האחידים
• תניות פטור ותניות הגבלת אחריות
• פרשנות חוזים - גישות ושיטות
• השלמת חוזה וחוזה למראית עין
• סעדים מיוחדים - צווי מניעה ואכיפה
• חוזים לטובת צד שלישי

כולל ניתוח מעמיק של פסקי דין מרכזיים.`,
        priceIls: 199,
        durationMinutes: 600,
        isPublished: true,
        isFeatured: true,
        featuredOrder: 2,
      },
      {
        title: 'דיני ראיות',
        subject: 'דיני עונשין',
        level: 'בינוני',
        shortDescription: 'כללי הקבילות, נטל ההוכחה ואמצעי הראיה במשפט הישראלי',
        longDescription: `קורס מקיף בדיני ראיות המכין לבחינות הלשכה והאוניברסיטה.

תוכן הקורס:
• עקרונות יסוד בדיני ראיות
• קבילות ומשקל ראיות
• נטל ההוכחה ונטל הבאת הראיות
• עדות ישירה ועדות נסיבתית
• חסיונות - עורך דין-לקוח, רופא-מטופל
• הודאות נאשם

דגש על יישום מעשי בבתי המשפט.`,
        priceIls: 179,
        durationMinutes: 480,
        isPublished: true,
        isFeatured: true,
        featuredOrder: 3,
      },
      {
        title: 'סדר דין אזרחי',
        subject: 'משפט חוקתי',
        level: 'בינוני',
        shortDescription: 'הליכי המשפט האזרחי מהגשת התביעה ועד פסק הדין',
        longDescription: `קורס מקיף בסדר דין אזרחי - חובה לכל סטודנט למשפטים.

נושאים מרכזיים:
• סמכות בתי המשפט - עניינית ומקומית
• כתבי טענות - תביעה, הגנה, תשובה
• הליכים מקדמיים וגילוי מסמכים
• הוכחות והבאת ראיות
• סיכומים ופסק דין
• ערעור וערעור ברשות

כולל תרגול מעשי של כתיבת כתבי בי-דין.`,
        priceIls: 169,
        durationMinutes: 540,
        isPublished: true,
        isFeatured: true,
        featuredOrder: 4,
      }
    ];

    for (const course of sampleCourses) {
      await addDoc(this.coursesCollection, {
        ...course,
        creatorUid: user.uid,
        creatorName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }
}
