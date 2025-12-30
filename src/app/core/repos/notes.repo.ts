import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, switchMap, catchError, shareReplay } from 'rxjs/operators';
import { Auth, authState, User } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  doc,
  collectionData,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from '@angular/fire/firestore';
import { Note, CreateNotePayload, UpdateNotePayload } from '@core/models/note.interface';

/**
 * Notes Repository
 * Manages user notes in Firestore
 * Path: /users/{uid}/notes/{noteId}
 */
@Injectable({
  providedIn: 'root'
})
export class NotesRepo {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);

  /** Cached auth state observable */
  private readonly authState$: Observable<User | null>;

  constructor() {
    this.authState$ = authState(this.auth).pipe(
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  /**
   * Get notes collection reference for current user
   */
  private getNotesRef(uid: string) {
    return collection(this.firestore, `users/${uid}/notes`);
  }

  /**
   * Get all notes for a course (both lesson-specific and course-wide)
   */
  getNotesForCourse$(courseId: string): Observable<Note[]> {
    return this.authState$.pipe(
      switchMap(user => {
        if (!user) {
          return of([]);
        }

        const notesRef = this.getNotesRef(user.uid);
        const q = query(
          notesRef,
          where('courseId', '==', courseId),
          orderBy('updatedAt', 'desc')
        );

        return collectionData(q, { idField: 'id' }).pipe(
          map(docs => docs as Note[]),
          catchError(err => {
            console.error('Error fetching course notes:', err);
            return of([]);
          })
        );
      })
    );
  }

  /**
   * Get notes for a specific lesson
   */
  getNotesForLesson$(courseId: string, lessonId: string): Observable<Note[]> {
    return this.authState$.pipe(
      switchMap(user => {
        if (!user) {
          return of([]);
        }

        const notesRef = this.getNotesRef(user.uid);
        const q = query(
          notesRef,
          where('courseId', '==', courseId),
          where('lessonId', '==', lessonId),
          orderBy('updatedAt', 'desc')
        );

        return collectionData(q, { idField: 'id' }).pipe(
          map(docs => docs as Note[]),
          catchError(err => {
            console.error('Error fetching lesson notes:', err);
            return of([]);
          })
        );
      })
    );
  }

  /**
   * Get course-wide notes (notes without a lessonId)
   */
  getCourseWideNotes$(courseId: string): Observable<Note[]> {
    return this.getNotesForCourse$(courseId).pipe(
      map(notes => notes.filter(n => !n.lessonId))
    );
  }

  /**
   * Create a new note
   */
  async createNote(payload: CreateNotePayload): Promise<string> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const notesRef = this.getNotesRef(user.uid);
    const newDocRef = doc(notesRef);

    // Build note object, filtering out undefined fields
    const note: Record<string, any> = {
      courseId: payload.courseId,
      content: payload.content,
      userId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Only include optional fields if they have values
    if (payload.lessonId !== undefined) {
      note['lessonId'] = payload.lessonId;
    }
    if (payload.videoTimestamp !== undefined) {
      note['videoTimestamp'] = payload.videoTimestamp;
    }

    await setDoc(newDocRef, note);
    return newDocRef.id;
  }

  /**
   * Update a note
   */
  async updateNote(noteId: string, payload: UpdateNotePayload): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const noteRef = doc(this.firestore, `users/${user.uid}/notes/${noteId}`);
    await setDoc(noteRef, {
      ...payload,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  /**
   * Delete a note
   */
  async deleteNote(noteId: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const noteRef = doc(this.firestore, `users/${user.uid}/notes/${noteId}`);
    await deleteDoc(noteRef);
  }
}
