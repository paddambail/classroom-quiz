'use client';
import { useEffect, useState } from 'react';

export function Timer({ startTime, seconds, onExpire }: { startTime: string | null; seconds: number; onExpire?: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    if (!startTime) return;
    const tick = () => {
      const left = Math.max(0, seconds - (Date.now() - new Date(startTime).getTime()) / 1000);
      setRemaining(left);
      if (left <= 0) onExpire?.();
    };
    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [startTime, seconds, onExpire]);
  return <div className="text-5xl font-black tabular-nums text-cyan-300">{remaining > 0 ? Math.ceil(remaining) : 'TIME!'}</div>;
}
