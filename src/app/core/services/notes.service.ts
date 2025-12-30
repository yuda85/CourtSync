import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';
import { NotesRepo } from '@core/repos/notes.repo';
import { Note, CreateNotePayload, UpdateNotePayload } from '@core/models/note.interface';

/**
 * Notes Service
 * Orchestrates notes repository with caching and state management
 */
@Injectable({
  providedIn: 'root'
})
export class NotesService {
  private readonly notesRepo = inject(NotesRepo);

  /** Cache for course notes */
  private notesCache = new Map<string, Observable<Note[]>>();

  /** Signal for optimistic updates */
  private readonly pendingOperations = signal<Set<string>>(new Set());

  /**
   * Get all notes for a course (cached)
   */
  getNotesForCourse$(courseId: string): Observable<Note[]> {
    const cacheKey = `course:${courseId}`;
    if (!this.notesCache.has(cacheKey)) {
      this.notesCache.set(
        cacheKey,
        this.notesRepo.getNotesForCourse$(courseId).pipe(
          shareReplay({ bufferSize: 1, refCount: true })
        )
      );
    }
    return this.notesCache.get(cacheKey)!;
  }

  /**
   * Get notes for a specific lesson
   */
  getNotesForLesson$(courseId: string, lessonId: string): Observable<Note[]> {
    const cacheKey = `lesson:${courseId}:${lessonId}`;
    if (!this.notesCache.has(cacheKey)) {
      this.notesCache.set(
        cacheKey,
        this.notesRepo.getNotesForLesson$(courseId, lessonId).pipe(
          shareReplay({ bufferSize: 1, refCount: true })
        )
      );
    }
    return this.notesCache.get(cacheKey)!;
  }

  /**
   * Get course-wide notes (not attached to specific lessons)
   */
  getCourseWideNotes$(courseId: string): Observable<Note[]> {
    return this.notesRepo.getCourseWideNotes$(courseId);
  }

  /**
   * Create a note for a specific lesson
   */
  async createLessonNote(
    courseId: string,
    lessonId: string,
    content: string,
    videoTimestamp?: number
  ): Promise<string> {
    const payload: CreateNotePayload = {
      courseId,
      lessonId,
      content,
      videoTimestamp
    };

    const noteId = await this.notesRepo.createNote(payload);
    this.invalidateCache(courseId, lessonId);
    return noteId;
  }

  /**
   * Create a course-wide note
   */
  async createCourseNote(courseId: string, content: string): Promise<string> {
    const payload: CreateNotePayload = {
      courseId,
      content
    };

    const noteId = await this.notesRepo.createNote(payload);
    this.invalidateCache(courseId);
    return noteId;
  }

  /**
   * Update an existing note
   */
  async updateNote(
    noteId: string,
    content: string,
    courseId: string,
    lessonId?: string,
    videoTimestamp?: number
  ): Promise<void> {
    const payload: UpdateNotePayload = {
      content,
      videoTimestamp
    };

    await this.notesRepo.updateNote(noteId, payload);
    this.invalidateCache(courseId, lessonId);
  }

  /**
   * Delete a note
   */
  async deleteNote(noteId: string, courseId: string, lessonId?: string): Promise<void> {
    await this.notesRepo.deleteNote(noteId);
    this.invalidateCache(courseId, lessonId);
  }

  /**
   * Clear cache for a course or lesson
   */
  private invalidateCache(courseId: string, lessonId?: string): void {
    this.notesCache.delete(`course:${courseId}`);
    if (lessonId) {
      this.notesCache.delete(`lesson:${courseId}:${lessonId}`);
    }
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.notesCache.clear();
  }
}
