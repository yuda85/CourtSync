import { Timestamp } from '@angular/fire/firestore';
import { Course, CourseOutlineItem } from '@core/models/course.interface';

/**
 * Sample courses data for development
 * Based on the landing page law courses for CourtSync
 */

// Helper to create a mock Timestamp
const mockTimestamp = (): Timestamp => {
  return Timestamp.fromDate(new Date());
};

export const SAMPLE_COURSES: Course[] = [
  // Law Courses (6 - matching landing page)
  {
    id: 'contract-law',
    title: 'דיני חוזים',
    subject: 'דיני חוזים',
    level: 'בסיסי',
    durationMinutes: 480, // 8 hours
    priceIls: 149,
    shortDescription: 'כל מה שצריך לדעת על חוזים - מהתגבשות ועד הפרה',
    longDescription: `קורס מקיף בדיני חוזים המכסה את כל הנושאים הנדרשים למבחן.

בקורס זה תלמד:
• התגבשות החוזה - הצעה וקיבול
• תום לב במשא ומתן
• פגמים בכריתת חוזה
• תוכן החוזה ופרשנותו
• קיום החוזה והפרתו
• תרופות בגין הפרת חוזה
• ביטול חוזה והשבה
• חוזים אחידים

כולל ניתוח פסיקה עדכנית ושאלות ממבחנים קודמים.`,
    coverImageUrl: undefined,
    updatedAt: mockTimestamp(),
    isPublished: true,
    isFeatured: true,
    featuredOrder: 1
  },
  {
    id: 'criminal-law',
    title: 'דיני עונשין',
    subject: 'דיני עונשין',
    level: 'בסיסי',
    durationMinutes: 420, // 7 hours
    priceIls: 149,
    shortDescription: 'עבירות, יסודות האחריות הפלילית וסייגים',
    longDescription: `קורס מקיף בדיני עונשין הכולל את כל הנושאים הנבחנים.

נושאי הקורס:
• יסודות העבירה - היסוד העובדתי והנפשי
• סוגי עבירות ודרגות אחריות
• שותפות לעבירה
• סייגים לאחריות פלילית
• הגנה עצמית וצורך
• אי-שפיות ושכרות
• עבירות רכוש
• עבירות אלימות
• עבירות מין

כולל פירוט סעיפי חוק ופסיקה מרכזית.`,
    coverImageUrl: undefined,
    updatedAt: mockTimestamp(),
    isPublished: true,
    isFeatured: true,
    featuredOrder: 2
  },
  {
    id: 'tort-law',
    title: 'דיני נזיקין',
    subject: 'דיני נזיקין',
    level: 'בסיסי',
    durationMinutes: 540, // 9 hours
    priceIls: 179,
    shortDescription: 'עוולות, אחריות וסעדים בדיני הנזיקין',
    longDescription: `קורס מקיף בדיני נזיקין המכין לכל סוגי המבחנים.

הקורס מכסה:
• עוולת הרשלנות - חובת הזהירות
• הפרת חובה חקוקה
• תקיפה וכליאת שווא
• הסגת גבול
• לשון הרע
• גרם הפרת חוזה
• עוולות כלכליות
• קשר סיבתי ונזק
• אחריות שילוחית
• פיצויים וסעדים

דגש על פסיקת בית המשפט העליון.`,
    coverImageUrl: undefined,
    updatedAt: mockTimestamp(),
    isPublished: true,
    isFeatured: true,
    featuredOrder: 3
  },
  {
    id: 'constitutional-law',
    title: 'משפט חוקתי',
    subject: 'משפט חוקתי',
    level: 'מתקדם',
    durationMinutes: 360, // 6 hours
    priceIls: 169,
    shortDescription: 'חוקי היסוד, זכויות האדם והביקורת השיפוטית',
    longDescription: `קורס מתקדם במשפט חוקתי ישראלי.

נושאים מרכזיים:
• חוקי היסוד ומעמדם
• המהפכה החוקתית
• זכויות האדם בישראל
• חופש הביטוי
• הזכות לכבוד ולפרטיות
• חופש העיסוק
• הזכות לשוויון
• הביקורת השיפוטית
• פסקת ההגבלה
• בג"ץ ותפקידו

ניתוח מעמיק של פסקי דין מכוננים.`,
    coverImageUrl: undefined,
    updatedAt: mockTimestamp(),
    isPublished: true,
    isFeatured: true,
    featuredOrder: 4
  },
  {
    id: 'property-law',
    title: 'דיני קניין',
    subject: 'דיני קניין',
    level: 'בסיסי',
    durationMinutes: 450, // 7.5 hours
    priceIls: 149,
    shortDescription: 'בעלות, חזקה, מקרקעין ומיטלטלין',
    longDescription: `קורס יסודי בדיני קניין הכולל את כל הנושאים הנדרשים.

תוכן הקורס:
• מהות הקניין וסוגיו
• בעלות - רכישה והגנה
• חזקה ושימוש
• זכויות במקרקעין
• רישום מקרקעין
• עסקאות במקרקעין
• בתים משותפים
• שכירות והשאלה
• מיטלטלין
• נאמנות וקניין רוחני

כולל תרגול מעשי ושאלות בחינה.`,
    coverImageUrl: undefined,
    updatedAt: mockTimestamp(),
    isPublished: true,
    isFeatured: true,
    featuredOrder: 5
  },
  {
    id: 'family-law',
    title: 'דיני משפחה',
    subject: 'דיני משפחה',
    level: 'מתקדם',
    durationMinutes: 330, // 5.5 hours
    priceIls: 159,
    shortDescription: 'נישואין, גירושין, מזונות וירושה',
    longDescription: `קורס מתקדם בדיני משפחה וירושה.

הקורס עוסק ב:
• נישואין וגירושין בישראל
• הדין הדתי והאזרחי
• ידועים בציבור
• משמורת ילדים
• מזונות אישה וילדים
• חלוקת רכוש
• הסכמי ממון
• דיני ירושה
• צוואות וצוי ירושה
• ניהול עיזבון

התמודדות עם מקרים מורכבים מהפרקטיקה.`,
    coverImageUrl: undefined,
    updatedAt: mockTimestamp(),
    isPublished: true,
    isFeatured: true,
    featuredOrder: 6
  }
];

