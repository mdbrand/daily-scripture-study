import { NextResponse } from 'next/server';
import { getFounderStats } from '@/lib/supabaseRpc';

export const dynamic = 'force-dynamic';

// Founders switch + price. The offer is hidden unless open is true (dss_config.founders_open).
export async function GET() {
  try {
    const s = await getFounderStats();
    return NextResponse.json({ open: s.open, price_cents: s.price_cents }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('founders stats', e);
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
}
