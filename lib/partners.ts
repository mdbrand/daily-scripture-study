import { rpc } from './supabaseRpc';
import { stripe } from './stripe';

export type PartnerProfile = {
  email: string;
  premium_status: string | null;
  partner: null | {
    code: string;
    status: string;
    stripe_account_id: string | null;
    payouts_enabled: boolean;
    joined: string;
  };
  stats?: {
    clicks: number;
    signups: number;
    paying: number;
    pending_cents: number;
    earned_cents: number;
    paid_cents: number;
  };
  recent?: { created_at: string; source: string; commission_cents: number; status: string; earn_after: string }[];
};

export const PAYOUT_MIN_CENTS = 2500; // $25 minimum before a monthly payout goes out

export function gate() {
  const g = process.env.DSS_DB_GATE;
  if (!g) throw new Error('DSS_DB_GATE is not set');
  return g;
}

export function isPremium(status: string | null | undefined) {
  return status === 'founder' || status === 'monthly' || status === 'yearly';
}

export function getPartnerProfile(email: string) {
  return rpc<PartnerProfile>('dss_partner_profile', { p_gate: gate(), p_email: email });
}

export function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

type Account = {
  id: string;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
  capabilities?: { transfers?: string };
};

// Payouts can go out once Stripe has turned on transfers for the partner's account.
export function accountReady(a: Account) {
  return a.capabilities?.transfers === 'active' && !!a.details_submitted;
}

export async function refreshStripeStatus(code: string, accountId: string) {
  const a = await stripe<Account>('GET', `/accounts/${accountId}`);
  const ready = accountReady(a);
  await rpc('dss_set_partner_stripe', { p_gate: gate(), p_code: code, p_account_id: accountId, p_payouts_enabled: ready });
  return ready;
}
