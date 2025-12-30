import { Component, inject, computed, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { PracticeSessionService } from '@core/services/practice-session.service';
import { OPTION_LETTERS } from '@core/models/question.interface';
import { QuestionCardComponent } from '@shared/components/question-card/question-card.component';
import { AnswerOptionComponent } from '@shared/components/answer-option/answer-option.component';
import { ExplanationBoxComponent } from '@shared/components/explanation-box/explanation-box.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { ProgressBarComponent } from '@shared/components/progress-bar/progress-bar.component';

@Component({
  selector: 'app-practice-session',
  standalone: true,
  imports: [
    CommonModule,
    QuestionCardComponent,
    AnswerOptionComponent,
    ExplanationBoxComponent,
    ButtonComponent,
    ProgressBarComponent
  ],
  templateUrl: './practice-session.component.html',
  styleUrl: './practice-session.component.scss'
})
export class PracticeSessionComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly practiceService = inject(PracticeSessionService);
  private readonly destroy$ = new Subject<void>();

  /** Hebrew letters for options */
  readonly optionLetters = OPTION_LETTERS;

  /** Course ID from route */
  readonly courseId = signal<string>('');

  /** Lesson ID from route (optional - for lesson-specific practice) */
  readonly lessonId = signal<string>('');

  /** Loading state for checking answer */
  readonly isChecking = signal(false);

  /** Related lesson for current question */
  readonly relatedLesson = signal<{ id: string; title: string } | null>(null);

  /** Computed: current question from service */
  readonly currentQuestion = computed(() => this.practiceService.currentQuestion());

  /** Computed: session exists and has questions */
  readonly hasSession = computed(() =>
    this.practiceService.totalQuestions() > 0
  );

  /** Computed: answer result after checking */
  readonly answerResult = computed(() => this.practiceService.currentAnswerResult());

  /** Computed: whether answer has been checked */
  readonly hasChecked = computed(() => this.answerResult() !== null);

  /** Computed: can submit (answer selected and not yet checked) */
  readonly canSubmit = computed(() =>
    this.practiceService.selectedAnswer() !== null &&
    !this.hasChecked() &&
    !this.isChecking()
  );

  /** Computed: button text for next action */
  readonly nextButtonText = computed(() =>
    this.practiceService.isLastQuestion() ? 'סיום' : 'שאלה הבאה'
  );

  /** Computed: button icon for next action */
  readonly nextButtonIcon = computed(() =>
    this.practiceService.isLastQuestion() ? 'check_circle' : 'arrow_back'
  );

  ngOnInit(): void {
    // Get course ID and optional lesson ID from route
    this.route.paramMap.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const id = params.get('id');
      const lessonId = params.get('lessonId');
      if (id) {
        this.courseId.set(id);
        this.lessonId.set(lessonId || '');
      }
    });

    // Check if session exists, if not redirect back
    if (!this.hasSession()) {
      const courseId = this.route.snapshot.paramMap.get('id');
      const lessonId = this.route.snapshot.paramMap.get('lessonId');
      if (courseId) {
        if (lessonId) {
          this.router.navigate(['/app/courses', courseId, 'learn', lessonId, 'practice']);
        } else {
          this.router.navigate(['/app/courses', courseId, 'practice']);
        }
      } else {
        this.router.navigate(['/app/profile']);
      }
      return;
    }

    // Load related lesson for current question
    this.loadRelatedLesson();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Load related lesson info */
  private loadRelatedLesson(): void {
    const question = this.currentQuestion();
    if (question?.relatedLessonId) {
      this.practiceService.getRelatedLesson$(question.id).pipe(
        takeUntil(this.destroy$)
      ).subscribe(lesson => {
        this.relatedLesson.set(lesson);
      });
    } else {
      this.relatedLesson.set(null);
    }
  }

  /** Handle answer option click */
  onOptionSelect(optionId: string): void {
    if (!this.hasChecked()) {
      this.practiceService.selectAnswer(optionId);
    }
  }

  /** Check the answer */
  async onCheckAnswer(): Promise<void> {
    if (!this.canSubmit()) return;

    this.isChecking.set(true);

    try {
      await this.practiceService.submitAnswer();
      // After checking, load related lesson
      this.loadRelatedLesson();
    } finally {
      this.isChecking.set(false);
    }
  }

  /** Go to next question or finish */
  onNextQuestion(): void {
    if (this.practiceService.isLastQuestion()) {
      // Complete and go to summary
      this.practiceService.completeSession();
      const lessonId = this.lessonId();
      if (lessonId) {
        this.router.navigate(['/app/courses', this.courseId(), 'learn', lessonId, 'practice', 'summary']);
      } else {
        this.router.navigate(['/app/courses', this.courseId(), 'practice', 'summary']);
      }
    } else {
      // Go to next question
      this.practiceService.nextQuestion();
      // Clear related lesson and load new one
      this.relatedLesson.set(null);
      this.loadRelatedLesson();
    }
  }

  /** Navigate to related lesson */
  onNavigateToLesson(lessonId: string): void {
    this.router.navigate(['/app/courses', this.courseId(), 'learn', lessonId]);
  }

  /** Exit session */
  onExitSession(): void {
    const confirm = window.confirm('האם אתה בטוח שברצונך לצאת? ההתקדמות הנוכחית תישמר.');
    if (confirm) {
      this.practiceService.completeSession();
      const lessonId = this.lessonId();
      if (lessonId) {
        this.router.navigate(['/app/courses', this.courseId(), 'learn', lessonId, 'practice', 'summary']);
      } else {
        this.router.navigate(['/app/courses', this.courseId(), 'practice', 'summary']);
      }
    }
  }

  /** Check if option is selected */
  isOptionSelected(optionId: string): boolean {
    return this.practiceService.selectedAnswer() === optionId;
  }

  /** Check if option is the correct one (for reveal) */
  isCorrectOption(optionId: string): boolean {
    const result = this.answerResult();
    return result ? optionId === result.correctOptionId : false;
  }

  /** Get answer correctness for option (null if not checked) */
  getOptionCorrectness(optionId: string): boolean | null {
    const result = this.answerResult();
    if (!result) return null;

    // Only show correctness for the selected option
    if (this.isOptionSelected(optionId)) {
      return result.isCorrect;
    }

    return null;
  }
}
