import { NextResponse } from 'next/server';
import { normalizeRef } from '@/lib/subscribe';
import { rpc } from '@/lib/supabaseRpc';

export const runtime = 'nodejs';

// Counts a visit to a partner link. Unknown codes are ignored by the database.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const code = normalizeRef((body as Record<string, unknown>).code);
  if (!code) return NextResponse.json({ ok: true });
  try {
    await rpc('dss_partner_click', { p_code: code });
  } catch (e) {
    console.error('partner click', e);
  }
  return NextResponse.json({ ok: true });
}
