import { rpc } from './supabaseRpc';
import { gate } from './partners';
import { footerFor, oneClickUrl, postalAddress, sendBatch } from './daily';
import { renderLamplighterAccepted, renderLamplighterFeedback } from './email/templates';

export type LamplighterStats = { spots: number; accepted: number; left: number; open: boolean };
export type Application = {
  email: string;
  why: string | null;
  status: 'applied' | 'accepted' | 'declined';
  timezone: string | null;
  created_at: string;
  decided_at: string | null;
  beta_until: string | null;
};
type Active = { email: string; unsub_token: string; beta_until: string };

export async function lamplighterStats(): Promise<LamplighterStats> {
  try {
    return await rpc<LamplighterStats>('dss_lamplighter_stats');
  } catch {
    return { spots: 100, accepted: 0, left: 100, open: true };
  }
}

export const listApplications = () => rpc<Application[]>('dss_lamplighter_list', { p_gate: gate() });

const longDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles' });

// Accept (90 days of free Premium + welcome email) or decline (no email).
export async function decide(email: string, accept: boolean) {
  const r = await rpc<{ ok: boolean; error?: string }>('dss_lamplighter_decide', { p_gate: gate(), p_email: email, p_accept: accept });
  if (!r.ok || !accept) return r;
  const postal = postalAddress();
  const me = (await rpc<Active[]>('dss_lamplighters_active', { p_gate: gate() })).find((a) => a.email === email.toLowerCase());
  if (postal && me) {
    const footer = footerFor(me.unsub_token, postal);
    await sendBatch([{ to: me.email, ...renderLamplighterAccepted({ footer, until: longDate(me.beta_until) }), unsubscribeUrl: oneClickUrl(me.unsub_token) }]);
  }
  return r;
}

// Fridays: one short feedback question to every active Lamplighter.
export async function sendWeeklyFeedback() {
  const postal = postalAddress();
  if (!postal) return 0;
  const active = await rpc<Active[]>('dss_lamplighters_active', { p_gate: gate() });
  const weekIndex = Math.floor(Date.now() / (7 * 86400000));
  for (let i = 0; i < active.length; i += 100) {
    const chunk = active.slice(i, i + 100);
    await sendBatch(
      chunk.map((a) => ({
        to: a.email,
        ...renderLamplighterFeedback({ footer: footerFor(a.unsub_token, postal), weekIndex }),
        unsubscribeUrl: oneClickUrl(a.unsub_token),
      })),
    );
  }
  return active.length;
}

// Which emails have confirmed their address (double opt-in).
export async function confirmStatus(emails: string[]) {
  return rpc<{ confirmed: Record<string, boolean>; unconfirmed_total: number }>('dss_admin_confirm_status', {
    p_gate: gate(),
    p_emails: emails,
  });
}
