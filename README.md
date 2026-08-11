# Classroom Quiz

A real-time classroom quiz platform built with Next.js, React, TypeScript, Tailwind CSS and Supabase Realtime.

## Features

- Teacher quiz editor with multiple questions
- 6-digit Game PIN and QR join link
- Student waiting room
- Supabase Realtime synchronization
- Server-authoritative answer timing and scoring
- 5-second default question timer
- Speed-based scoring with a 100-point minimum for correct answers
- Live leaderboard and final results
- Host refresh/session recovery
- Student refresh/session recovery
- Play again with a fresh Game PIN

## Setup

1. Create a Supabase project.
2. Run `supabase/migrations/001_initial_schema.sql` in the Supabase SQL editor. The older `002_*` and `003_*` migrations are retained for historical compatibility but the new first migration contains the complete schema.
3. Copy `.env.local.example` to `.env.local`.
4. Fill in the Supabase URL, publishable key and service-role key. Never expose the service-role key to client code.
5. Install dependencies:

```bash
npm install
```

6. Start the app:

```bash
npm run dev
```

7. Open:

`http://localhost:3000`

## Test flow

1. Open `/host` and create a quiz with 3 questions.
2. Save the quiz and confirm the 6-digit PIN and QR code appear.
3. Open `/join` in two other browser windows/devices.
4. Join with two different student names.
5. Confirm the host count updates without refreshing.
6. Start the quiz from the host.
7. Confirm both students move to Question 1 automatically.
8. Answer one student quickly and the other slowly.
9. Confirm the faster correct answer earns more points.
10. Move to the next question without refreshing either student.
11. Finish the quiz and confirm final rankings.
12. Refresh the student and host pages and confirm their sessions recover.
