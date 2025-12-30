import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnswerOption } from '@core/models/question.interface';

@Component({
  selector: 'app-answer-option',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './answer-option.component.html',
  styleUrl: './answer-option.component.scss'
})
export class AnswerOptionComponent {
  /** The answer option data */
  option = input.required<AnswerOption>();

  /** Whether this option is currently selected */
  isSelected = input(false);

  /** Whether answer has been revealed (null = not revealed) */
  isCorrect = input<boolean | null>(null);

  /** Whether this specific option is the correct one (for showing after reveal) */
  isTheCorrectAnswer = input(false);

  /** Whether the option is disabled (after answering) */
  isDisabled = input(false);

  /** Hebrew letter for this option (א, ב, ג, ד) */
  optionLetter = input<string>('');

  /** Emitted when option is clicked */
  optionClick = output<string>();

  /** Compute the visual state class */
  readonly stateClass = computed(() => {
    const revealed = this.isCorrect() !== null;
    const selected = this.isSelected();
    const correct = this.isCorrect();
    const isCorrectAnswer = this.isTheCorrectAnswer();

    if (!revealed) {
      // Not yet checked
      return selected ? 'answer-option--selected' : '';
    }

    // After reveal
    if (selected) {
      return correct ? 'answer-option--correct' : 'answer-option--incorrect';
    }

    // Not selected but is the correct answer (show it)
    if (isCorrectAnswer) {
      return 'answer-option--correct-reveal';
    }

    return 'answer-option--dimmed';
  });

  /** Handle click */
  onClick(): void {
    if (!this.isDisabled()) {
      this.optionClick.emit(this.option().id);
    }
  }

  /** Handle keyboard */
  onKeydown(event: KeyboardEvent): void {
    if ((event.key === 'Enter' || event.key === ' ') && !this.isDisabled()) {
      event.preventDefault();
      this.onClick();
    }
  }
}
