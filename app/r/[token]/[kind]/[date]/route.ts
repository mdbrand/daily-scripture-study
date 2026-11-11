import { after, NextResponse } from 'next/server';
import { classifyClick, linkLabel, linkSignatureOk, recordEvent, validRef } from '@/lib/emailEvents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://morninglamp.study';

// Links in our emails come here first: we note the click, then send the reader where they were going.
// The destination is signed when the email is built, so this can't be used to redirect anywhere else.
function destination(req: Request): string | null {
  const q = new URL(req.url).searchParams;
  const url = q.get('u');
  if (!url || !/^https?:\/\//.test(url) || !linkSignatureOk(url, q.get('s'))) return null;
  return url;
}
const go = (url: string) =>
  new NextResponse(null, { status: 302, headers: { Location: url, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });

export async function GET(req: Request, { params }: { params: Promise<{ token: string; kind: string; date: string }> }) {
  const { token, kind, date } = await params;
  const url = destination(req);
  if (!url) return go(SITE);
  const ref = validRef(token, kind, date);
  if (ref) {
    const ua = req.headers.get('user-agent');
    after(() => recordEvent(ref, 'click', classifyClick(ua), ua, linkLabel(url)));
  }
  return go(url);
}

// Link checkers often send HEAD first: answer it, but don't count it as a click.
export async function HEAD(req: Request) {
  return go(destination(req) ?? SITE);
}
