import { after, NextResponse } from 'next/server';
import { rpc } from '@/lib/supabaseRpc';
import { welcomeAndToday, welcomeFounding } from '@/lib/daily';
import { grantFounding } from '@/lib/lamplighters';
import { giftKey } from '@/lib/gifts';

export const runtime = 'nodejs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The "Confirm my email" button. A button (not just opening the link) so email scanners can't confirm for people.
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // A printable plan they asked for at signup: shown on the page they land on after confirming.
  const gift = giftKey(new URL(req.url).searchParams.get('gift'));
  const giftQ = gift ? `&gift=${gift}` : '';
  if (!UUID.test(token)) return NextResponse.redirect(new URL(`/confirm/${token}?done=0${giftQ}`, req.url), 303);
  const r = await rpc<{ ok: boolean; email?: string }>('dss_confirm', { p_token: token });
  // One opt-in: confirming makes you a Lamplighter; the first N become Founding Lamplighters (Premium for life).
  const grant = r.ok && r.email && process.env.DSS_DB_GATE ? await grantFounding(r.email) : null;
  const founding = grant?.status === 'granted';
  if (r.ok && process.env.DSS_DB_GATE) {
    after(async () => {
      try {
        if (founding && r.email) await welcomeFounding(r.email);
        else await welcomeAndToday(r.email ? [r.email] : []);
      } catch (e) {
        console.error('confirm: welcome', e);
      }
    });
  }
  const done = r.ok ? (founding ? `1&founding=${grant?.number ?? ''}` : '1') : '0';
  return NextResponse.redirect(new URL(`/confirm/${token}?done=${done}${giftQ}`, req.url), 303);
}
