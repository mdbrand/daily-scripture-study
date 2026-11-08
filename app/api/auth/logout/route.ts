import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/session';

export async function POST(req: Request) {
  await clearSession();
  return NextResponse.redirect(new URL('/partners', new URL(req.url).origin), { status: 303 });
}
