import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-explanation-box',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './explanation-box.component.html',
  styleUrl: './explanation-box.component.scss'
})
export class ExplanationBoxComponent {
  /** The explanation text */
  explanation = input.required<string>();

  /** Whether the user answered correctly */
  isCorrect = input.required<boolean>();

  /** Related lesson info (optional) */
  relatedLesson = input<{ id: string; title: string } | null>(null);

  /** Course ID for lesson navigation */
  courseId = input<string>('');

  /** Emitted when user clicks to navigate to lesson */
  navigateToLesson = output<string>();

  /** Handle lesson link click */
  onLessonClick(): void {
    const lesson = this.relatedLesson();
    if (lesson) {
      this.navigateToLesson.emit(lesson.id);
    }
  }
}
