import { NextResponse } from 'next/server';
import { rpc } from '@/lib/supabaseRpc';

export const runtime = 'nodejs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST: one-click unsubscribe from a mail app's button (RFC 8058), or the confirm button on /u/[token].
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!UUID.test(token)) return NextResponse.json({ ok: false }, { status: 400 });
  const result = await rpc<{ ok: boolean; email?: string }>('dss_unsubscribe', { p_token: token });
  // Mail apps only need a 2xx. A browser form gets sent to the confirmation page.
  if ((req.headers.get('content-type') || '').includes('application/x-www-form-urlencoded')) {
    const body = await req.text();
    if (body.includes('from=page')) {
      return NextResponse.redirect(new URL(`/u/${token}?done=${result.ok ? 1 : 0}`, req.url), 303);
    }
  }
  return NextResponse.json({ ok: result.ok });
}

// A plain visit (some scanners follow links) never unsubscribes; it shows the confirm page.
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return NextResponse.redirect(new URL(`/u/${token}`, req.url));
}
