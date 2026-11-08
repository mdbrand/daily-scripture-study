import { NextResponse } from 'next/server';
import { stripe, verifyStripeSignature } from '@/lib/stripe';
import { rpc } from '@/lib/supabaseRpc';

export const runtime = 'nodejs';

type StripeEvent = { id: string; type: string; data: { object: Record<string, unknown> } };

type Subscription = {
  id: string;
  customer: string;
  status: string;
  current_period_end: number;
  cancel_at_period_end: boolean;
  metadata: Record<string, string>;
  items: { data: { price: { recurring: { interval: string } | null } }[] };
};

type Invoice = {
  id: string;
  subscription: string | null;
  amount_paid: number;
  payment_intent: string | null;
  charge: string | null;
  customer_email: string | null;
};

// Re-fetch the subscription (pinned API version) and sync it to the database.
async function syncSubscription(gate: string, subscriptionId: string, fallbackEmail?: string) {
  const sub = await stripe<Subscription>('GET', `/subscriptions/${subscriptionId}`);
  if (sub.metadata?.kind !== 'premium') return;
  const interval = sub.items.data[0]?.price.recurring?.interval;
  const plan = interval === 'year' ? 'yearly' : 'monthly';
  let email = sub.metadata.email || fallbackEmail;
  if (!email) {
    const customer = await stripe<{ email: string | null }>('GET', `/customers/${sub.customer}`);
    email = customer.email ?? undefined;
  }
  if (!email) throw new Error(`no email for subscription ${sub.id}`);
  await rpc('dss_upsert_subscription', {
    p_gate: gate,
    p_subscription_id: sub.id,
    p_customer_id: sub.customer,
    p_email: email,
    p_plan: plan,
    p_status: sub.status,
    p_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    p_cancel_at_period_end: sub.cancel_at_period_end,
    p_ref: sub.metadata.ref || null,
  });
}

// Stripe events → Founders, Premium subscriptions, and partner commissions (via gated DB functions).
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
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const meta = (obj.metadata ?? {}) as Record<string, string>;
        const details = obj.customer_details as { email?: string } | undefined;
        if (meta.kind === 'founder' && obj.payment_status === 'paid') {
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
        } else if (meta.kind === 'premium' && obj.subscription) {
          await syncSubscription(gate, obj.subscription as string, details?.email || meta.email);
          // The first invoice may be paid before the subscription row existed; record its commission now.
          const sub = await stripe<{ latest_invoice: string | null }>('GET', `/subscriptions/${obj.subscription}`);
          if (sub.latest_invoice) await recordInvoice(gate, sub.latest_invoice);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(gate, obj.id as string);
        break;
      case 'invoice.paid':
      case 'invoice.payment_succeeded':
        await recordInvoice(gate, obj.id as string);
        break;
      case 'charge.refunded': {
        const pi = obj.payment_intent as string | undefined;
        if (pi && obj.refunded === true) {
          await rpc('dss_refund_founder', { p_gate: gate, p_payment_intent: pi });
          await rpc('dss_void_payment_commission', { p_gate: gate, p_payment_ref: pi });
        }
        break;
      }
    }
  } catch (e) {
    console.error('stripe webhook error', event.type, e);
    return NextResponse.json({ error: 'processing failed' }, { status: 500 }); // Stripe will retry
  }

  return NextResponse.json({ received: true });
}

// A paid subscription invoice → 30% commission (pending 30 days) if the subscriber was referred.
async function recordInvoice(gate: string, invoiceId: string) {
  const inv = await stripe<Invoice>('GET', `/invoices/${invoiceId}`);
  if (!inv.subscription || inv.amount_paid <= 0) return;
  const sub = await stripe<{ metadata: Record<string, string> }>('GET', `/subscriptions/${inv.subscription}`);
  if (sub.metadata?.kind !== 'premium') return;
  await syncSubscription(gate, inv.subscription, inv.customer_email ?? undefined);
  const result = await rpc('dss_record_subscription_payment', {
    p_gate: gate,
    p_invoice_id: inv.id,
    p_subscription_id: inv.subscription,
    p_amount_cents: inv.amount_paid,
    p_payment_ref: inv.payment_intent ?? inv.charge,
  });
  console.log('invoice recorded', inv.id, JSON.stringify(result));
}
