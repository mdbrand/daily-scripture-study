import { NextResponse } from 'next/server';
import { getSessionEmail } from '@/lib/session';
import { rpc } from '@/lib/supabaseRpc';
import { gate } from '@/lib/partners';

export const runtime = 'nodejs';

// A signed-in Premium member picks their link name and accepts the partner terms.
export async function POST(req: Request) {
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { code?: unknown; agree?: unknown };
  if (body.agree !== true) {
    return NextResponse.json({ error: 'Please agree to the partner terms to continue.' }, { status: 400 });
  }
  const code = String(body.code ?? '').trim().toLowerCase();
  const result = await rpc<{ ok: boolean; error?: string; code?: string }>('dss_create_partner', {
    p_gate: gate(),
    p_email: email,
    p_code: code,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, code: result.code });
}
