import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, combineLatest, of, BehaviorSubject } from 'rxjs';
import { map, switchMap, tap, take, shareReplay, catchError } from 'rxjs/operators';
import { QuestionsRepo } from '@core/repos/questions.repo';
import { QuestionAttemptsRepo } from '@core/repos/question-attempts.repo';
import { LessonsRepo } from '@core/repos/lessons.repo';
import {
  Question,
  PracticeFilters,
  PracticeSessionConfig,
  PracticeSessionState,
  PracticeSessionSummary,
  TopicPerformance,
  SessionAnswer
} from '@core/models/question.interface';

@Injectable({
  providedIn: 'root'
})
export class PracticeSessionService {
  private readonly questionsRepo = inject(QuestionsRepo);
  private readonly attemptsRepo = inject(QuestionAttemptsRepo);
  private readonly lessonsRepo = inject(LessonsRepo);
  private readonly router = inject(Router);

  /** Session state signal */
  private readonly sessionState = signal<PracticeSessionState | null>(null);

  /** Topics cache per course */
  private topicsCache = new Map<string, Observable<string[]>>();

  // =======================================
  // PUBLIC COMPUTED SIGNALS
  // =======================================

  /** Current question */
  readonly currentQuestion = computed(() => {
    const state = this.sessionState();
    if (!state || state.questions.length === 0) return null;
    return state.questions[state.currentIndex] ?? null;
  });

  /** Current question index (1-based for display) */
  readonly currentQuestionNumber = computed(() => {
    const state = this.sessionState();
    return state ? state.currentIndex + 1 : 0;
  });

  /** Total questions in session */
  readonly totalQuestions = computed(() => {
    const state = this.sessionState();
    return state?.questions.length ?? 0;
  });

  /** Progress percentage (based on answered questions) */
  readonly progressPercent = computed(() => {
    const state = this.sessionState();
    if (!state || state.questions.length === 0) return 0;
    return Math.round((state.answers.size / state.questions.length) * 100);
  });

  /** Whether session is complete */
  readonly isComplete = computed(() => this.sessionState()?.isComplete ?? false);

  /** Selected answer for current question (before checking) */
  readonly selectedAnswer = signal<string | null>(null);

  /** Whether current question has been answered and checked */
  readonly hasAnswered = computed(() => {
    const state = this.sessionState();
    const question = this.currentQuestion();
    if (!state || !question) return false;
    return state.answers.has(question.id);
  });

  /** Answer result for current question (after checking) */
  readonly currentAnswerResult = computed((): { isCorrect: boolean; correctOptionId: string } | null => {
    const state = this.sessionState();
    const question = this.currentQuestion();
    if (!state || !question) return null;

    const answer = state.answers.get(question.id);
    if (!answer) return null;

    return {
      isCorrect: answer.isCorrect,
      correctOptionId: question.correctOptionId
    };
  });

  /** Course ID for current session */
  readonly courseId = computed(() => this.sessionState()?.config.courseId ?? '');

  /** Lesson ID for current session (optional - only for lesson-specific practice) */
  readonly lessonId = computed(() => this.sessionState()?.config.lessonId ?? '');

  /** Check if this is the last question */
  readonly isLastQuestion = computed(() => {
    const state = this.sessionState();
    if (!state) return false;
    return state.currentIndex >= state.questions.length - 1;
  });

  // =======================================
  // PUBLIC METHODS
  // =======================================

  /**
   * Get available topics for a course (with caching)
   */
  getTopics$(courseId: string): Observable<string[]> {
    if (!this.topicsCache.has(courseId)) {
      this.topicsCache.set(
        courseId,
        this.questionsRepo.getTopics$(courseId).pipe(
          shareReplay({ bufferSize: 1, refCount: true })
        )
      );
    }
    return this.topicsCache.get(courseId)!;
  }

