import { after, NextResponse } from 'next/server';
import { rpc } from '@/lib/supabaseRpc';
import { welcomeAndToday } from '@/lib/daily';

export const runtime = 'nodejs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The "Confirm my email" button. A button (not just opening the link) so email scanners can't confirm for people.
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!UUID.test(token)) return NextResponse.redirect(new URL(`/confirm/${token}?done=0`, req.url), 303);
  const r = await rpc<{ ok: boolean; email?: string }>('dss_confirm', { p_token: token });
  if (r.ok && process.env.DSS_DB_GATE) {
    after(async () => {
      try {
        await welcomeAndToday(r.email ? [r.email] : []);
      } catch (e) {
        console.error('confirm: welcome', e);
      }
    });
  }
  return NextResponse.redirect(new URL(`/confirm/${token}?done=${r.ok ? 1 : 0}`, req.url), 303);
}
