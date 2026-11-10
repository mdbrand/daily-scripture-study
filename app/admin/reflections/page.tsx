import type { Metadata } from 'next';
import AdminShell, { AdminSignIn, adminEmail } from '../AdminShell';
import { rpc } from '@/lib/supabaseRpc';
import { gate } from '@/lib/partners';
import { writeReflection, type Reflection } from '@/lib/reflectionWriter';
import { anthropicKey } from '@/lib/studyWriter';
import { pacificDate } from '@/lib/daily';

export const metadata: Metadata = { title: 'Premium replies | Morning Lamp', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

type Row = { email: string; for_date: string; reply: string; status: string; note: string | null; ref: string | null; updated_at: string };

const STATUS: Record<string, string> = {
  ready: 'Ready for their next email',
  pending: 'Being written',
  skipped: 'No reflection',
  failed: 'Failed',
};
const MSG: Record<string, string> = {
  written: 'Written. It will appear in that morning’s email.',
  'written-sent': 'Written and sent. Check their inbox.',
  missing: 'Fill in the email, date, and what they wrote.',
  'no-key': 'No Anthropic API key is set on this server.',
  failed: 'The writer failed. Try again.',
  error: 'Something went wrong. Check the logs.',
};

const KIND: Record<string, string> = {
  question: 'it was a Bible question',
  care: 'possible crisis: you were emailed to follow up personally',
  other: 'nothing to reflect on',
};

export default async function Reflections({ searchParams }: { searchParams: Promise<{ try?: string; msg?: string }> }) {
  const email = await adminEmail();
  if (!email) return <AdminSignIn next="/admin/reflections" />;
  const { try: sample, msg } = await searchParams;

  let tried: Reflection | null = null;
  let tryError = '';
  if (sample && sample.trim()) {
    if (!anthropicKey()) tryError = 'No Anthropic API key is set on this server.';
    else {
      try {
        tried = await writeReflection(sample.slice(0, 2000));
      } catch (e) {
        tryError = e instanceof Error ? e.message : String(e);
      }
    }
  }
  const rows = await rpc<Row[]>('dss_admin_reflections', { p_gate: gate(), p_limit: 100 });

  return (
    <AdminShell title="Premium replies" active="/admin/reflections" email={email}>
      <p>
        When a Premium reader replies to a study with a note about their day, Claude picks a passage and writes a short
        reflection that appears in their next morning’s email under “Last Night’s Lamp.” Bible
        questions, unsubscribe notes, and anything that sounds like a crisis are not turned into reflections. Crisis
        replies are emailed to you for a personal follow-up.
      </p>

      {msg && <p className="form-note" style={{ textAlign: 'left' }}><strong>{MSG[msg] ?? msg}</strong></p>}

      <h2>Write one for a reader</h2>
      <p>
        For a note that never reached us (for example, a reply that went to the wrong inbox). Claude writes that
        morning’s Last Night’s Lamp from it, replacing anything already written for that date.
      </p>
      <form action="/api/admin/reflections" method="post" className="partner-form" style={{ maxWidth: 620 }}>
        <label htmlFor="lamp-email">Reader’s email</label>
        <input id="lamp-email" name="email" type="email" required />
        <label htmlFor="lamp-date">For which morning’s email</label>
        <input id="lamp-date" name="date" type="date" required defaultValue={pacificDate(0)} />
        <label htmlFor="lamp-note">What they wrote</label>
        <textarea
          id="lamp-note"
          name="note"
          rows={5}
          required
          style={{ fontFamily: 'var(--ui)', fontSize: 16, padding: 12, border: '1px solid var(--rule)', borderRadius: 6 }}
        />
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" name="resend" defaultChecked /> Send them that morning’s email again with it
        </label>
        <button type="submit">Write it</button>
      </form>

      <h2>Try one</h2>
      <form action="/admin/reflections" method="get" className="partner-form" style={{ maxWidth: 620 }}>
        <label htmlFor="try">Sample reply (not saved, not emailed)</label>
        <textarea
          id="try"
          name="try"
          rows={4}
          defaultValue={sample ?? ''}
          placeholder="Long day at work, and I snapped at my kids when I got home."
          style={{ fontFamily: 'var(--ui)', fontSize: 16, padding: 12, border: '1px solid var(--rule)', borderRadius: 6 }}
        />
        <button type="submit">Write a reflection</button>
      </form>
      {tryError && <p className="form-error" style={{ textAlign: 'left' }}>{tryError}</p>}
      {tried && (
        <div className="contact-card">
          {tried.kind === 'reflection' && tried.passage ? (
            <>
              <p><em>“{tried.passage.text}”</em><br />{tried.passage.ref}</p>
              <p><strong>Behind the Verse</strong></p>
              {tried.body.map((b, i) => <p key={i}>{b}</p>)}
              {tried.voice && (
                <>
                  <p><strong>Voices Through History</strong></p>
                  <p>
                    <strong>{tried.voice.name}</strong> ({tried.voice.dates}), {tried.voice.kind}
                    <br />
                    {tried.voice.body}
                    <br />
                    <span className="form-note">Source: {tried.voice.source}</span>
                  </p>
                </>
              )}
            </>
          ) : (
            <p>No reflection: {tried.kind === 'care' ? 'possible crisis. A real reply like this emails you so you can follow up personally' : KIND[tried.kind] ?? tried.kind}.</p>
          )}
        </div>
      )}

      <h2>Recent replies</h2>
      {rows.length === 0 ? (
        <p>No Premium replies yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="partner-table">
            <thead>
              <tr><th>Reader</th><th>For</th><th>They wrote</th><th>Passage</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.email}-${r.for_date}`}>
                  <td>{r.email}</td>
                  <td>{r.for_date}</td>
                  <td style={{ maxWidth: 320 }}>{r.reply.length > 160 ? `${r.reply.slice(0, 159)}…` : r.reply}</td>
                  <td>{r.ref ?? '–'}</td>
                  <td>
                    {STATUS[r.status] ?? r.status}
                    {r.status === 'skipped' && r.note ? `: ${KIND[r.note] ?? r.note}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
