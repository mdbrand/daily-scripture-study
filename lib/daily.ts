import { rpc } from './supabaseRpc';
import { gate } from './partners';
import { resendKey } from './email/send';
import { renderDailyEmail, renderWelcomeEmail, type DailyStudy, type MailFooter } from './email/templates';
import { PILLARS, writeStudy, type RecentStudy, type StudyContent } from './studyWriter';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://morninglamp.study';
const TZ = 'America/Los_Angeles';

// ---------- dates (Morning Lamp runs on Pacific time) ----------
export function pacificDate(offsetDays = 0, now = new Date()): string {
  const d = new Date(now.getTime() + offsetDays * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
export function dateLabel(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
export function pillarFor(date: string): string {
  return PILLARS[new Date(`${date}T12:00:00Z`).getUTCDay()];
}

// ---------- settings ----------
export type DailySettings = { send_open: boolean; mailable: number };
export const dailySettings = () => rpc<DailySettings>('dss_daily_settings', { p_gate: gate() });

export function postalAddress(): string | null {
  const a = process.env.DSS_POSTAL_ADDRESS?.trim();
  return a ? a : null;
}

export function footerFor(token: string, postal: string): MailFooter {
  return { unsubscribeUrl: `${SITE}/u/${token}`, postalAddress: postal };
}
// The List-Unsubscribe header target: mail apps POST here for one-click unsubscribe.
const oneClickUrl = (token: string) => `${SITE}/api/unsubscribe/${token}`;

// ---------- studies ----------
export type StoredStudy = {
  study_date: string;
  status: 'approved' | 'held' | 'sent';
  content: StudyContent;
  sent_count: number;
  sent_at: string | null;
};
export const getStudy = (date: string) => rpc<StoredStudy | null>('dss_study_get', { p_gate: gate(), p_date: date });
export const listStudies = (limit = 60) =>
  rpc<{ study_date: string; status: string; sent_count: number; title: string; ref: string; pillar: string }[]>(
    'dss_study_list',
    { p_gate: gate(), p_limit: limit },
  );

export async function generateStudy(date: string): Promise<StudyContent> {
  const recent: RecentStudy[] = (await listStudies(120)).filter((r) => r.study_date !== date);
  const content = await writeStudy({ date: dateLabel(date), pillar: pillarFor(date), recent });
  await rpc('dss_study_upsert', { p_gate: gate(), p_date: date, p_content: content });
  return content;
}

const gatewayUrl = (ref: string) =>
  `https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref.replace(/\s*\(NIV\)\s*$/i, ''))}&version=NIV`;

export function toDailyStudy(date: string, c: StudyContent, premium: boolean): DailyStudy {
  return {
    dateLabel: dateLabel(date),
    subject: c.subject,
    pillar: c.pillar,
    title: c.title,
    passage: c.passage,
    intro: c.intro,
    behind: c.behind,
    detail: c.detail,
    voices: c.voices,
    readMore: c.readMore.map((l) => ({ label: l.label, url: l.passage_ref ? gatewayUrl(l.passage_ref) : undefined })),
    verseForLife: premium ? c.verseForLife : undefined,
  };
}

// ---------- sending (Resend batch API: up to 100 emails per call) ----------
type Outgoing = { to: string; subject: string; html: string; text: string; unsubscribeUrl: string };

async function sendBatch(emails: Outgoing[]): Promise<string[]> {
  const key = resendKey();
  const from = process.env.DSS_FROM_EMAIL;
  if (!key || !from) throw new Error('Resend is not configured');
  const replyTo = process.env.DSS_REPLY_TO_EMAIL;
  const res = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(
      emails.map((e) => ({
        from,
        to: [e.to],
        subject: e.subject,
        html: e.html,
        text: e.text,
        ...(replyTo ? { reply_to: replyTo } : {}),
        // One-click unsubscribe (required by Gmail and Yahoo for bulk senders).
        headers: { 'List-Unsubscribe': `<${e.unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      })),
    ),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend batch ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  return ((body.data ?? []) as { id: string }[]).map((d) => d.id);
}

type Recipient = { email: string; unsub_token: string; premium: boolean };

// Sends one date's study to everyone who hasn't had it yet, until done or out of time.
export async function sendStudy(date: string, budgetMs = 240_000) {
  const postal = postalAddress();
  if (!postal) throw new Error('DSS_POSTAL_ADDRESS is not set; emails need a mailing address to be legal.');
  const study = await getStudy(date);
  if (!study) return { sent: 0, done: false, reason: 'no study for this date' };
  if (study.status === 'held') return { sent: 0, done: false, reason: 'study is on hold' };

  const started = Date.now();
  let sent = 0;
  while (Date.now() - started < budgetMs) {
    const batch = await rpc<Recipient[]>('dss_daily_recipients', { p_gate: gate(), p_date: date, p_limit: 100 });
    if (batch.length === 0) {
      await rpc('dss_study_mark_sent', { p_gate: gate(), p_date: date });
      return { sent, done: true };
    }
    const emails = batch.map((r) => {
      const footer = footerFor(r.unsub_token, postal);
      const m = renderDailyEmail(toDailyStudy(date, study.content, r.premium), footer);
      return { to: r.email, ...m, unsubscribeUrl: oneClickUrl(r.unsub_token) };
    });
    const ids = await sendBatch(emails);
    await rpc('dss_record_sends', {
      p_gate: gate(),
      p_date: date,
      p_rows: batch.map((r, i) => ({ email: r.email, resend_id: ids[i] ?? null })),
    });
    sent += batch.length;
    await new Promise((r) => setTimeout(r, 600)); // stay under Resend's default 2 requests/second
  }
  return { sent, done: false, reason: 'time budget used; the next run continues' };
}

// Welcome emails for people who joined but haven't been welcomed yet.
export async function sendWelcomes(limit = 100) {
  const postal = postalAddress();
  if (!postal) return 0;
  const pending = await rpc<Recipient[]>('dss_welcome_pending', { p_gate: gate(), p_limit: limit });
  if (pending.length === 0) return 0;
  const emails = pending.map((r) => {
    const footer = footerFor(r.unsub_token, postal);
    return { to: r.email, ...renderWelcomeEmail({ premium: r.premium, footer }), unsubscribeUrl: oneClickUrl(r.unsub_token) };
  });
  await sendBatch(emails);
  await rpc('dss_mark_welcomed', { p_gate: gate(), p_emails: pending.map((r) => r.email) });
  return pending.length;
}

// A single preview copy (admin test sends). Not logged as a subscriber send.
export async function sendPreview(date: string, to: string, premium: boolean) {
  const study = await getStudy(date);
  if (!study) throw new Error('No study for that date yet.');
  const footer = footerFor('preview', postalAddress() ?? '(mailing address not set yet)');
  const m = renderDailyEmail({ ...toDailyStudy(date, study.content, premium), isTest: true }, footer);
  await sendBatch([{ to, ...m, subject: `[Preview] ${m.subject}`, unsubscribeUrl: footer.unsubscribeUrl }]);
}
