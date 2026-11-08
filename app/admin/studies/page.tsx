import type { Metadata } from 'next';
import Link from 'next/link';
import LegalShell from '../../LegalShell';
import { getSessionEmail, isAdmin } from '@/lib/session';
import { dailySettings, dateLabel, footerFor, getStudy, listStudies, pacificDate, postalAddress, toDailyStudy } from '@/lib/daily';
import { renderDailyEmail } from '@/lib/email/templates';

export const metadata: Metadata = { title: 'Daily studies | Morning Lamp', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const messages: Record<string, string> = {
  held: 'On hold. It won’t be sent unless you approve it again.',
  approved: 'Approved. It will go out on its date.',
  written: 'Written. Read it over below.',
  'test-sent': 'A test copy is on its way to your inbox.',
  'sending-on': 'Daily sending is on. New subscribers get a welcome email, and studies go out each morning.',
  'sending-off': 'Daily sending is off. Nothing will be emailed to subscribers.',
  'need-address':
    'Add a mailing address first (DSS_POSTAL_ADDRESS on Vercel). US law requires one in every marketing email.',
  error: 'That didn’t work. Check the server logs, or try again in a minute.',
  'bad-date': 'That date isn’t valid.',
};

const STATUS: Record<string, string> = { approved: 'Approved', held: 'On hold', sent: 'Sent' };

function Action({ action, date, label, kind = 'button' }: { action: string; date?: string; label: string; kind?: string }) {
  return (
    <form action="/api/admin/studies" method="post" style={{ display: 'inline-block', margin: '0 10px 10px 0' }}>
      <input type="hidden" name="action" value={action} />
      {date && <input type="hidden" name="date" value={date} />}
      <button type="submit" className={kind}>{label}</button>
    </form>
  );
}

export default async function AdminStudies({ searchParams }: { searchParams: Promise<{ date?: string; msg?: string }> }) {
  const email = await getSessionEmail();
  if (!isAdmin(email)) {
    return (
      <LegalShell title="Daily studies">
        <p>
          This page is for Morning Lamp staff. <Link href="/partners">Sign in</Link> with an admin email address, then
          come back here.
        </p>
      </LegalShell>
    );
  }

  const { date: qDate, msg } = await searchParams;
  const tomorrow = pacificDate(1);
  const date = qDate && /^\d{4}-\d{2}-\d{2}$/.test(qDate) ? qDate : tomorrow;
  const [settings, list, study] = await Promise.all([dailySettings(), listStudies(30), getStudy(date)]);
  const address = postalAddress();
  const preview = study
    ? renderDailyEmail(toDailyStudy(date, study.content, false), footerFor('preview', address ?? '(mailing address not set)'))
    : null;

  return (
    <LegalShell title="Daily studies">
      {msg && messages[msg] && <p className="partner-notice" role="status">{messages[msg]}</p>}

      <dl className="partner-stats">
        <div><dt>Daily sending</dt><dd>{settings.send_open ? 'On' : 'Off'}</dd></div>
        <div><dt>Subscribers who get mail</dt><dd>{settings.mailable}</dd></div>
        <div><dt>Mailing address</dt><dd style={{ fontSize: 18 }}>{address ? 'Set' : 'Missing'}</dd></div>
      </dl>
      <p className="form-note">
        Each morning around 7 AM Pacific, tomorrow’s study is written and you get an email to review it. The next day it
        reaches each reader at 5 AM in their own time zone, unless you put it on hold first.
      </p>
      {settings.send_open ? (
        <Action action="sending-off" label="Turn daily sending off" kind="link-button" />
      ) : (
        <Action action="sending-on" label="Turn daily sending on" />
      )}

      <h2>{dateLabel(date)}</h2>
      {study ? (
        <>
          <p>
            <strong>{study.content.title}</strong>
            <br />
            {study.content.passage.ref} · {study.content.pillar} · {STATUS[study.status]}
            {study.sent_count > 0 ? `, sent to ${study.sent_count} so far` : ''}
          </p>
          {study.status === 'approved' && <Action action="hold" date={date} label="Put on hold" />}
          {study.status === 'held' && <Action action="approve" date={date} label="Approve" />}
          {study.sent_count === 0 && <Action action="write" date={date} label="Rewrite it" kind="link-button" />}
          <Action action="test-free" date={date} label="Email me the free version" kind="link-button" />
          <Action action="test-premium" date={date} label="Email me the Premium version" kind="link-button" />
          <iframe
            title="Email preview"
            srcDoc={preview!.html}
            style={{ width: '100%', height: 1400, border: '1px solid var(--rule)', borderRadius: 6, background: '#fff', marginTop: 12 }}
          />
        </>
      ) : (
        <>
          <p>No study written for this date yet. Writing one takes a minute or two.</p>
          <Action action="write" date={date} label="Write it now" />
        </>
      )}

      <h2>Recent and upcoming</h2>
      {list.length === 0 ? (
        <p>None yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="partner-table">
            <thead>
              <tr><th>Date</th><th>Passage</th><th>Title</th><th>Status</th></tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.study_date}>
                  <td><Link href={`/admin/studies?date=${s.study_date}`}>{s.study_date}</Link></td>
                  <td>{s.ref}</td>
                  <td>{s.title}</td>
                  <td>{STATUS[s.status] ?? s.status}{s.sent_count > 0 ? `, sent to ${s.sent_count}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="form-note">
        <Link href={`/admin/studies?date=${pacificDate(0)}`}>Today</Link> ·{' '}
        <Link href={`/admin/studies?date=${tomorrow}`}>Tomorrow</Link> ·{' '}
        <Link href="/admin/partners">Partner report</Link>
      </p>
    </LegalShell>
  );
}
