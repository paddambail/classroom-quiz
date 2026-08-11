import type { LeaderboardRow } from '@/types/quiz';

export function Leaderboard({ rows }: { rows: LeaderboardRow[] }) {
  return <div className="card overflow-hidden">
    <div className="border-b border-slate-700 p-5"><h2 className="text-xl font-black">🏆 Leaderboard</h2></div>
    <div className="divide-y divide-slate-800">
      {rows.length === 0 ? <p className="p-6 text-slate-400">No students yet.</p> : rows.map((row) => <div key={row.id} className="flex items-center gap-4 p-4">
        <div className="w-10 text-center text-xl font-black">{row.rank}</div>
        <div className="min-w-0 flex-1"><div className="truncate font-bold">{row.name}</div><div className="text-xs text-slate-400">{row.correct} correct · {row.total_response_time.toFixed(2)}s total</div></div>
        <div className="font-black text-cyan-300">{row.score}</div>
      </div>)}
    </div>
  </div>;
}
