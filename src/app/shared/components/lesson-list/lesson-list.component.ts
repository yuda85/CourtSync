import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Lesson } from '@core/models/lesson.interface';

@Component({
  selector: 'app-lesson-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lesson-list.component.html',
  styleUrl: './lesson-list.component.scss'
})
export class LessonListComponent {
  @Input() lessons: Lesson[] = [];
  @Input() completedLessons: string[] = [];
  @Input() currentLessonId?: string;

  @Output() lessonClick = new EventEmitter<Lesson>();

  isCompleted(lessonId: string): boolean {
    return this.completedLessons.includes(lessonId);
  }

  isCurrent(lessonId: string): boolean {
    return this.currentLessonId === lessonId;
  }

  onLessonClick(lesson: Lesson): void {
    this.lessonClick.emit(lesson);
  }

  getTypeIcon(type: Lesson['type']): string {
    switch (type) {
      case 'video':
        return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>`;
      case 'text':
        return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;
      case 'quiz':
        return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
      default:
        return '';
    }
  }

  formatDuration(minutes?: number): string {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes} דק׳`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} שעות ${mins} דק׳` : `${hours} שעות`;
  }
}
