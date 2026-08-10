-- Add current_question column to quizzes for live quiz tracking

alter table if exists quizzes
add column if not exists current_question integer not null default -1;

-- Optionally set existing quizzes to -1 (waiting)
update quizzes set current_question = -1 where current_question is null;