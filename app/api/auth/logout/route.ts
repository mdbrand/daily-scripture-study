import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/session';

// Signs out, then returns to the page the form names (a path on this site), or the partners page.
export async function POST(req: Request) {
  await clearSession();
  const form = await req.formData().catch(() => null);
  const want = String(form?.get('next') || '');
  const next = want.startsWith('/') && !want.startsWith('//') ? want : '/partners';
  return NextResponse.redirect(new URL(next, new URL(req.url).origin), { status: 303 });
}
