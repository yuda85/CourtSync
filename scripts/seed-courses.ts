/**
 * Seed script to add sample courses to Firestore
 * Run with: npx ts-node scripts/seed-courses.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Firebase config - copy from your environment.ts
const firebaseConfig = {
  apiKey: "AIzaSyCJLsperKp4JNFG8X0pm4mWCes96xJnPHo",
  authDomain: "courtsync-d1bfe.firebaseapp.com",
  projectId: "courtsync-d1bfe",
  storageBucket: "courtsync-d1bfe.firebasestorage.app",
  messagingSenderId: "1098270313498",
  appId: "1:1098270313498:web:9e38a3788a3ead51ea8b79"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const courses = [
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
• המחאת זכויות וחובות
• סיכול חוזה

כולל ניתוח מעמיק של פסקי דין מרכזיים ושאלות בחינה.`,
    priceIls: 199,
    durationMinutes: 600,
    isPublished: true,
    isFeatured: true,
    featuredOrder: 2,
    creatorUid: 'system',
    creatorName: 'CourtSync',
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
• עדות שמיעה והחריגים לה
• חסיונות - עורך דין-לקוח, רופא-מטופל
• הודאות נאשם
• ראיות פורנזיות ומדעיות
• ראיות דיגיטליות

דגש על יישום מעשי בבתי המשפט.`,
    priceIls: 179,
    durationMinutes: 480,
    isPublished: true,
    isFeatured: true,
    featuredOrder: 3,
    creatorUid: 'system',
    creatorName: 'CourtSync',
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
• דיון מקדמי וניהול תיק
• הוכחות והבאת ראיות
• סיכומים ופסק דין
• ערעור וערעור ברשות
• הליכי ביניים - סעדים זמניים
• הוצאה לפועל

כולל תרגול מעשי של כתיבת כתבי בי-דין.`,
    priceIls: 169,
    durationMinutes: 540,
    isPublished: true,
    isFeatured: true,
    featuredOrder: 4,
    creatorUid: 'system',
    creatorName: 'CourtSync',
  }
];

async function seedCourses() {
  console.log('Starting to seed courses...');

  const coursesCollection = collection(db, 'courses');

  for (const course of courses) {
    try {
      const docRef = await addDoc(coursesCollection, {
        ...course,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log(`✅ Created course: ${course.title} (ID: ${docRef.id})`);
    } catch (error) {
      console.error(`❌ Error creating course ${course.title}:`, error);
    }
  }

  console.log('\nDone seeding courses!');
  process.exit(0);
}

seedCourses();
