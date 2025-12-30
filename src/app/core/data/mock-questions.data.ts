import { Timestamp } from '@angular/fire/firestore';
import { Question } from '@core/models/question.interface';

/**
 * Helper to create a mock Timestamp
 */
const mockTimestamp = (): Timestamp => {
  return Timestamp.fromDate(new Date());
};

/**
 * Mock questions for דיני עונשין (Criminal Law) course
 * Used for development and testing when Firestore is empty
 */
export const MOCK_QUESTIONS: Question[] = [
  // Topic: יסוד עובדתי
  {
    id: 'q1',
    courseId: 'criminal-law',
    subject: 'דיני עונשין',
    topic: 'יסוד עובדתי',
    difficulty: 'קל',
    questionText: 'מהו היסוד העובדתי של עבירה פלילית?',
    options: [
      { id: 'a', text: 'הכוונה הפלילית של העבריין' },
      { id: 'b', text: 'המעשה או המחדל שמהווים את העבירה' },
      { id: 'c', text: 'הנזק שנגרם לקורבן' },
      { id: 'd', text: 'המניע לביצוע העבירה' }
    ],
    correctOptionId: 'b',
    explanation: 'היסוד העובדתי (Actus Reus) הוא המרכיב החיצוני של העבירה, הכולל את המעשה או המחדל שמהווים את העבירה. זהו אחד משני היסודות הנדרשים להרשעה פלילית, לצד היסוד הנפשי.',
    relatedLessonId: 'criminal-law-lesson-5',
    isPublished: true,
    updatedAt: mockTimestamp()
  },
  {
    id: 'q2',
    courseId: 'criminal-law',
    subject: 'דיני עונשין',
    topic: 'יסוד עובדתי',
    difficulty: 'בינוני',
    questionText: 'מהו הבדל בין מעשה למחדל בדיני העונשין?',
    options: [
      { id: 'a', text: 'מעשה הוא פעולה אקטיבית, מחדל הוא אי-עשיית מעשה כשקיימת חובה לפעול' },
      { id: 'b', text: 'מעשה הוא עבירה חמורה, מחדל הוא עבירה קלה' },
      { id: 'c', text: 'אין הבדל - שניהם נחשבים אותו דבר' },
      { id: 'd', text: 'מעשה דורש כוונה, מחדל לא דורש' }
    ],
    correctOptionId: 'a',
    explanation: 'מעשה (Act) הוא פעולה אקטיבית וולונטרית, בעוד מחדל (Omission) הוא הימנעות מפעולה כאשר קיימת חובה משפטית לפעול. לא כל מחדל יוצר אחריות פלילית - נדרשת חובה קודמת לפעול.',
    relatedLessonId: 'criminal-law-lesson-5',
    isPublished: true,
    updatedAt: mockTimestamp()
  },

  // Topic: יסוד נפשי
  {
    id: 'q3',
    courseId: 'criminal-law',
    subject: 'דיני עונשין',
    topic: 'יסוד נפשי',
    difficulty: 'קל',
    questionText: 'מהי "מחשבה פלילית" (Mens Rea)?',
    options: [
      { id: 'a', text: 'תכנון מפורט של העבירה מראש' },
      { id: 'b', text: 'היסוד הנפשי הנדרש לביצוע עבירה פלילית' },
      { id: 'c', text: 'הרהורים על ביצוע עבירה' },
      { id: 'd', text: 'מצב נפשי של חרטה לאחר העבירה' }
    ],
    correctOptionId: 'b',
    explanation: 'מחשבה פלילית (Mens Rea) היא היסוד הנפשי הנדרש להרשעה בעבירה פלילית. היא כוללת את המודעות, הכוונה או הרשלנות של העבריין ביחס לרכיבי העבירה.',
    relatedLessonId: 'criminal-law-lesson-5',
    isPublished: true,
    updatedAt: mockTimestamp()
  },
  {
    id: 'q4',
    courseId: 'criminal-law',
    subject: 'דיני עונשין',
    topic: 'יסוד נפשי',
    difficulty: 'בינוני',
    questionText: 'מהו ההבדל בין "כוונה" ל"פזיזות" בדיני העונשין?',
    options: [
      { id: 'a', text: 'כוונה היא רצון להשיג תוצאה, פזיזות היא שוויון נפש לתוצאה אפשרית' },
      { id: 'b', text: 'כוונה קיימת רק בעבירות חמורות, פזיזות בעבירות קלות' },
      { id: 'c', text: 'אין הבדל מעשי בין השניים' },
      { id: 'd', text: 'כוונה דורשת תכנון, פזיזות היא מעשה ספונטני' }
    ],
    correctOptionId: 'a',
    explanation: 'כוונה (Intent) משמעה שהעבריין רצה להשיג תוצאה מסוימת או צפה אותה כוודאית. פזיזות (Recklessness) היא מודעות לסיכון תוך נטילתו בשוויון נפש - העבריין מודע לאפשרות התוצאה אך לא אכפת לו.',
    relatedLessonId: 'criminal-law-lesson-5',
    isPublished: true,
    updatedAt: mockTimestamp()
  },
  {
    id: 'q5',
    courseId: 'criminal-law',
    subject: 'דיני עונשין',
    topic: 'יסוד נפשי',
    difficulty: 'קשה',
    questionText: 'מתי תוכר "עצימת עיניים" כתחליף למודעות בדיני העונשין?',
    options: [
      { id: 'a', text: 'כאשר הנאשם טוען שלא ידע דבר על העבירה' },
      { id: 'b', text: 'כאשר הנאשם חשד בקיום נסיבה מסוימת ונמנע מלברר במכוון' },
      { id: 'c', text: 'כאשר הנאשם היה שיכור בעת ביצוע העבירה' },
      { id: 'd', text: 'כאשר הנאשם לא הבין את משמעות מעשיו' }
    ],
    correctOptionId: 'b',
    explanation: 'דוקטרינת "עצימת עיניים" מכירה במודעות כאשר אדם חושד בקיום עובדות מסוימות אך נמנע במכוון מלברר אותן. בית המשפט רואה בהימנעות מכוונת מבירור כשוות ערך למודעות בפועל.',
    relatedLessonId: 'criminal-law-lesson-5',
    isPublished: true,
    updatedAt: mockTimestamp()
  },

  // Topic: קשר סיבתי
  {
    id: 'q6',
    courseId: 'criminal-law',
    subject: 'דיני עונשין',
    topic: 'קשר סיבתי',
    difficulty: 'בינוני',
    questionText: 'מהו מבחן "הסיבה בלעדיה אין" (But-For Test)?',
    options: [
      { id: 'a', text: 'בדיקה האם העבריין התכוון לגרום לתוצאה' },
      { id: 'b', text: 'בדיקה האם התוצאה הייתה מתרחשת גם ללא מעשה העבריין' },
      { id: 'c', text: 'בדיקה האם הקורבן תרם להתרחשות העבירה' },
      { id: 'd', text: 'בדיקה האם העבירה הייתה צפויה' }
    ],
    correctOptionId: 'b',
    explanation: 'מבחן "הסיבה בלעדיה אין" בודק האם התוצאה הייתה מתרחשת אלמלא מעשה הנאשם. אם התשובה שלילית - כלומר, ללא המעשה התוצאה לא הייתה מתרחשת - קיים קשר סיבתי עובדתי.',
    relatedLessonId: 'criminal-law-lesson-5',
    isPublished: true,
    updatedAt: mockTimestamp()
  },
  {
    id: 'q7',
    courseId: 'criminal-law',
    subject: 'דיני עונשין',
    topic: 'קשר סיבתי',
    difficulty: 'קשה',
    questionText: 'מתי "גורם מתערב" ינתק את הקשר הסיבתי?',
    options: [
      { id: 'a', text: 'בכל מקרה בו גורם שלישי מעורב באירוע' },
      { id: 'b', text: 'רק כאשר הגורם המתערב היה בלתי צפוי ויוצא דופן' },
      { id: 'c', text: 'רק כאשר הגורם המתערב הוא אדם ולא אירוע טבעי' },
      { id: 'd', text: 'כאשר הגורם המתערב גרם לנזק חמור יותר' }
    ],
    correctOptionId: 'b',
    explanation: 'גורם מתערב ינתק את הקשר הסיבתי רק כאשר הוא בלתי צפוי ויוצא דופן באופן קיצוני. אם הגורם המתערב היה צפוי במידה סבירה, הוא לא ינתק את הקשר הסיבתי והאחריות תישאר על הנאשם המקורי.',
    relatedLessonId: 'criminal-law-lesson-5',
    isPublished: true,
    updatedAt: mockTimestamp()
  },

  // Topic: הגנה עצמית
  {
    id: 'q8',
    courseId: 'criminal-law',
    subject: 'דיני עונשין',
    topic: 'הגנה עצמית',
    difficulty: 'קל',
    questionText: 'מהם התנאים הבסיסיים להכרה בטענת הגנה עצמית?',
    options: [
      { id: 'a', text: 'תקיפה צפויה בעתיד הרחוק' },
      { id: 'b', text: 'תקיפה מיידית שלא ניתן להימנע ממנה, ותגובה מידתית' },
      { id: 'c', text: 'כל תקיפה שהיא, ללא מגבלות על התגובה' },
      { id: 'd', text: 'תקיפה קודמת שדורשת נקמה' }
    ],
    correctOptionId: 'b',
    explanation: 'הגנה עצמית דורשת: (1) תקיפה שלא כדין מיידית או קרובה, (2) אי-אפשרות להימנע ממנה בדרכים אחרות, (3) תגובה מידתית וסבירה. התגובה צריכה להיות פרופורציונלית לאיום.',
    relatedLessonId: 'criminal-law-lesson-5',
    isPublished: true,
    updatedAt: mockTimestamp()
  },
  {
    id: 'q9',
    courseId: 'criminal-law',
    subject: 'דיני עונשין',
    topic: 'הגנה עצמית',
    difficulty: 'בינוני',
    questionText: 'האם ניתן לטעון להגנה עצמית כאשר המתגונן יצר את האיום בעצמו?',
    options: [
      { id: 'a', text: 'כן, תמיד' },
      { id: 'b', text: 'לא, לעולם לא' },
      { id: 'c', text: 'תלוי - אם לא צפה את רמת התגובה או אם נסוג מהעימות' },
      { id: 'd', text: 'רק אם הודה במעורבותו' }
    ],
    correctOptionId: 'c',
    explanation: 'כאשר המתגונן יצר את האיום ("תוקפן ראשוני"), הוא עדיין יכול לטעון להגנה עצמית אם: (1) התגובה נגדו הייתה בלתי מידתית לפרובוקציה שיצר, או (2) הוא נסוג מהעימות ויידע על כך את התוקף.',
    relatedLessonId: 'criminal-law-lesson-5',
    isPublished: true,
    updatedAt: mockTimestamp()
  },

  // Topic: צורך
  {
    id: 'q10',
    courseId: 'criminal-law',
    subject: 'דיני עונשין',
    topic: 'צורך',
    difficulty: 'בינוני',
    questionText: 'מה ההבדל בין הגנת "צורך" להגנת "כורח"?',
    options: [
      { id: 'a', text: 'אין הבדל - אלו שמות שונים לאותה הגנה' },
      { id: 'b', text: 'צורך נובע מנסיבות אובייקטיביות, כורח מאיום של אדם' },
      { id: 'c', text: 'צורך חל רק על עבירות קלות, כורח על עבירות חמורות' },
      { id: 'd', text: 'צורך דורש הוכחה מוחלטת, כורח דורש הוכחה חלקית' }
    ],
    correctOptionId: 'b',
    explanation: 'צורך (Necessity) נובע מנסיבות אובייקטיביות (למשל, סופת שלגים), בעוד כורח (Duress) נובע מאיום של אדם אחר. בשניהם נדרש איזון בין הרע שנמנע לרע שנגרם.',
    relatedLessonId: 'criminal-law-lesson-5',
    isPublished: true,
    updatedAt: mockTimestamp()
  },

  // Topic: שותפות לעבירה
  {
    id: 'q11',
    courseId: 'criminal-law',
    subject: 'דיני עונשין',
    topic: 'שותפות לעבירה',
    difficulty: 'קל',
    questionText: 'מהו "מבצע עיקרי" לעומת "מסייע" בדיני שותפות?',
    options: [
      { id: 'a', text: 'המבצע העיקרי הוא מי שתכנן את העבירה, המסייע הוא מי שביצע' },
      { id: 'b', text: 'המבצע העיקרי מבצע את היסוד העובדתי, המסייע מסייע לפני או בעת הביצוע' },
      { id: 'c', text: 'אין הבדל משפטי ביניהם' },
      { id: 'd', text: 'המבצע העיקרי תמיד יקבל עונש חמור יותר' }
    ],
    correctOptionId: 'b',
    explanation: 'מבצע עיקרי הוא מי שמבצע בפועל את היסוד העובדתי של העבירה. מסייע הוא מי שעוזר לפני או בעת ביצוע העבירה, מבלי לבצע בעצמו את היסוד העובדתי. עונשו של מסייע קל יותר.',
    relatedLessonId: 'criminal-law-lesson-5',
    isPublished: true,
    updatedAt: mockTimestamp()
  },
  {
    id: 'q12',
    courseId: 'criminal-law',
    subject: 'דיני עונשין',
    topic: 'שותפות לעבירה',
    difficulty: 'קשה',
    questionText: 'מהו הכלל לגבי "חריגה מכוונה משותפת" בשותפות לעבירה?',
    options: [
      { id: 'a', text: 'כל השותפים אחראים לכל תוצאה שהיא' },
      { id: 'b', text: 'שותף אחראי לחריגה רק אם הייתה צפויה במידה סבירה' },
      { id: 'c', text: 'אף שותף לא אחראי לחריגה של שותף אחר' },
      { id: 'd', text: 'רק המתכנן הראשי אחראי לחריגות' }
    ],
    correctOptionId: 'b',
    explanation: 'כאשר אחד השותפים חורג מהכוונה המשותפת, השותפים האחרים יהיו אחראים לחריגה רק אם זו הייתה צפויה כתוצאה אפשרית של המעשה המשותף. חריגה בלתי צפויה לחלוטין לא תיזקף לחובת השותפים.',
    relatedLessonId: 'criminal-law-lesson-5',
    isPublished: true,
    updatedAt: mockTimestamp()
  },

  // Topic: ניסיון
  {
    id: 'q13',
    courseId: 'criminal-law',
    subject: 'דיני עונשין',
    topic: 'ניסיון',
    difficulty: 'בינוני',
    questionText: 'מתי נחשב מעשה כ"ניסיון" לביצוע עבירה?',
    options: [
      { id: 'a', text: 'מרגע החלטה לבצע את העבירה' },
      { id: 'b', text: 'מרגע ההכנות הראשונות לביצוע' },
      { id: 'c', text: 'כאשר העבריין עבר מהכנה לביצוע ועשה מעשה שמקרב את ביצוע העבירה' },
      { id: 'd', text: 'רק כאשר העבירה נכשלה ברגע האחרון' }
    ],
    correctOptionId: 'c',
    explanation: 'ניסיון מתחיל כאשר העבריין עובר משלב ההכנה לשלב הביצוע, ועושה מעשה שמקרב באופן ממשי את ביצוע העבירה. הקו בין הכנה לניסיון נקבע לפי מבחנים שונים, כמו מבחן הקרבה והמבחן המהותי.',
    relatedLessonId: 'criminal-law-lesson-5',
    isPublished: true,
    updatedAt: mockTimestamp()
  },
  {
    id: 'q14',
    courseId: 'criminal-law',
    subject: 'דיני עונשין',
    topic: 'ניסיון',
    difficulty: 'קשה',
    questionText: 'מהו "ניסיון בלתי צליח" והאם הוא עבירה?',
    options: [
      { id: 'a', text: 'ניסיון שנכשל מסיבות טכניות - אינו עבירה' },
      { id: 'b', text: 'ניסיון שנכשל בגלל אי-אפשרות עובדתית או משפטית - כן עבירה' },
      { id: 'c', text: 'ניסיון שנכשל בגלל התערבות משטרתית - אינו עבירה' },
      { id: 'd', text: 'כל ניסיון שנכשל הוא עבירה באותה חומרה כמו העבירה המושלמת' }
    ],
    correctOptionId: 'b',
    explanation: 'ניסיון בלתי צליח הוא ניסיון שנכשל בגלל אי-אפשרות (למשל, ירי ברובה ריק). לפי הדין בישראל, גם ניסיון בלתי צליח הוא עבירה, כי הכוונה הפלילית קיימת. ההבחנה היא בין אי-אפשרות עובדתית (עבירה) לאי-אפשרות משפטית מוחלטת (לא עבירה).',
    relatedLessonId: 'criminal-law-lesson-5',
    isPublished: true,
    updatedAt: mockTimestamp()
  },

  // Topic: עבירות רכוש
  {
    id: 'q15',
    courseId: 'criminal-law',
    subject: 'דיני עונשין',
    topic: 'עבירות רכוש',
    difficulty: 'קל',
    questionText: 'מהו ההבדל העיקרי בין גניבה לגזל?',
    options: [
      { id: 'a', text: 'גניבה היא לקיחת רכוש בסתר, גזל הוא לקיחה בכוח או באיום' },
      { id: 'b', text: 'גניבה היא של חפצים קטנים, גזל הוא של חפצים גדולים' },
      { id: 'c', text: 'אין הבדל - שניהם אותה עבירה' },
      { id: 'd', text: 'גניבה היא עבירה פלילית, גזל הוא עבירה אזרחית' }
    ],
    correctOptionId: 'a',
    explanation: 'גניבה היא נטילת נכס ללא הסכמת הבעלים ובכוונה לשלול אותו ממנו. גזל כולל את אותם יסודות אך נעשה באמצעות שימוש בכוח או באיום. הגזל הוא עבירה חמורה יותר בשל האלימות המעורבת.',
    relatedLessonId: 'criminal-law-lesson-5',
    isPublished: true,
    updatedAt: mockTimestamp()
  }
];

/**
 * Get all topics available in mock questions
 */
export function getMockTopics(courseId: string): string[] {
  const topics = new Set(
    MOCK_QUESTIONS
      .filter(q => q.courseId === courseId)
      .map(q => q.topic)
  );
  return Array.from(topics).sort();
}

/**
 * Get question count by difficulty
 */
export function getMockQuestionCountByDifficulty(courseId: string): Record<string, number> {
  const counts: Record<string, number> = { 'קל': 0, 'בינוני': 0, 'קשה': 0 };
  for (const q of MOCK_QUESTIONS) {
    if (q.courseId === courseId) {
      counts[q.difficulty]++;
    }
  }
  return counts;
}
