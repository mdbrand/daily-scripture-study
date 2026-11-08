import { NextResponse } from 'next/server';
import { verifyStripeSignature } from '@/lib/stripe';
import { rpc } from '@/lib/supabaseRpc';

export const runtime = 'nodejs';

type StripeEvent = { id: string; type: string; data: { object: Record<string, unknown> } };

// Stripe events → Founders records and partner commissions (via gated DB functions).
export async function POST(req: Request) {
  const body = await req.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const gate = process.env.DSS_DB_GATE;
  if (!secret || !gate) return NextResponse.json({ error: 'not configured' }, { status: 503 });
  if (!verifyStripeSignature(body, req.headers.get('stripe-signature'), secret)) {
    return NextResponse.json({ error: 'bad signature' }, { status: 400 });
  }

  const event = JSON.parse(body) as StripeEvent;
  const obj = event.data.object;

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const meta = (obj.metadata ?? {}) as Record<string, string>;
      if (meta.kind === 'founder' && obj.payment_status === 'paid') {
        const details = obj.customer_details as { email?: string } | undefined;
        const result = await rpc('dss_record_founder', {
          p_gate: gate,
          p_session_id: obj.id,
          p_payment_intent: obj.payment_intent ?? null,
          p_email: details?.email || meta.email,
          p_amount_cents: obj.amount_total,
          p_tier: Number(meta.tier) === 1 ? 1 : 2,
          p_ref: meta.ref || null,
        });
        console.log('founder recorded', JSON.stringify(result));
      }
    } else if (event.type === 'charge.refunded') {
      const pi = obj.payment_intent as string | undefined;
      if (pi && obj.refunded === true) await rpc('dss_refund_founder', { p_gate: gate, p_payment_intent: pi });
    }
  } catch (e) {
    console.error('stripe webhook error', event.type, e);
    return NextResponse.json({ error: 'processing failed' }, { status: 500 }); // Stripe will retry
  }

  return NextResponse.json({ received: true });
}
