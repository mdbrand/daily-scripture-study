import { after, NextResponse } from 'next/server';
import { tapSeason } from '@/lib/reflections';

export const runtime = 'nodejs';
export const maxDuration = 300;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A Premium reader tapped a season in their email (the /s/[token]/[season] page posts here).
// Saves it, then writes tomorrow morning's Last Night's Lamp for it in the background.
export async function POST(req: Request) {
  const form = await req.formData();
  const token = String(form.get('t') || '');
  const season = String(form.get('s') || '');
  if (!UUID.test(token)) return NextResponse.json({ ok: false }, { status: 400 });
  const back = (done: string) => NextResponse.redirect(new URL(`/s/${token}/${encodeURIComponent(season)}?done=${done}`, req.url), 303);

  try {
    const r = await tapSeason(token, season);
    if (r.status !== 'ok') return back(r.status === 'not_premium' ? 'premium' : '0');
    if ('write' in r && r.write) {
      const write = r.write;
      after(async () => {
        try {
          await write();
        } catch (e) {
          console.error('season lamp', e);
        }
      });
    }
    return back('1');
  } catch (e) {
    console.error('season tap', e);
    return back('0');
  }
}
