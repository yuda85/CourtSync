import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Question, DIFFICULTY_COLORS } from '@core/models/question.interface';

@Component({
  selector: 'app-question-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './question-card.component.html',
  styleUrl: './question-card.component.scss'
})
export class QuestionCardComponent {
  /** The question data */
  question = input.required<Question>();

  /** Current question number (1-based) */
  questionNumber = input<number>(1);

  /** Total questions in session */
  totalQuestions = input<number>(1);

  /** Difficulty badge colors */
  readonly difficultyColors = computed(() => {
    const difficulty = this.question().difficulty;
    return DIFFICULTY_COLORS[difficulty] || DIFFICULTY_COLORS['בינוני'];
  });

  /** Progress text */
  readonly progressText = computed(() => {
    return `שאלה ${this.questionNumber()} מתוך ${this.totalQuestions()}`;
  });
}
