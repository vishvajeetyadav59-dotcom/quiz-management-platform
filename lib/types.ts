export type UserRole = 'ADMIN' | 'STUDENT';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type Difficulty = 'EASY' | 'INTERMEDIATE' | 'ADVANCED';
export type QuizStatus = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED';
export type AttemptStatus = 'PASSED' | 'FAILED';

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  difficulty: Difficulty;
  duration: number;
  passing_score: number;
  max_attempts: number;
  status: QuizStatus;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  questions?: Question[];
}

export interface Option {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
}

export interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  marks: number;
  explanation: string | null;
  difficulty: Difficulty | null;
  created_at: string;
  options?: Option[];
}

export interface Attempt {
  id: string;
  quiz_id: string;
  user_id: string;
  score: number;
  percentage: number;
  correct_answers: number;
  incorrect_answers: number;
  unanswered: number;
  time_taken: number;
  status: AttemptStatus;
  started_at: string;
  completed_at: string | null;
  quiz?: Quiz;
  user?: Profile;
}

export interface Answer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option_id: string | null;
  is_correct: boolean;
}
