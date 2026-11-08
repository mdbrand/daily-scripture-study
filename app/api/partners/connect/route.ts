import { NextResponse } from 'next/server';
import { getSessionEmail } from '@/lib/session';
import { stripe } from '@/lib/stripe';
import { rpc } from '@/lib/supabaseRpc';
import { gate, getPartnerProfile, refreshStripeStatus } from '@/lib/partners';

export const runtime = 'nodejs';

function origin(req: Request) {
  const o = new URL(req.url).origin;
  return o.startsWith('http://localhost') ? o : process.env.NEXT_PUBLIC_SITE_URL || 'https://morninglamp.study';
}

// POST: start (or resume) Stripe payout setup. Creates an Express account once, then
// sends the partner to Stripe's hosted onboarding. If already set up, opens their Stripe dashboard.
export async function POST(req: Request) {
  const email = await getSessionEmail();
  if (!email) return NextResponse.redirect(new URL('/partners', req.url), 303);
  const profile = await getPartnerProfile(email);
  const p = profile.partner;
  if (!p) return NextResponse.redirect(new URL('/partners', req.url), 303);

  try {
    let accountId = p.stripe_account_id;
    if (!accountId) {
      const acct = await stripe<{ id: string }>(
        'POST',
        '/accounts',
        {
          type: 'express',
          country: 'US',
          email,
          capabilities: { transfers: { requested: true } },
          business_profile: { product_description: 'Morning Lamp partner referrals' },
          metadata: { app: 'morning-lamp', partner_code: p.code },
        },
        // Guards against double-clicks only; a stable key would replay an old failure for 24 hours.
        `ml-partner-acct-${p.code}-${Math.floor(Date.now() / 60000)}`,
      );
      accountId = acct.id;
      await rpc('dss_set_partner_stripe', { p_gate: gate(), p_code: p.code, p_account_id: accountId, p_payouts_enabled: false });
    }

    if (p.payouts_enabled) {
      const link = await stripe<{ url: string }>('POST', `/accounts/${accountId}/login_links`);
      return NextResponse.redirect(link.url, 303);
    }

    const base = origin(req);
    const link = await stripe<{ url: string }>('POST', '/account_links', {
      account: accountId,
      type: 'account_onboarding',
      refresh_url: `${base}/api/partners/connect`,
      return_url: `${base}/api/partners/connect?done=1`,
    });
    return NextResponse.redirect(link.url, 303);
  } catch (e) {
    console.error('partner connect', e);
    const notReady = e instanceof Error && /signed up for Connect|platform profile/i.test(e.message);
    return NextResponse.redirect(new URL(`/partners?payouts=${notReady ? 'soon' : 'error'}`, req.url), 303);
  }
}

// GET: Stripe sends the partner back here. Refresh their payout status, then show the dashboard.
// (A refresh_url hit means the onboarding link expired; restart it.)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = await getSessionEmail();
  if (!email) return NextResponse.redirect(new URL('/partners', url.origin));
  const p = (await getPartnerProfile(email)).partner;
  if (!p?.stripe_account_id) return NextResponse.redirect(new URL('/partners', url.origin));

  if (!url.searchParams.get('done')) return POST(req);
  try {
    const ready = await refreshStripeStatus(p.code, p.stripe_account_id);
    return NextResponse.redirect(new URL(`/partners?payouts=${ready ? 'ready' : 'pending'}`, url.origin));
  } catch (e) {
    console.error('partner connect return', e);
    return NextResponse.redirect(new URL('/partners?payouts=error', url.origin));
  }
}
