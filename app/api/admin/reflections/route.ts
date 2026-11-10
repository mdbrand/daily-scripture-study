import { NextResponse } from 'next/server';
import { getSessionEmail, isAdmin } from '@/lib/session';
import { writeLampFor } from '@/lib/reflections';
import { resendDay } from '@/lib/daily';
import { anthropicKey } from '@/lib/studyWriter';

export const runtime = 'nodejs';
export const maxDuration = 300;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Admin: write a reader's Last Night's Lamp for a given morning from a note they shared
// (e.g. a reply that never reached us), and optionally send them that morning's email again.
export async function POST(req: Request) {
  const admin = await getSessionEmail();
  if (!isAdmin(admin)) return NextResponse.redirect(new URL('/admin/reflections', req.url), 303);
  const form = await req.formData();
  const email = String(form.get('email') || '').trim().toLowerCase();
  const date = String(form.get('date') || '');
  const note = String(form.get('note') || '').trim().slice(0, 4000);
  const resend = form.get('resend') === 'on';
  const back = (msg: string) => NextResponse.redirect(new URL(`/admin/reflections?msg=${msg}`, req.url), 303);

  if (!EMAIL.test(email) || !DATE.test(date) || note.length < 3) return back('missing');
  if (!anthropicKey()) return back('no-key');
  try {
    const r = await writeLampFor(email, note, date, { replace: true });
    if (!r.handled) return back('failed');
    if (r.kind !== 'reflection') return back(`not-reflection-${r.kind}`);
    if (!resend) return back('written');
    const sent = await resendDay(email, date);
    return back(sent === 'ok' ? 'written-sent' : `written-not-sent-${sent}`);
  } catch (e) {
    console.error('admin reflections', e);
    return back('error');
  }
}
