import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  Firestore,
  collection,
  doc,
  collectionData,
  docData,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from '@angular/fire/firestore';
import { Section } from '@core/models/section.interface';

/**
 * Sample sections for mock data
 */
const CRIMINAL_LAW_SECTIONS: Section[] = [
  {
    id: 'section-1',
    courseId: 'criminal-law',
    title: 'מבוא ויסודות',
    description: 'הכרות עם המשפט הפלילי ועקרונות היסוד',
    order: 1
  },
  {
    id: 'section-2',
    courseId: 'criminal-law',
    title: 'עבירות ספציפיות',
    description: 'סקירה של עבירות נפוצות ויסודותיהן',
    order: 2
  },
  {
    id: 'section-3',
    courseId: 'criminal-law',
    title: 'סיכום ותרגול',
    description: 'חזרה על החומר ותרגול לקראת מבחן',
    order: 3
  }
];

/**
 * Sections Repository
 * Manages course sections/modules in Firestore
 * Path: /courses/{courseId}/sections/{sectionId}
 */
@Injectable({
  providedIn: 'root'
})
export class SectionsRepo {
  private readonly firestore = inject(Firestore);

  /**
   * Mock sections indexed by courseId
   */
  private readonly mockSections: Record<string, Section[]> = {
    'criminal-law': CRIMINAL_LAW_SECTIONS
  };

  /**
   * Get all sections for a course, ordered by their order field
   */
  getSectionsForCourse$(courseId: string): Observable<Section[]> {
    // Check for mock data first
    if (this.mockSections[courseId]) {
      return of(this.mockSections[courseId]);
    }

    // Fallback to Firestore
    const sectionsRef = collection(this.firestore, `courses/${courseId}/sections`);
    const q = query(sectionsRef, orderBy('order', 'asc'));

    return collectionData(q, { idField: 'id' }).pipe(
      map(docs => docs as Section[]),
      catchError(err => {
        console.error('Error fetching sections:', err);
        return of([]);
      })
    );
  }

  /**
   * Get a single section by ID
   */
  getSection$(courseId: string, sectionId: string): Observable<Section | null> {
    // Check mock data first
    const mockCourse = this.mockSections[courseId];
    if (mockCourse) {
      const found = mockCourse.find(s => s.id === sectionId);
      if (found) {
        return of(found);
      }
    }

    // Fallback to Firestore
    const sectionRef = doc(this.firestore, `courses/${courseId}/sections/${sectionId}`);

    return docData(sectionRef, { idField: 'id' }).pipe(
      map(doc => (doc ? (doc as Section) : null)),
      catchError(err => {
        console.error('Error fetching section:', err);
        return of(null);
      })
    );
  }

  /**
   * Create a new section
   */
  async createSection(section: Omit<Section, 'id' | 'createdAt'>): Promise<string> {
    const sectionsRef = collection(this.firestore, `courses/${section.courseId}/sections`);
    const newDocRef = doc(sectionsRef);

    await setDoc(newDocRef, {
      ...section,
      createdAt: serverTimestamp()
    });

    return newDocRef.id;
  }

  /**
   * Update a section
   */
  async updateSection(
    courseId: string,
    sectionId: string,
    updates: Partial<Omit<Section, 'id' | 'courseId' | 'createdAt'>>
  ): Promise<void> {
    const sectionRef = doc(this.firestore, `courses/${courseId}/sections/${sectionId}`);
    await setDoc(sectionRef, updates, { merge: true });
  }

  /**
   * Delete a section
   */
  async deleteSection(courseId: string, sectionId: string): Promise<void> {
    const sectionRef = doc(this.firestore, `courses/${courseId}/sections/${sectionId}`);
    await deleteDoc(sectionRef);
  }
}
