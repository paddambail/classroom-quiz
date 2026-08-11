create extension if not exists pgcrypto;

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  game_pin text unique not null check (game_pin ~ '^[0-9]{6}$'),
  status text not null default 'draft' check (status in ('draft','waiting','active','review','finished')),
  current_question integer not null default -1,
  question_start_time timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question_order integer not null check (question_order >= 0),
  question_type text not null default 'multiple_choice' check (question_type = 'multiple_choice'),
  question text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_answer text not null check (correct_answer in ('A','B','C','D')),
  time_limit integer not null default 5 check (time_limit between 1 and 60),
  base_points integer not null default 1000 check (base_points > 0),
  image_url text,
  created_at timestamptz not null default now(),
  unique (quiz_id, question_order)
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 40),
  score integer not null default 0 check (score >= 0),
  total_response_time numeric not null default 0 check (total_response_time >= 0),
  joined_at timestamptz not null default now(),
  unique (quiz_id, lower(name))
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  selected_answer text not null check (selected_answer in ('A','B','C','D')),
  is_correct boolean not null default false,
  response_time numeric not null check (response_time >= 0),
  points integer not null default 0 check (points >= 0),
  answered_at timestamptz not null default now(),
  unique (student_id, question_id)
);

create table if not exists public.host_sessions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null unique references public.quizzes(id) on delete cascade,
  token_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists quizzes_pin_idx on public.quizzes(game_pin);
create index if not exists questions_quiz_order_idx on public.questions(quiz_id, question_order);
create index if not exists students_quiz_score_idx on public.students(quiz_id, score desc, total_response_time asc);
create index if not exists answers_quiz_question_idx on public.answers(quiz_id, question_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists quizzes_updated_at on public.quizzes;
create trigger quizzes_updated_at before update on public.quizzes
for each row execute function public.set_updated_at();

alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.students enable row level security;
alter table public.answers enable row level security;
alter table public.host_sessions enable row level security;

drop policy if exists "public can read quiz state" on public.quizzes;
create policy "public can read quiz state" on public.quizzes for select using (true);

-- Question answers are never exposed through the browser. Server API routes use the service role.
drop policy if exists "no public question access" on public.questions;
create policy "no public question access" on public.questions for select using (false);

-- Names/scores are safe for the live leaderboard; writes happen only through server APIs.
drop policy if exists "public can read students" on public.students;
create policy "public can read students" on public.students for select using (true);

drop policy if exists "no public answer access" on public.answers;
create policy "no public answer access" on public.answers for select using (false);

drop policy if exists "no public host session access" on public.host_sessions;
create policy "no public host session access" on public.host_sessions for select using (false);

alter table public.quizzes replica identity full;
alter table public.students replica identity full;

-- Add the live tables to Supabase Realtime only when they are not already present.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'quizzes') then
    alter publication supabase_realtime add table public.quizzes;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'students') then
    alter publication supabase_realtime add table public.students;
  end if;
end $$;
