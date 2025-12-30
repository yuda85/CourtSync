import {
  Component,
  input,
  output,
  signal,
  computed,
  inject,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Note } from '@core/models/note.interface';
import { NotesService } from '@core/services/notes.service';

/**
 * Notes Panel Component
 * Allows users to create and manage notes for lessons
 * Supports video timestamp linking and course-wide notes
 */
@Component({
  selector: 'app-notes-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notes-panel.component.html',
  styleUrl: './notes-panel.component.scss'
})
export class NotesPanelComponent implements OnInit, OnDestroy {
  private readonly notesService = inject(NotesService);
  private readonly destroy$ = new Subject<void>();

  @ViewChild('noteInput') noteInputRef!: ElementRef<HTMLTextAreaElement>;

  // Inputs
  readonly courseId = input.required<string>();
  readonly lessonId = input<string>('');
  readonly currentVideoTime = input<number>(0);
  readonly isVideoLesson = input<boolean>(false);
  readonly isExpanded = input<boolean>(false);

  // Outputs
  readonly timestampClick = output<number>();
  readonly expandedChange = output<boolean>();

  // Local state
  readonly activeTab = signal<'lesson' | 'course'>('lesson');
  readonly lessonNotes = signal<Note[]>([]);
  readonly courseNotes = signal<Note[]>([]);
  readonly newNoteContent = signal('');
  readonly includeTimestamp = signal(false);
  readonly isCreating = signal(false);
  readonly editingNoteId = signal<string | null>(null);
  readonly editingContent = signal('');
  readonly isSaving = signal(false);

  // Computed
  readonly currentNotes = computed(() => {
    return this.activeTab() === 'lesson' ? this.lessonNotes() : this.courseNotes();
  });

  readonly hasNotes = computed(() => this.currentNotes().length > 0);

  readonly lessonNotesCount = computed(() => this.lessonNotes().length);
  readonly courseNotesCount = computed(() => this.courseNotes().length);

  ngOnInit(): void {
    this.loadNotes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadNotes(): void {
    const courseId = this.courseId();
    const lessonId = this.lessonId();

    // Load lesson notes
    if (lessonId) {
      this.notesService.getNotesForLesson$(courseId, lessonId)
        .pipe(takeUntil(this.destroy$))
        .subscribe(notes => this.lessonNotes.set(notes));
    }

    // Load course notes
    this.notesService.getCourseWideNotes$(courseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(notes => this.courseNotes.set(notes));
  }

  // Tab switching
  setActiveTab(tab: 'lesson' | 'course'): void {
    this.activeTab.set(tab);
    this.cancelEditing();
  }

  // Toggle panel expansion
  toggleExpanded(): void {
    this.expandedChange.emit(!this.isExpanded());
  }

  // Create new note
  async createNote(): Promise<void> {
    const content = this.newNoteContent().trim();
    if (!content || this.isCreating()) return;

    this.isCreating.set(true);

    try {
      const courseId = this.courseId();

      if (this.activeTab() === 'lesson' && this.lessonId()) {
        const timestamp = this.includeTimestamp() && this.isVideoLesson()
          ? this.currentVideoTime()
          : undefined;

        await this.notesService.createLessonNote(
          courseId,
          this.lessonId(),
          content,
          timestamp
        );
      } else {
        await this.notesService.createCourseNote(courseId, content);
      }

      this.newNoteContent.set('');
      this.includeTimestamp.set(false);
      this.loadNotes();
    } catch (err) {
      console.error('Error creating note:', err);
    } finally {
      this.isCreating.set(false);
    }
  }

  // Start editing a note
  startEditing(note: Note): void {
    this.editingNoteId.set(note.id);
    this.editingContent.set(note.content);
  }

  // Cancel editing
  cancelEditing(): void {
    this.editingNoteId.set(null);
    this.editingContent.set('');
  }

  // Save edited note
  async saveEdit(note: Note): Promise<void> {
    const content = this.editingContent().trim();
    if (!content || this.isSaving()) return;

    this.isSaving.set(true);

    try {
      await this.notesService.updateNote(
        note.id,
        content,
        this.courseId(),
        note.lessonId,
        note.videoTimestamp
      );
      this.cancelEditing();
      this.loadNotes();
    } catch (err) {
      console.error('Error updating note:', err);
    } finally {
      this.isSaving.set(false);
    }
  }

  // Delete note
  async deleteNote(note: Note): Promise<void> {
    if (!confirm('האם למחוק את ההערה?')) return;

    try {
      await this.notesService.deleteNote(note.id, this.courseId(), note.lessonId);
      this.loadNotes();
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  }

  // Handle timestamp click
  onTimestampClick(timestamp: number): void {
    this.timestampClick.emit(timestamp);
  }

  // Add timestamp to current note
  addTimestampToNote(): void {
    this.includeTimestamp.set(true);
  }

  // Format timestamp for display
  formatTimestamp(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Format date for display
  formatDate(timestamp: any): string {
    if (!timestamp) return '';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return 'היום';
    } else if (days === 1) {
      return 'אתמול';
    } else if (days < 7) {
      return `לפני ${days} ימים`;
    } else {
      return date.toLocaleDateString('he-IL', {
        day: 'numeric',
        month: 'short'
      });
    }
  }

  // Focus the input
  focusInput(): void {
    setTimeout(() => {
      this.noteInputRef?.nativeElement?.focus();
    }, 100);
  }

  // Handle keyboard in textarea
  onTextareaKeydown(event: KeyboardEvent): void {
    // Ctrl/Cmd + Enter to save
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      if (this.editingNoteId()) {
        const note = this.currentNotes().find(n => n.id === this.editingNoteId());
        if (note) this.saveEdit(note);
      } else {
        this.createNote();
      }
    }
  }
}
