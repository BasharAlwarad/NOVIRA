// In-memory fixed-window limiter. This is process-local state: fine for a
// single long-running Node process (`next dev` / `next start`), but resets
// on every deploy and won't be shared across instances if this ever runs on
// multiple servers or a serverless platform — swap for a shared store
// (Redis, etc.) before that happens.
const requestLog = new Map<string, number[]>();

export function isRateLimited(
  key: string,
  { windowMs, maxRequests }: { windowMs: number; maxRequests: number }
): boolean {
  const now = Date.now();
  const recent = (requestLog.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  requestLog.set(key, recent);
  return recent.length > maxRequests;
}
