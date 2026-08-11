'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { QuizEditor } from '@/components/QuizEditor';
import { QRCode } from '@/components/QRCode';
import { Timer } from '@/components/Timer';
import { Leaderboard } from '@/components/Leaderboard';
import type { LeaderboardRow, Quiz, Question, Student } from '@/types/quiz';

export default function HostPage() {
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [hostToken, setHostToken] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [mode, setMode] = useState<'editor'|'ready'|'live'|'finished'>('editor');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadResults = useCallback(async (id: string) => { const r = await fetch(`/api/quizzes/${id}/results`, { cache: 'no-store' }); if (r.ok) setRows((await r.json()).leaderboard); }, []);
  const loadQuestion = useCallback(async (id: string) => { const r = await fetch(`/api/quizzes/${id}/question`, { cache: 'no-store' }); if (r.ok) setQuestion((await r.json()).question); }, []);

  useEffect(() => {
    const id = localStorage.getItem('cq-host-quiz');
    if (!id) return;
    const token = localStorage.getItem(`cq-host-${id}`) ?? '';
    setHostToken(token);
    supabase.from('quizzes').select('*').eq('id', id).single().then(({ data }) => {
      if (!data) return;
      setQuiz(data as Quiz);
      setMode(data.status === 'finished' ? 'finished' : data.status === 'active' ? 'live' : 'ready');
      loadQuestion(id); loadResults(id);
    });
    const channel = supabase.channel(`host-${id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'quizzes', filter: `id=eq.${id}` }, (payload) => {
      const next = payload.new as Quiz;
      setQuiz(next); setMode(next.status === 'finished' ? 'finished' : next.status === 'active' ? 'live' : 'ready');
      loadQuestion(id); loadResults(id);
    }).on('postgres_changes', { event: '*', schema: 'public', table: 'students', filter: `quiz_id=eq.${id}` }, () => {
      supabase.from('students').select('*').eq('quiz_id', id).order('joined_at').then(({ data }) => setStudents((data ?? []) as Student[]));
      loadResults(id);
    }).subscribe();
    supabase.from('students').select('*').eq('quiz_id', id).order('joined_at').then(({ data }) => setStudents((data ?? []) as Student[]));
    return () => { supabase.removeChannel(channel); };
  }, [loadQuestion, loadResults]);

  async function action(name: string) {
    if (!quiz || busy) return;
    setBusy(true); setError('');
    try { const r = await fetch(`/api/quizzes/${quiz.id}/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostToken }) }); const data = await r.json(); if (!r.ok) throw new Error(data.error); if (data.finished) setMode('finished'); } catch (e) { setError(e instanceof Error ? e.message : 'Action failed.'); } finally { setBusy(false); }
  }

  if (!quiz) return <main className="quiz-shell"><div className="mx-auto max-w-6xl p-6"><header className="mb-8"><div className="text-cyan-300 font-black tracking-widest">CLASSROOM QUIZ</div><h1 className="mt-2 text-4xl font-black">Create a live competition</h1></header><QuizEditor onSaved={({ quiz: q, hostToken: t }) => { setQuiz(q); setHostToken(t); setMode('ready'); setStudents([]); }} /></div></main>;

  const joinUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/join?pin=${quiz.game_pin}`;
  return <main className="quiz-shell min-h-screen"><div className="mx-auto max-w-7xl p-5 md:p-8">
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><div className="font-black tracking-widest text-cyan-300">CLASSROOM QUIZ · HOST</div><h1 className="text-3xl font-black">{quiz.title}</h1></div><button className="btn-secondary" onClick={() => router.push('/')}>Home</button></header>
    {error && <div className="mb-5 rounded-xl border border-red-800 bg-red-950/50 p-4 text-red-200">{error}</div>}
    {mode === 'ready' && <div className="grid gap-6 lg:grid-cols-[1fr_320px]"><section className="card p-8 text-center"><p className="text-sm font-bold text-cyan-300">LIVE QUIZ READY</p><h2 className="mt-2 text-3xl font-black">{quiz.title}</h2><p className="mt-8 text-sm text-slate-400">GAME PIN</p><div className="my-2 text-7xl font-black tracking-[.15em] text-cyan-300">{quiz.game_pin}</div><p className="text-slate-400">Students can join with the PIN, URL, or QR code.</p><div className="mt-8 flex items-center justify-center gap-2"><span className="h-3 w-3 animate-pulse rounded-full bg-cyan-400" /> <b>{students.length}</b> students joined</div><button className="btn-primary mt-8 w-full text-lg" disabled={students.length === 0 || busy} onClick={() => action('start')}>{busy ? 'Starting...' : '🚀 START QUIZ'}</button></section><div className="card flex flex-col items-center p-5"><QRCode url={joinUrl} /><p className="mt-4 font-black">SCAN TO JOIN</p><p className="mt-2 break-all text-center text-xs text-slate-400">{joinUrl}</p><div className="mt-5 w-full border-t border-slate-700 pt-4"><p className="mb-2 text-sm font-bold">Students joined</p>{students.map((s) => <div key={s.id} className="rounded-lg bg-slate-900 p-2 text-sm">{s.name}</div>)}</div></div></div>}
    {mode === 'live' && <div className="grid gap-6 lg:grid-cols-[1fr_340px]"><section className="card p-7"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm text-cyan-300">QUESTION {quiz.current_question + 1}</p><h2 className="mt-1 text-2xl font-black">{question?.question}</h2></div><div className="text-center"><p className="text-xs text-slate-400">TIME</p><Timer startTime={quiz.question_start_time} seconds={question?.time_limit ?? 5} /></div></div><div className="mt-6 grid gap-3 md:grid-cols-2">{question && [question.option_a, question.option_b, question.option_c, question.option_d].map((o, i) => <div key={i} className="answer-card"><b className="mr-3 text-cyan-300">{String.fromCharCode(65+i)}</b>{o}</div>)}</div><div className="mt-6 rounded-xl bg-slate-900/80 p-4"><b>Answered:</b> {rows.reduce((n, r) => n + (r.correct >= 0 ? 0 : 0), 0)} · <b>Students:</b> {students.length}</div><div className="mt-6 flex gap-3"><button className="btn-primary flex-1" disabled={busy} onClick={() => action('next')}>{busy ? 'Updating...' : 'NEXT QUESTION'}</button><button className="btn-danger" disabled={busy} onClick={() => action('end')}>END QUIZ</button></div></section><Leaderboard rows={rows} /></div>}
    {mode === 'finished' && <div className="grid gap-6 lg:grid-cols-[1fr_340px]"><section className="card p-8 text-center"><p className="text-cyan-300 font-black">🏆 QUIZ COMPLETE</p><h2 className="mt-2 text-4xl font-black">{rows[0]?.name ?? 'No winner'}</h2><p className="mt-2 text-2xl text-cyan-300">{rows[0]?.score ?? 0} points</p><div className="mt-8 grid gap-3 sm:grid-cols-2"><button className="btn-primary" disabled={busy} onClick={() => action('play-again')}>PLAY AGAIN</button><button className="btn-secondary" onClick={() => { localStorage.removeItem('cq-host-quiz'); router.push('/host'); }}>BACK TO EDITOR</button></div></section><Leaderboard rows={rows} /></div>}
  </div></main>;
}
