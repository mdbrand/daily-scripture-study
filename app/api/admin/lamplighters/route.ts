import { NextResponse } from 'next/server';
import { getSessionEmail, isAdmin } from '@/lib/session';
import { decide } from '@/lib/lamplighters';

export const runtime = 'nodejs';

// Accept or decline a Lamplighter application (plain form posts from /admin/lamplighters).
export async function POST(req: Request) {
  const admin = await getSessionEmail();
  if (!isAdmin(admin)) return NextResponse.redirect(new URL('/admin/lamplighters', req.url), 303);
  const form = await req.formData();
  const email = String(form.get('email') || '');
  const accept = form.get('action') === 'accept';
  let msg = accept ? 'accepted' : 'declined';
  try {
    const r = await decide(email, accept);
    if (!r.ok) msg = r.error?.includes('spots') ? 'full' : 'error';
  } catch (e) {
    console.error('lamplighter decide', e);
    msg = 'error';
  }
  return NextResponse.redirect(new URL(`/admin/lamplighters?msg=${msg}`, req.url), 303);
}
