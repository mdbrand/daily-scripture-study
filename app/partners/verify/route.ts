import { NextResponse } from 'next/server';
import { hashToken, setSession } from '@/lib/session';
import { rpc } from '@/lib/supabaseRpc';

export const runtime = 'nodejs';

// Consumes a one-time sign-in link and starts a 30-day session.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token') || '';
  const nextParam = url.searchParams.get('next') || '/partners';
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/partners';
  const gate = process.env.DSS_DB_GATE;

  // A reader signing in to their own page goes back there when the link is no good, not to the partners page.
  const home = next.startsWith('/my-lamp') ? '/my-lamp' : '/partners';
  if (!token || !gate) return NextResponse.redirect(new URL(`${home}?signin=invalid`, url.origin));
  const email = await rpc<string | null>('dss_consume_login_token', { p_gate: gate, p_token_hash: hashToken(token) });
  if (!email) return NextResponse.redirect(new URL(`${home}?signin=expired`, url.origin));

  await setSession(email);
  return NextResponse.redirect(new URL(next, url.origin));
}
