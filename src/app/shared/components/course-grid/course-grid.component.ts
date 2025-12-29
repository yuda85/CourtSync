import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Course } from '@core/models/course.interface';
import { CourseCardComponent } from '../course-card/course-card.component';

@Component({
  selector: 'app-course-grid',
  standalone: true,
  imports: [CommonModule, CourseCardComponent],
  templateUrl: './course-grid.component.html',
  styleUrl: './course-grid.component.scss'
})
export class CourseGridComponent {
  /** Array of courses to display */
  courses = input<Course[]>([]);

  /** Whether data is loading */
  loading = input(false);

  /** Message to show when no courses found */
  emptyMessage = input('לא נמצאו קורסים');

  /** Whether to show prices on cards */
  showPrices = input(true);

  /** Whether to use compact card mode */
  compact = input(false);

  /** Number of skeleton cards to show while loading */
  skeletonCount = input(6);

  /** Emitted when a course card is clicked */
  courseClick = output<Course>();

  /** Handle course card click */
  onCourseClick(course: Course): void {
    this.courseClick.emit(course);
  }

  /** Track function for ngFor */
  trackByCourseId(index: number, course: Course): string {
    return course.id;
  }

  /** Generate skeleton array for loading state */
  get skeletonArray(): number[] {
    return Array.from({ length: this.skeletonCount() }, (_, i) => i);
  }

  /** Check if grid is empty */
  get isEmpty(): boolean {
    return !this.loading() && this.courses().length === 0;
  }
}
