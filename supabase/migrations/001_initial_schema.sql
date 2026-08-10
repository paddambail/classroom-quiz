-- Supabase SQL migration for Classroom Quiz app schema

create table if not exists quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  game_pin text not null unique,
  status text not null default 'pending',
  created_at timestamp with time zone not null default now()
);

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_answer text not null,
  time_limit integer not null default 5,
  question_order integer not null,
  created_at timestamp with time zone not null default now()
);

create index if not exists questions_quiz_id_idx on questions (quiz_id);
create index if not exists questions_quiz_id_order_idx on questions (quiz_id, question_order);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  name text not null,
  score integer not null default 0,
  joined_at timestamp with time zone not null default now()
);

create index if not exists students_quiz_id_idx on students (quiz_id);

create table if not exists answers (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  answer text not null,
  is_correct boolean not null default false,
  points integer not null default 0,
  answered_at timestamp with time zone not null default now()
);

create index if not exists answers_quiz_id_idx on answers (quiz_id);
create index if not exists answers_question_id_idx on answers (question_id);
create index if not exists answers_student_id_idx on answers (student_id);