/**
 * Sample course outlines for each course
 */
export const SAMPLE_OUTLINES: Record<string, CourseOutlineItem[]> = {
  'contract-law': [
    { id: 'sec-1', type: 'section', title: 'התגבשות החוזה', order: 1 },
    { id: 'les-1-1', type: 'lesson', title: 'מהו חוזה?', order: 2, lessonId: 'l1' },
    { id: 'les-1-2', type: 'lesson', title: 'הצעה וקיבול', order: 3, lessonId: 'l2' },
    { id: 'les-1-3', type: 'lesson', title: 'גמירות דעת ומסוימות', order: 4, lessonId: 'l3' },
    { id: 'les-1-4', type: 'lesson', title: 'תום לב במשא ומתן', order: 5, lessonId: 'l4' },
    { id: 'sec-2', type: 'section', title: 'פגמים בכריתה', order: 6 },
    { id: 'les-2-1', type: 'lesson', title: 'טעות', order: 7, lessonId: 'l5' },
    { id: 'les-2-2', type: 'lesson', title: 'הטעיה', order: 8, lessonId: 'l6' },
    { id: 'les-2-3', type: 'lesson', title: 'כפייה ועושק', order: 9, lessonId: 'l7' },
    { id: 'sec-3', type: 'section', title: 'תוכן וקיום', order: 10 },
    { id: 'les-3-1', type: 'lesson', title: 'תוכן החוזה', order: 11, lessonId: 'l8' },
    { id: 'les-3-2', type: 'lesson', title: 'פרשנות חוזה', order: 12, lessonId: 'l9' },
    { id: 'les-3-3', type: 'lesson', title: 'קיום והפרה', order: 13, lessonId: 'l10' },
    { id: 'sec-4', type: 'section', title: 'תרופות', order: 14 },
    { id: 'les-4-1', type: 'lesson', title: 'אכיפה', order: 15, lessonId: 'l11' },
    { id: 'les-4-2', type: 'lesson', title: 'פיצויים', order: 16, lessonId: 'l12' },
    { id: 'les-4-3', type: 'lesson', title: 'ביטול והשבה', order: 17, lessonId: 'l13' }
  ],
  'criminal-law': [
    { id: 'sec-1', type: 'section', title: 'יסודות העבירה', order: 1 },
    { id: 'les-1-1', type: 'lesson', title: 'היסוד העובדתי', order: 2, lessonId: 'l1' },
    { id: 'les-1-2', type: 'lesson', title: 'היסוד הנפשי', order: 3, lessonId: 'l2' },
    { id: 'les-1-3', type: 'lesson', title: 'קשר סיבתי', order: 4, lessonId: 'l3' },
    { id: 'sec-2', type: 'section', title: 'שותפות וניסיון', order: 5 },
    { id: 'les-2-1', type: 'lesson', title: 'שותפות לעבירה', order: 6, lessonId: 'l4' },
    { id: 'les-2-2', type: 'lesson', title: 'ניסיון', order: 7, lessonId: 'l5' },
    { id: 'les-2-3', type: 'lesson', title: 'הכנה וקשירת קשר', order: 8, lessonId: 'l6' },
    { id: 'sec-3', type: 'section', title: 'סייגים לאחריות', order: 9 },
    { id: 'les-3-1', type: 'lesson', title: 'הגנה עצמית', order: 10, lessonId: 'l7' },
    { id: 'les-3-2', type: 'lesson', title: 'צורך וכורח', order: 11, lessonId: 'l8' },
    { id: 'les-3-3', type: 'lesson', title: 'אי-שפיות', order: 12, lessonId: 'l9' },
    { id: 'sec-4', type: 'section', title: 'עבירות נבחרות', order: 13 },
    { id: 'les-4-1', type: 'lesson', title: 'עבירות רכוש', order: 14, lessonId: 'l10' },
    { id: 'les-4-2', type: 'lesson', title: 'עבירות אלימות', order: 15, lessonId: 'l11' }
  ],
  'tort-law': [
    { id: 'sec-1', type: 'section', title: 'עוולת הרשלנות', order: 1 },
    { id: 'les-1-1', type: 'lesson', title: 'חובת זהירות מושגית', order: 2, lessonId: 'l1' },
    { id: 'les-1-2', type: 'lesson', title: 'חובת זהירות קונקרטית', order: 3, lessonId: 'l2' },
    { id: 'les-1-3', type: 'lesson', title: 'הפרת החובה', order: 4, lessonId: 'l3' },
    { id: 'les-1-4', type: 'lesson', title: 'קשר סיבתי ונזק', order: 5, lessonId: 'l4' },
    { id: 'sec-2', type: 'section', title: 'עוולות נוספות', order: 6 },
    { id: 'les-2-1', type: 'lesson', title: 'תקיפה וכליאת שווא', order: 7, lessonId: 'l5' },
    { id: 'les-2-2', type: 'lesson', title: 'הסגת גבול', order: 8, lessonId: 'l6' },
    { id: 'les-2-3', type: 'lesson', title: 'לשון הרע', order: 9, lessonId: 'l7' },
    { id: 'les-2-4', type: 'lesson', title: 'הפרת חובה חקוקה', order: 10, lessonId: 'l8' },
    { id: 'sec-3', type: 'section', title: 'אחריות ופיצויים', order: 11 },
    { id: 'les-3-1', type: 'lesson', title: 'אחריות שילוחית', order: 12, lessonId: 'l9' },
    { id: 'les-3-2', type: 'lesson', title: 'אחריות חמורה', order: 13, lessonId: 'l10' },
    { id: 'les-3-3', type: 'lesson', title: 'פיצויים וסעדים', order: 14, lessonId: 'l11' }
  ],
  'constitutional-law': [
    { id: 'sec-1', type: 'section', title: 'יסודות המשפט החוקתי', order: 1 },
    { id: 'les-1-1', type: 'lesson', title: 'חוקי היסוד', order: 2, lessonId: 'l1' },
    { id: 'les-1-2', type: 'lesson', title: 'המהפכה החוקתית', order: 3, lessonId: 'l2' },
    { id: 'les-1-3', type: 'lesson', title: 'הביקורת השיפוטית', order: 4, lessonId: 'l3' },
    { id: 'sec-2', type: 'section', title: 'זכויות האדם', order: 5 },
    { id: 'les-2-1', type: 'lesson', title: 'כבוד האדם', order: 6, lessonId: 'l4' },
    { id: 'les-2-2', type: 'lesson', title: 'חופש הביטוי', order: 7, lessonId: 'l5' },
    { id: 'les-2-3', type: 'lesson', title: 'חופש העיסוק', order: 8, lessonId: 'l6' },
    { id: 'les-2-4', type: 'lesson', title: 'הזכות לשוויון', order: 9, lessonId: 'l7' },
    { id: 'sec-3', type: 'section', title: 'פסקת ההגבלה', order: 10 },
    { id: 'les-3-1', type: 'lesson', title: 'התנאים להגבלה', order: 11, lessonId: 'l8' },
    { id: 'les-3-2', type: 'lesson', title: 'מבחן המידתיות', order: 12, lessonId: 'l9' }
  ],
  'property-law': [
    { id: 'sec-1', type: 'section', title: 'יסודות הקניין', order: 1 },
    { id: 'les-1-1', type: 'lesson', title: 'מהות הקניין', order: 2, lessonId: 'l1' },
    { id: 'les-1-2', type: 'lesson', title: 'בעלות', order: 3, lessonId: 'l2' },
    { id: 'les-1-3', type: 'lesson', title: 'חזקה', order: 4, lessonId: 'l3' },
    { id: 'sec-2', type: 'section', title: 'מקרקעין', order: 5 },
    { id: 'les-2-1', type: 'lesson', title: 'רישום מקרקעין', order: 6, lessonId: 'l4' },
    { id: 'les-2-2', type: 'lesson', title: 'עסקאות במקרקעין', order: 7, lessonId: 'l5' },
    { id: 'les-2-3', type: 'lesson', title: 'בתים משותפים', order: 8, lessonId: 'l6' },
    { id: 'les-2-4', type: 'lesson', title: 'זכויות במקרקעין', order: 9, lessonId: 'l7' },
    { id: 'sec-3', type: 'section', title: 'שכירות ומיטלטלין', order: 10 },
    { id: 'les-3-1', type: 'lesson', title: 'שכירות והשאלה', order: 11, lessonId: 'l8' },
    { id: 'les-3-2', type: 'lesson', title: 'מיטלטלין', order: 12, lessonId: 'l9' },
    { id: 'les-3-3', type: 'lesson', title: 'נאמנות', order: 13, lessonId: 'l10' }
  ],
  'family-law': [
    { id: 'sec-1', type: 'section', title: 'נישואין וגירושין', order: 1 },
    { id: 'les-1-1', type: 'lesson', title: 'נישואין בישראל', order: 2, lessonId: 'l1' },
    { id: 'les-1-2', type: 'lesson', title: 'גירושין', order: 3, lessonId: 'l2' },
    { id: 'les-1-3', type: 'lesson', title: 'ידועים בציבור', order: 4, lessonId: 'l3' },
    { id: 'sec-2', type: 'section', title: 'ילדים ומזונות', order: 5 },
    { id: 'les-2-1', type: 'lesson', title: 'משמורת', order: 6, lessonId: 'l4' },
    { id: 'les-2-2', type: 'lesson', title: 'מזונות ילדים', order: 7, lessonId: 'l5' },
    { id: 'les-2-3', type: 'lesson', title: 'מזונות אישה', order: 8, lessonId: 'l6' },
    { id: 'sec-3', type: 'section', title: 'רכוש וירושה', order: 9 },
    { id: 'les-3-1', type: 'lesson', title: 'איזון משאבים', order: 10, lessonId: 'l7' },
    { id: 'les-3-2', type: 'lesson', title: 'הסכמי ממון', order: 11, lessonId: 'l8' },
    { id: 'les-3-3', type: 'lesson', title: 'דיני ירושה', order: 12, lessonId: 'l9' },
    { id: 'les-3-4', type: 'lesson', title: 'צוואות', order: 13, lessonId: 'l10' }
  ]
};

