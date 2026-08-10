-- Add response time in milliseconds to answers
ALTER TABLE public.answers
ADD COLUMN IF NOT EXISTS response_time_ms integer NOT NULL DEFAULT 0;
