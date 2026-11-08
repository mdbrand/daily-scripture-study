import { createHash } from 'node:crypto';
import { checkBotId } from 'botid/server';
import { rpc } from './supabaseRpc';

// Layered spam protection for public forms. Every check fails open (lets the person through)
// if the check itself breaks, so a hiccup never blocks a real sign-up.

// 1. Vercel BotID: invisible check that the request came from a real browser.
export async function looksLikeBot(): Promise<boolean> {
  if (!process.env.VERCEL) return false; // only runs on Vercel
  try {
    return (await checkBotId()).isBot;
  } catch (e) {
    console.error('botid', e);
    return false;
  }
}

// 2. Too fast to be human: forms send the time they were shown; under 2.5 seconds is a bot.
export function tooFast(shownAt: unknown): boolean {
  const t = typeof shownAt === 'number' ? shownAt : Number(shownAt);
  if (!Number.isFinite(t) || t <= 0) return false; // older cached pages don't send it
  const elapsed = Date.now() - t;
  return elapsed >= 0 && elapsed < 2500;
}

// 3. Durable rate limits, shared across all servers (stored in the database).
export function clientIp(req: Request) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}
function hashKey(s: string) {
  return createHash('sha256').update(`${s}|${process.env.DSS_DB_GATE ?? ''}`).digest('hex').slice(0, 32);
}
export async function underLimit(scope: string, id: string, windowSeconds: number, max: number): Promise<boolean> {
  const gate = process.env.DSS_DB_GATE;
  if (!gate) return true;
  try {
    return await rpc<boolean>('dss_rate_hit', {
      p_gate: gate,
      p_key: `${scope}:${hashKey(id)}`,
      p_window_seconds: windowSeconds,
      p_max: max,
    });
  } catch (e) {
    console.error('rate limit', e);
    return true;
  }
}

// Sign-up style limits: per visitor (5 per 10 min, 20 per day) and a site-wide ceiling (300 per hour).
export async function signupAllowed(req: Request, scope: string): Promise<boolean> {
  const ip = clientIp(req);
  const [a, b, c] = await Promise.all([
    underLimit(`${scope}:ip10m`, ip, 600, 5),
    underLimit(`${scope}:ipday`, ip, 86400, 20),
    underLimit(`${scope}:all`, 'all', 3600, 300),
  ]);
  return a && b && c;
}
