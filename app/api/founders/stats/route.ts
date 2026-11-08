import { NextResponse } from 'next/server';
import { getFounderStats } from '@/lib/supabaseRpc';

export const dynamic = 'force-dynamic';

// Current Founders price (no cap). The page uses price_cents only.
export async function GET() {
  try {
    const s = await getFounderStats();
    return NextResponse.json({ price_cents: s.price_cents }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('founders stats', e);
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
}
