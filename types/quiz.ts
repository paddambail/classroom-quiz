export type QuizStatus = 'draft' | 'waiting' | 'active' | 'review' | 'finished';
export type AnswerLetter = 'A' | 'B' | 'C' | 'D';

export type Quiz = {
  id: string;
  title: string;
  game_pin: string;
  status: QuizStatus;
  current_question: number;
  question_start_time: string | null;
  created_at: string;
  updated_at: string;
};

export type Question = {
  id: string;
  quiz_id: string;
  question_order: number;
  question_type: 'multiple_choice';
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer?: AnswerLetter;
  time_limit: number;
  base_points: number;
  image_url?: string | null;
};

export type Student = {
  id: string;
  quiz_id: string;
  name: string;
  score: number;
  total_response_time: number;
  joined_at: string;
};

export type LeaderboardRow = Student & { rank: number; correct: number };