/**
 * Law subjects for CourtSync
 */
export const LAW_SUBJECTS = [
  'דיני חוזים',
  'דיני עונשין',
  'דיני נזיקין',
  'משפט חוקתי',
  'דיני קניין',
  'דיני משפחה'
] as const;

/**
 * Get all sample courses
 */
export function getSampleCourses(): Course[] {
  return SAMPLE_COURSES;
}

/**
 * Get published sample courses
 */
export function getPublishedCourses(): Course[] {
  return SAMPLE_COURSES.filter(c => c.isPublished);
}

/**
 * Get featured sample courses
 */
export function getFeaturedCourses(limit = 6): Course[] {
  return SAMPLE_COURSES
    .filter(c => c.isPublished && c.isFeatured)
    .sort((a, b) => (a.featuredOrder ?? 999) - (b.featuredOrder ?? 999))
    .slice(0, limit);
}

/**
 * Get course by ID
 */
export function getCourseById(id: string): Course | undefined {
  return SAMPLE_COURSES.find(c => c.id === id);
}

/**
 * Get course outline by course ID
 */
export function getCourseOutline(courseId: string): CourseOutlineItem[] {
  return SAMPLE_OUTLINES[courseId] || [];
}

/**
 * Filter courses by criteria
 */
export function filterCourses(
  courses: Course[],
  filters: { subject?: string; level?: string; searchTerm?: string }
): Course[] {
  return courses.filter(course => {
    // Subject filter
    if (filters.subject && course.subject !== filters.subject) {
      return false;
    }
    // Level filter
    if (filters.level && course.level !== filters.level) {
      return false;
    }
    // Search filter (title and description)
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      const inTitle = course.title.toLowerCase().includes(term);
      const inShortDesc = course.shortDescription.toLowerCase().includes(term);
      const inLongDesc = course.longDescription.toLowerCase().includes(term);
      if (!inTitle && !inShortDesc && !inLongDesc) {
        return false;
      }
    }
    return true;
  });
}
