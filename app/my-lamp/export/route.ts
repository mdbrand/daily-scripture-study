import { NextResponse } from 'next/server';
import { getSessionEmail } from '@/lib/session';
import { exportText, myLamp } from '@/lib/myLamp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// A signed-in reader's notes and memory as a plain text file.
export async function GET(req: Request) {
  const email = await getSessionEmail();
  if (!email) return NextResponse.redirect(new URL('/my-lamp', new URL(req.url).origin), 303);
  const data = await myLamp(email);
  return new NextResponse(exportText(email, data), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="morning-lamp-my-notes.txt"',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
