import {
  Component,
  input,
  output,
  signal,
  inject,
  OnInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { VideoBookmark } from '@core/models/bookmark.interface';
import { BookmarksRepo } from '@core/repos/bookmarks.repo';

/**
 * Bookmarks List Component
 * Displays and manages video timestamp bookmarks
 */
@Component({
  selector: 'app-bookmarks-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bookmarks-list.component.html',
  styleUrl: './bookmarks-list.component.scss'
})
export class BookmarksListComponent implements OnInit, OnDestroy {
  private readonly bookmarksRepo = inject(BookmarksRepo);
  private readonly destroy$ = new Subject<void>();

  // Inputs
  readonly lessonId = input.required<string>();
  readonly courseId = input.required<string>();
  readonly currentTime = input<number>(0);

  // Outputs
  readonly seek = output<number>();

  // Local state
  readonly bookmarks = signal<VideoBookmark[]>([]);
  readonly isExpanded = signal(true);
  readonly editingId = signal<string | null>(null);
  readonly editingTitle = signal('');
  readonly isCreating = signal(false);
  readonly newBookmarkTitle = signal('');
  readonly pendingTimestamp = signal<number | null>(null);

  ngOnInit(): void {
    this.loadBookmarks();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadBookmarks(): void {
    this.bookmarksRepo.getBookmarksForLesson$(this.lessonId())
      .pipe(takeUntil(this.destroy$))
      .subscribe(bookmarks => this.bookmarks.set(bookmarks));
  }

  // Toggle expansion
  toggleExpanded(): void {
    this.isExpanded.update(v => !v);
  }

  // Create new bookmark
  async createBookmark(timestamp: number, title?: string): Promise<void> {
    if (this.isCreating()) return;

    this.isCreating.set(true);

    try {
      await this.bookmarksRepo.createBookmark({
        lessonId: this.lessonId(),
        courseId: this.courseId(),
        timestamp,
        title: title?.trim() || undefined
      });
      this.loadBookmarks();
      this.pendingTimestamp.set(null);
      this.newBookmarkTitle.set('');
    } catch (err) {
      console.error('Error creating bookmark:', err);
    } finally {
      this.isCreating.set(false);
    }
  }

  // Quick add bookmark at current time
  quickAddBookmark(): void {
    this.pendingTimestamp.set(this.currentTime());
  }

  // Confirm quick add
  confirmQuickAdd(): void {
    const timestamp = this.pendingTimestamp();
    if (timestamp !== null) {
      this.createBookmark(timestamp, this.newBookmarkTitle());
    }
  }

  // Cancel quick add
  cancelQuickAdd(): void {
    this.pendingTimestamp.set(null);
    this.newBookmarkTitle.set('');
  }

  // Start editing title
  startEditing(bookmark: VideoBookmark): void {
    this.editingId.set(bookmark.id);
    this.editingTitle.set(bookmark.title || '');
  }

  // Save edited title
  async saveTitle(bookmark: VideoBookmark): Promise<void> {
    const title = this.editingTitle().trim();

    try {
      await this.bookmarksRepo.updateBookmarkTitle(bookmark.id, title);
      this.cancelEditing();
      this.loadBookmarks();
    } catch (err) {
      console.error('Error updating bookmark:', err);
    }
  }

  // Cancel editing
  cancelEditing(): void {
    this.editingId.set(null);
    this.editingTitle.set('');
  }

  // Delete bookmark
  async deleteBookmark(bookmark: VideoBookmark): Promise<void> {
    if (!confirm('האם למחוק את הסימניה?')) return;

    try {
      await this.bookmarksRepo.deleteBookmark(bookmark.id);
      this.loadBookmarks();
    } catch (err) {
      console.error('Error deleting bookmark:', err);
    }
  }

  // Seek to bookmark
  onSeek(timestamp: number): void {
    this.seek.emit(timestamp);
  }

  // Format timestamp
  formatTimestamp(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Handle keyboard in input
  onInputKeydown(event: KeyboardEvent, action: 'create' | 'edit', bookmark?: VideoBookmark): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (action === 'create') {
        this.confirmQuickAdd();
      } else if (bookmark) {
        this.saveTitle(bookmark);
      }
    } else if (event.key === 'Escape') {
      if (action === 'create') {
        this.cancelQuickAdd();
      } else {
        this.cancelEditing();
      }
    }
  }
}
