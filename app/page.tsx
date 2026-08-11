'use client';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  return <main className="quiz-shell flex min-h-screen items-center justify-center p-5"><div className="w-full max-w-4xl text-center"><div className="mb-10 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/5 px-4 py-2 text-sm font-bold text-cyan-300">LIVE INTERACTIVE CLASSROOM</div><h1 className="text-6xl font-black tracking-tight md:text-8xl">CLASSROOM<br/><span className="text-cyan-300">QUIZ</span></h1><p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400 md:text-xl">Live interactive classroom competitions. Create a quiz, invite your students, and see who answers fastest.</p><div className="mx-auto mt-10 grid max-w-xl gap-4 sm:grid-cols-2"><button className="btn-primary py-5 text-lg" onClick={()=>router.push('/host')}>CREATE QUIZ</button><button className="btn-secondary py-5 text-lg" onClick={()=>router.push('/join')}>JOIN QUIZ</button></div><div className="mt-10 grid gap-3 text-sm text-slate-500 sm:grid-cols-3"><span>⚡ 5-second rounds</span><span>🏆 Speed-based scoring</span><span>📱 QR + PIN joining</span></div></div></main>;
}