  /**
   * Get question count preview for filters
   */
  getQuestionCount$(courseId: string, filters: PracticeFilters): Observable<number> {
    if (filters.onlyMistakes) {
      // Need to intersect with incorrect question IDs
      return combineLatest([
        this.questionsRepo.getQuestions$(courseId, filters),
        this.attemptsRepo.getIncorrectQuestionIds$(courseId)
      ]).pipe(
        map(([questions, incorrectIds]) => {
          const incorrectSet = new Set(incorrectIds);
          return questions.filter(q => incorrectSet.has(q.id)).length;
        })
      );
    }
    return this.questionsRepo.getQuestionCount$(courseId, filters);
  }

  /**
   * Start a new practice session
   * Fetches questions based on config and initializes session state
   */
  startSession$(config: PracticeSessionConfig): Observable<boolean> {
    // Reset previous state
    this.resetSession();

    let questions$: Observable<Question[]>;

    if (config.filters.onlyMistakes) {
      // Filter to only incorrect questions
      questions$ = combineLatest([
        this.questionsRepo.getQuestions$(config.courseId, config.filters),
        this.attemptsRepo.getIncorrectQuestionIds$(config.courseId)
      ]).pipe(
        map(([questions, incorrectIds]) => {
          const incorrectSet = new Set(incorrectIds);
          return questions.filter(q => incorrectSet.has(q.id));
        })
      );
    } else {
      questions$ = this.questionsRepo.getQuestions$(config.courseId, config.filters);
    }

    return questions$.pipe(
      take(1),
      map(questions => {
        if (questions.length === 0) {
          return false;
        }

        // Shuffle questions
        const shuffled = this.shuffleQuestions(questions);

        // Limit to questionCount if specified
        const limited = config.questionCount
          ? shuffled.slice(0, config.questionCount)
          : shuffled;

        // Initialize session state
        this.sessionState.set({
          config,
          questions: limited,
          currentIndex: 0,
          answers: new Map(),
          isComplete: false
        });

        return true;
      }),
      catchError(err => {
        console.error('Error starting session:', err);
        return of(false);
      })
    );
  }

  /**
   * Select an answer (before checking)
   */
  selectAnswer(optionId: string): void {
    if (!this.hasAnswered()) {
      this.selectedAnswer.set(optionId);
    }
  }

  /**
   * Submit and check the answer for current question
   * Records the attempt and stores the result
   */
  async submitAnswer(): Promise<boolean> {
    const state = this.sessionState();
    const question = this.currentQuestion();
    const selected = this.selectedAnswer();

    if (!state || !question || !selected) {
      return false;
    }

    // Check if already answered
    if (state.answers.has(question.id)) {
      return state.answers.get(question.id)!.isCorrect;
    }

    const isCorrect = selected === question.correctOptionId;

    // Record attempt to Firestore
    try {
      await this.attemptsRepo.recordAttempt({
        questionId: question.id,
        courseId: state.config.courseId,
        selectedOptionId: selected,
        isCorrect
      });
    } catch (err) {
      console.error('Error recording attempt:', err);
      // Continue even if recording fails
    }

    // Update session state with answer
    const newAnswers = new Map(state.answers);
    newAnswers.set(question.id, { selectedOptionId: selected, isCorrect });

    this.sessionState.set({
      ...state,
      answers: newAnswers
    });

    return isCorrect;
  }

  /**
   * Navigate to next question
   */
  nextQuestion(): void {
    const state = this.sessionState();
    if (!state) return;

    const nextIndex = state.currentIndex + 1;

    if (nextIndex >= state.questions.length) {
      // Session complete
      this.sessionState.set({
        ...state,
        isComplete: true
      });
    } else {
      this.sessionState.set({
        ...state,
        currentIndex: nextIndex
      });
      // Clear selected answer for new question
      this.selectedAnswer.set(null);
    }
  }

