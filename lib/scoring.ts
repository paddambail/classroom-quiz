export function calculatePoints(basePoints: number, timeLimit: number, responseTime: number) {
  const safeTime = Math.max(0, Math.min(responseTime, timeLimit));
  return Math.max(100, Math.round(basePoints * (1 - safeTime / timeLimit)));
}
