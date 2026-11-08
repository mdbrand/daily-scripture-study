import { NextResponse } from 'next/server';
import { getFounderStats } from '@/lib/supabaseRpc';
import { currentTier } from '@/lib/founders';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const s = await getFounderStats();
    return NextResponse.json({ ...s, ...currentTier(s.sold) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('founders stats', e);
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
}
