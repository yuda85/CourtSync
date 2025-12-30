import { Timestamp } from '@angular/fire/firestore';

/**
 * Question difficulty levels (Hebrew)
 */
export const QUESTION_DIFFICULTIES = ['קל', 'בינוני', 'קשה'] as const;
export type QuestionDifficulty = typeof QUESTION_DIFFICULTIES[number];

/**
 * Hebrew letters for answer options
 */
export const OPTION_LETTERS = ['א', 'ב', 'ג', 'ד'] as const;

/**
 * Answer option for a question
 */
export interface AnswerOption {
  id: string;
  text: string;
}

/**
 * Question document stored in /questions/{questionId}
 */
export interface Question {
  id: string;
  courseId: string;
  subject: string;
  topic: string;
  difficulty: QuestionDifficulty;
  questionText: string;
  options: AnswerOption[];
  correctOptionId: string;
  explanation: string;
  relatedLessonId?: string;
  isPublished: boolean;
  updatedAt: Timestamp;
}

/**
 * User question attempt stored in /users/{uid}/questionAttempts/{attemptId}
 */
export interface QuestionAttempt {
  id: string;
  questionId: string;
  courseId: string;
  selectedOptionId: string;
  isCorrect: boolean;
  attemptedAt: Timestamp;
}

/**
 * Data for creating a new attempt (without auto-generated fields)
 */
export interface CreateQuestionAttemptData {
  questionId: string;
  courseId: string;
  selectedOptionId: string;
  isCorrect: boolean;
}

/**
 * Practice session filters
 */
export interface PracticeFilters {
  topic?: string;
  difficulty?: QuestionDifficulty;
  onlyMistakes?: boolean;
  relatedLessonId?: string;
}

/**
 * Practice session configuration
 */
export interface PracticeSessionConfig {
  courseId: string;
  lessonId?: string;
  filters: PracticeFilters;
  questionCount?: number;
}

/**
 * Answer record for a question in a session
 */
export interface SessionAnswer {
  selectedOptionId: string;
  isCorrect: boolean;
}

/**
 * Current state of a practice session
 */
export interface PracticeSessionState {
  config: PracticeSessionConfig;
  questions: Question[];
  currentIndex: number;
  answers: Map<string, SessionAnswer>;
  isComplete: boolean;
}

/**
 * Topic performance stats for summary
 */
export interface TopicPerformance {
  topic: string;
  total: number;
  correct: number;
  percentage: number;
}

/**
 * Practice session summary
 */
export interface PracticeSessionSummary {
  totalQuestions: number;
  correctCount: number;
  percentage: number;
  topicPerformance: TopicPerformance[];
  weakestTopics: TopicPerformance[];
}

/**
 * Difficulty color mapping for UI
 */
export const DIFFICULTY_COLORS: Record<QuestionDifficulty, { bg: string; text: string }> = {
  'קל': { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400' },
  'בינוני': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' },
  'קשה': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' }
};
