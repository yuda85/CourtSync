import { Firestore, collection, doc, setDoc } from '@angular/fire/firestore';

/**
 * Sample lessons data for testing Feature #3
 * Run from browser console: window.seedLessons('your-course-id')
 */
export const SAMPLE_LESSONS = [
  {
    id: 'lesson-1',
    title: 'מבוא למשפט הפלילי',
    description: 'שיעור ראשון - מושגי יסוד והיכרות עם התחום',
    type: 'text' as const,
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
    id: 'lesson-2',
    title: 'יסודות האחריות הפלילית',
    description: 'שיעור שני - מרכיבי העבירה והיסוד הנפשי',
    type: 'text' as const,
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
    id: 'lesson-3',
    title: 'הגנות במשפט הפלילי',
    description: 'שיעור שלישי - הגנה עצמית, כורח ואחרות',
    type: 'video' as const,
    order: 3,
    durationMinutes: 25,
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    id: 'lesson-4',
    title: 'עבירות נגד הגוף',
    description: 'שיעור רביעי - תקיפה, חבלה ועבירות אלימות',
    type: 'text' as const,
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
    id: 'lesson-5',
    title: 'סיכום ובוחן',
    description: 'שיעור חמישי - חזרה על החומר ובוחן מסכם',
    type: 'quiz' as const,
    order: 5,
    durationMinutes: 15
  }
];

/**
 * Seeds lessons to Firestore for a specific course
 * @param firestore - Firestore instance
 * @param courseId - The course ID to add lessons to
 */
export async function seedLessonsToFirestore(
  firestore: Firestore,
  courseId: string
): Promise<void> {
  console.log(`🌱 Seeding ${SAMPLE_LESSONS.length} lessons for course: ${courseId}`);

  const lessonsRef = collection(firestore, 'lessons');

  for (const lesson of SAMPLE_LESSONS) {
    const lessonId = `${courseId}-${lesson.id}`;
    const lessonRef = doc(lessonsRef, lessonId);

    const lessonData = {
      ...lesson,
      id: lessonId,
      courseId
    };

    // Remove the template id
    delete (lessonData as any).id;

    await setDoc(lessonRef, lessonData);
    console.log(`  ✅ Created lesson: ${lesson.title}`);
  }

  console.log('🎉 All lessons seeded successfully!');
  console.log(`\nNavigate to: /app/courses/${courseId}/learn to see them`);
}
