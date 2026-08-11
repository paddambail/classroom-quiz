'use client';
import { useState } from 'react';
import type { AnswerLetter } from '@/types/quiz';

type Draft = { question: string; options: string[]; correct: AnswerLetter; timeLimit: number; basePoints: number };
const blank = (): Draft => ({ question: '', options: ['', '', '', ''], correct: 'A', timeLimit: 5, basePoints: 1000 });

export function QuizEditor({ onSaved }: { onSaved: (data: { quiz: any; hostToken: string }) => void }) {
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<Draft[]>([blank()]);
  const [selected, setSelected] = useState(0);
  const [saving, setSaving] = useState(false);
  const q = questions[selected];
  const update = (patch: Partial<Draft>) => setQuestions((all) => all.map((item, i) => i === selected ? { ...item, ...patch } : item));
  const updateOption = (i: number, value: string) => update({ options: q.options.map((x, j) => j === i ? value : x) });

  async function save() {
    if (!title.trim()) return alert('Please enter a quiz title.');
    if (questions.some((x) => !x.question.trim() || x.options.some((o) => !o.trim()))) return alert('Complete every question and all four options.');
    setSaving(true);
    try {
      const res = await fetch('/api/quizzes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, questions }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem(`cq-host-${data.quiz.id}`, data.hostToken);
      localStorage.setItem('cq-host-quiz', data.quiz.id);
      onSaved(data);
    } catch (e) { alert(e instanceof Error ? e.message : 'Unable to save quiz.'); }
    finally { setSaving(false); }
  }

  function duplicate() { setQuestions((all) => [...all.slice(0, selected + 1), { ...q, options: [...q.options] }, ...all.slice(selected + 1)]); setSelected(selected + 1); }
  function move(delta: number) { const next = selected + delta; if (next < 0 || next >= questions.length) return; const copy = [...questions]; [copy[selected], copy[next]] = [copy[next], copy[selected]]; setQuestions(copy); setSelected(next); }

  return <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
    <aside className="card p-4">
      <label className="mb-2 block text-sm font-bold text-slate-300">Quiz title</label>
      <input className="field mb-5" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="World Geography Challenge" />
      <div className="mb-3 flex items-center justify-between"><span className="font-bold">Questions</span><button className="btn-secondary px-3 py-2" onClick={() => { setQuestions([...questions, blank()]); setSelected(questions.length); }}>+ Add</button></div>
      <div className="space-y-2">{questions.map((item, i) => <button key={i} className={`w-full rounded-xl border p-3 text-left ${i === selected ? 'border-cyan-400 bg-cyan-400/10' : 'border-slate-700 bg-slate-900/50'}`} onClick={() => setSelected(i)}><span className="font-black">{i + 1}.</span> {item.question || 'New question'}</button>)}</div>
    </aside>
    <section className="card p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-cyan-300">Question {selected + 1} / {questions.length}</p><h2 className="text-2xl font-black">Question Editor</h2></div><div className="flex gap-2"><button className="btn-secondary" onClick={() => move(-1)} disabled={selected === 0}>↑</button><button className="btn-secondary" onClick={() => move(1)} disabled={selected === questions.length - 1}>↓</button><button className="btn-secondary" onClick={duplicate}>Duplicate</button><button className="btn-danger" onClick={() => { if (questions.length === 1) return; setQuestions(questions.filter((_, i) => i !== selected)); setSelected(Math.max(0, selected - 1)); }}>Delete</button></div></div>
      <textarea className="field min-h-28 resize-y" value={q.question} onChange={(e) => update({ question: e.target.value })} placeholder="What is the capital of France?" />
      <div className="mt-5 grid gap-3 md:grid-cols-2">{q.options.map((option, i) => <div key={i}><label className="mb-1 block text-sm font-bold text-slate-400">{String.fromCharCode(65 + i)}</label><input className="field" value={option} onChange={(e) => updateOption(i, e.target.value)} /></div>)}</div>
      <div className="mt-5 grid gap-3 md:grid-cols-3"><label className="text-sm font-bold">Correct answer<select className="field mt-1" value={q.correct} onChange={(e) => update({ correct: e.target.value as AnswerLetter })}>{['A','B','C','D'].map((x) => <option key={x}>{x}</option>)}</select></label><label className="text-sm font-bold">Time (seconds)<input className="field mt-1" type="number" min={1} max={60} value={q.timeLimit} onChange={(e) => update({ timeLimit: Number(e.target.value) || 5 })} /></label><label className="text-sm font-bold">Base points<input className="field mt-1" type="number" min={100} value={q.basePoints} onChange={(e) => update({ basePoints: Number(e.target.value) || 1000 })} /></label></div>
      <div className="mt-6 flex justify-end"><button className="btn-primary" disabled={saving} onClick={save}>{saving ? 'Saving...' : 'SAVE QUIZ'}</button></div>
    </section>
  </div>;
}