  /**
   * Navigate to previous question (for review)
   */
  previousQuestion(): void {
    const state = this.sessionState();
    if (!state || state.currentIndex <= 0) return;

    this.sessionState.set({
      ...state,
      currentIndex: state.currentIndex - 1
    });

    // Load the selected answer for this question if it exists
    const prevQuestion = state.questions[state.currentIndex - 1];
    const prevAnswer = state.answers.get(prevQuestion.id);
    this.selectedAnswer.set(prevAnswer?.selectedOptionId ?? null);
  }

  /**
   * Complete the session (mark as finished)
   */
  completeSession(): void {
    const state = this.sessionState();
    if (!state) return;

    this.sessionState.set({
      ...state,
      isComplete: true
    });
  }

  /**
   * Get session summary
   */
  getSummary(): PracticeSessionSummary | null {
    const state = this.sessionState();
    if (!state) return null;

    const totalQuestions = state.questions.length;
    let correctCount = 0;

    for (const answer of state.answers.values()) {
      if (answer.isCorrect) {
        correctCount++;
      }
    }

    const percentage = totalQuestions > 0
      ? Math.round((correctCount / totalQuestions) * 100)
      : 0;

    const topicPerformance = this.calculateTopicPerformance(state);

    // Sort by lowest performance first
    const weakestTopics = [...topicPerformance]
      .sort((a, b) => a.percentage - b.percentage)
      .filter(t => t.percentage < 100)
      .slice(0, 3);

    return {
      totalQuestions,
      correctCount,
      percentage,
      topicPerformance,
      weakestTopics
    };
  }

  /**
   * Get related lesson for a question
   */
  getRelatedLesson$(questionId: string): Observable<{ id: string; title: string } | null> {
    const question = this.sessionState()?.questions.find(q => q.id === questionId);
    if (!question?.relatedLessonId) {
      return of(null);
    }

    return this.lessonsRepo.getLesson$(question.relatedLessonId).pipe(
      map(lesson => lesson ? { id: lesson.id, title: lesson.title } : null),
      catchError(() => of(null))
    );
  }

  /**
   * Reset session state
   */
  resetSession(): void {
    this.sessionState.set(null);
    this.selectedAnswer.set(null);
  }

  /**
   * Navigate back to practice entry
   */
  goToPracticeEntry(courseId: string, lessonId?: string): void {
    if (lessonId) {
      this.router.navigate(['/app/courses', courseId, 'learn', lessonId, 'practice']);
    } else {
      this.router.navigate(['/app/courses', courseId, 'practice']);
    }
  }

  /**
   * Navigate to course dashboard
   */
  goToCourse(courseId: string): void {
    this.router.navigate(['/app/courses', courseId, 'learn']);
  }

  /**
   * Navigate back to lesson
   */
  goToLesson(courseId: string, lessonId: string): void {
    this.router.navigate(['/app/courses', courseId, 'learn', lessonId]);
  }

  /**
   * Navigate to profile
   */
  goToProfile(): void {
    this.router.navigate(['/app/profile']);
  }

  // =======================================
  // PRIVATE HELPERS
  // =======================================

  /**
   * Shuffle questions using Fisher-Yates algorithm
   */
  private shuffleQuestions(questions: Question[]): Question[] {
    const shuffled = [...questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Calculate performance per topic
   */
  private calculateTopicPerformance(state: PracticeSessionState): TopicPerformance[] {
    const topicStats = new Map<string, { total: number; correct: number }>();

    for (const question of state.questions) {
      if (!topicStats.has(question.topic)) {
        topicStats.set(question.topic, { total: 0, correct: 0 });
      }

      const stats = topicStats.get(question.topic)!;
      stats.total++;

      const answer = state.answers.get(question.id);
      if (answer?.isCorrect) {
        stats.correct++;
      }
    }

    const performance: TopicPerformance[] = [];
    for (const [topic, stats] of topicStats) {
      performance.push({
        topic,
        total: stats.total,
        correct: stats.correct,
        percentage: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
      });
    }

    return performance.sort((a, b) => a.topic.localeCompare(b.topic, 'he'));
  }
}
