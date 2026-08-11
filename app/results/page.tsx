'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Leaderboard } from '@/components/Leaderboard';
import type { LeaderboardRow } from '@/types/quiz';

export default function ResultsPage(){ const params=useSearchParams(); const router=useRouter(); const id=params.get('quiz'); const [rows,setRows]=useState<LeaderboardRow[]>([]); useEffect(()=>{if(!id)return;fetch(`/api/quizzes/${id}/results`,{cache:'no-store'}).then(r=>r.json()).then(d=>setRows(d.leaderboard??[]));},[id]); const winner=rows[0]; return <main className="quiz-shell min-h-screen p-5 md:p-10"><div className="mx-auto max-w-4xl"><div className="text-center"><div className="text-5xl">🏆</div><h1 className="mt-3 text-5xl font-black">QUIZ COMPLETE</h1>{winner&&<p className="mt-3 text-xl text-slate-400">Winner: <b className="text-cyan-300">{winner.name}</b> · {winner.score} points</p>}</div><div className="mt-8"><Leaderboard rows={rows}/></div><div className="mt-6 flex justify-center"><button className="btn-secondary" onClick={()=>router.push('/')}>Back to Home</button></div></div></main>; }
