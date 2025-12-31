import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  Firestore,
  collection,
  doc,
  collectionData,
  docData,
  query,
  where,
  orderBy
} from '@angular/fire/firestore';
import { Lesson } from '@core/models/lesson.interface';

/**
 * Mock lessons for דיני עונשין (Criminal Law) course
 */
const CRIMINAL_LAW_LESSONS: Lesson[] = [
  {
    id: 'criminal-law-lesson-1',
    courseId: 'criminal-law',
    title: 'מבוא למשפט הפלילי',
    description: 'שיעור ראשון - מושגי יסוד והיכרות עם התחום',
    type: 'text',
    order: 1,
    durationMinutes: 15,
    content: `מבוא למשפט הפלילי

המשפט הפלילי הוא ענף המשפט העוסק בהגדרת מעשים אסורים (עבירות) ובקביעת העונשים עליהם.

מטרות המשפט הפלילי:
• הגנה על הציבור מפני פשיעה
• הרתעת עבריינים פוטנציאליים
• ענישה והוקעה של התנהגות פסולה
• שיקום עבריינים

עקרונות יסוד:
1. עקרון החוקיות - "אין עבירה ואין עונש אלא בחוק"
2. חזקת החפות - כל אדם חף מפשע עד שהוכח אשם
3. הספק לטובת הנאשם

בשיעורים הבאים נעמיק בכל אחד מהנושאים הללו.`
  },
  {
    id: 'criminal-law-lesson-2',
    courseId: 'criminal-law',
    title: 'יסודות האחריות הפלילית',
    description: 'שיעור שני - מרכיבי העבירה והיסוד הנפשי',
    type: 'text',
    order: 2,
    durationMinutes: 20,
    content: `יסודות האחריות הפלילית

כדי להרשיע אדם בעבירה פלילית, יש להוכיח שני יסודות:

1. היסוד העובדתי (Actus Reus)
   • מעשה או מחדל
   • נסיבות
   • תוצאה (בעבירות תוצאתיות)

2. היסוד הנפשי (Mens Rea)
   • מחשבה פלילית - כוונה, מודעות
   • רשלנות - התרשלות בנסיבות שאדם סביר לא היה מתרשל

דוגמה:
בעבירת גניבה - היסוד העובדתי הוא נטילת חפץ, והיסוד הנפשי הוא כוונה לשלול את החפץ מבעליו לצמיתות.

בשיעור הבא נלמד על הגנות במשפט הפלילי.`
  },
  {
    id: 'criminal-law-lesson-3',
    courseId: 'criminal-law',
    title: 'הגנות במשפט הפלילי',
    description: 'שיעור שלישי - הגנה עצמית, כורח ואחרות',
    type: 'video',
    order: 3,
    durationMinutes: 25,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
  },
  {
    id: 'criminal-law-lesson-4',
    courseId: 'criminal-law',
    title: 'עבירות נגד הגוף',
    description: 'שיעור רביעי - תקיפה, חבלה ועבירות אלימות',
    type: 'text',
    order: 4,
    durationMinutes: 20,
    content: `עבירות נגד הגוף

עבירות נגד הגוף הן עבירות הפוגעות בשלמות הגופנית של אדם.

סוגי עבירות:

1. תקיפה (סעיף 379)
   • מגע פיזי ללא הסכמה
   • עונש: עד שנתיים מאסר

2. תקיפה הגורמת חבלה (סעיף 380)
   • תקיפה שגרמה לפציעה
   • עונש: עד 3 שנים מאסר

3. חבלה חמורה (סעיף 333)
   • גרימת חבלה חמורה בכוונה
   • עונש: עד 7 שנים מאסר

4. ניסיון רצח (סעיף 305)
   • ניסיון לגרום למותו של אדם
   • עונש: עד 20 שנים מאסר`
  },
  {
    id: 'criminal-law-lesson-5',
    courseId: 'criminal-law',
    title: 'סיכום ובוחן',
    description: 'שיעור חמישי - חזרה על החומר ובוחן מסכם',
    type: 'quiz',
    order: 5,
    durationMinutes: 15
  }
];

/**
 * Lessons Repository
 * Manages lesson data from Firestore with mock data fallback
 * Path: /lessons/{lessonId}
 */
@Injectable({
  providedIn: 'root'
})
export class LessonsRepo {
  private readonly firestore = inject(Firestore);

  /**
   * Mock lessons indexed by courseId for quick lookup
   */
  private readonly mockLessons: Record<string, Lesson[]> = {
    'criminal-law': CRIMINAL_LAW_LESSONS
  };

  /**
   * Get all lessons for a course, ordered by their order field
   * Returns mock data if available, otherwise fetches from Firestore
   */
  getLessonsForCourse$(courseId: string): Observable<Lesson[]> {
    // Check for mock data first
    if (this.mockLessons[courseId]) {
      return of(this.mockLessons[courseId]);
    }

    // Fallback to Firestore
    const lessonsRef = collection(this.firestore, 'lessons');
    const q = query(
      lessonsRef,
      where('courseId', '==', courseId),
      orderBy('order', 'asc')
    );

    return collectionData(q, { idField: 'id' }).pipe(
      map(docs => docs as Lesson[]),
      catchError(err => {
        console.error('Error fetching lessons:', err);
        return of([]);
      })
    );
  }

  /**
   * Get a single lesson by ID
   * Checks mock data first, then falls back to Firestore
   */
  getLesson$(lessonId: string): Observable<Lesson | null> {
    // Check mock data first
    for (const lessons of Object.values(this.mockLessons)) {
      const found = lessons.find(l => l.id === lessonId);
      if (found) {
        return of(found);
      }
    }

    // Fallback to Firestore
    const lessonRef = doc(this.firestore, 'lessons', lessonId);

    return docData(lessonRef, { idField: 'id' }).pipe(
      map(doc => (doc ? (doc as Lesson) : null)),
      catchError(err => {
        console.error('Error fetching lesson:', err);
        return of(null);
      })
    );
  }
}
