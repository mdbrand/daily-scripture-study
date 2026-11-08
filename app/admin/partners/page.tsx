import type { Metadata } from 'next';
import Link from 'next/link';
import LegalShell from '../../LegalShell';
import { getSessionEmail, isAdmin } from '@/lib/session';
import { rpc } from '@/lib/supabaseRpc';
import { gate, money } from '@/lib/partners';

export const metadata: Metadata = { title: 'Partner report | Morning Lamp', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

type Row = {
  code: string;
  email: string;
  status: string;
  payouts_enabled: boolean;
  created_at: string;
  clicks: number;
  signups: number;
  pending_cents: number;
  earned_cents: number;
  paid_cents: number;
};

export default async function AdminPartners() {
  const email = await getSessionEmail();
  if (!isAdmin(email)) {
    return (
      <LegalShell title="Partner report">
        <p>
          This page is for Morning Lamp staff. <Link href="/partners">Sign in</Link> with an admin email address,
          then come back here.
        </p>
      </LegalShell>
    );
  }

  const rows = await rpc<Row[]>('dss_partner_list', { p_gate: gate() });
  const sum = (k: keyof Row) => rows.reduce((n, r) => n + Number(r[k] || 0), 0);

  return (
    <LegalShell title="Partner report">
      <dl className="partner-stats">
        <div><dt>Partners</dt><dd>{rows.length}</dd></div>
        <div><dt>Payouts set up</dt><dd>{rows.filter((r) => r.payouts_enabled).length}</dd></div>
        <div><dt>Referred sign-ups</dt><dd>{sum('signups')}</dd></div>
        <div><dt>Waiting 30 days</dt><dd>{money(sum('pending_cents'))}</dd></div>
        <div><dt>Ready to pay</dt><dd>{money(sum('earned_cents'))}</dd></div>
        <div><dt>Paid out</dt><dd>{money(sum('paid_cents'))}</dd></div>
      </dl>
      <p className="form-note" style={{ textAlign: 'left' }}>
        Payouts of $25 or more go out automatically on the 1st of each month. You get an email summary each time.
      </p>
      {rows.length === 0 ? (
        <p>No partners yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="partner-table">
            <thead>
              <tr>
                <th>Link</th><th>Email</th><th>Status</th><th>Bank</th><th>Visits</th><th>Sign-ups</th>
                <th>Waiting</th><th>Ready</th><th>Paid</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code}>
                  <td>{r.code}</td>
                  <td>{r.email}</td>
                  <td>{r.status}</td>
                  <td>{r.payouts_enabled ? 'Yes' : 'No'}</td>
                  <td>{r.clicks}</td>
                  <td>{r.signups}</td>
                  <td>{money(r.pending_cents)}</td>
                  <td>{money(r.earned_cents)}</td>
                  <td>{money(r.paid_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </LegalShell>
  );
}
