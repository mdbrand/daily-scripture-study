import { rpc } from './supabaseRpc';
import { gate } from './partners';
import { resendKey } from './email/send';
import { renderCheckinEmail, renderDailyEmail, renderWelcomeEmail, type DailyStudy, type MailFooter } from './email/templates';
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
export const oneClickUrl = (token: string) => `${SITE}/api/unsubscribe/${token}`;

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

export function toDailyStudy(date: string, c: StudyContent, premium: boolean, yesterday?: DailyStudy['yesterday'] | null): DailyStudy {
  return {
    dateLabel: dateLabel(date),
    subject: c.subject,
    pillar: c.pillar,
    title: c.title,
    passage: c.passage,
    intro: c.intro,
    behind: c.behind.slice(0, 3),
    detail: c.detail,
    voices: (c.voices ?? []).slice(0, 1),
    readMore: c.readMore.map((l) => ({ label: l.label, url: l.passage_ref ? gatewayUrl(l.passage_ref) : undefined })),
    edition: premium ? 'premium' : 'free',
    yesterday: premium && yesterday ? yesterday : undefined,
  };
}

// ---------- sending (Resend batch API: up to 100 emails per call) ----------
type Outgoing = { to: string; subject: string; html: string; text: string; unsubscribeUrl: string };

export async function sendBatch(emails: Outgoing[]): Promise<string[]> {
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
type DueRecipient = Recipient & { study_date: string; yesterday: DailyStudy['yesterday'] | null };

// Sends each reader the study for their local date once it's 5 AM where they live.
// Runs every hour; the database decides who is due (5:00–7:59 AM local, not yet sent).
export async function sendDue(budgetMs = 240_000) {
  const postal = postalAddress();
  if (!postal) throw new Error('DSS_POSTAL_ADDRESS is not set; emails need a mailing address to be legal.');
  const studies = new Map<string, StoredStudy | null>();
  const started = Date.now();
  let sent = 0;
  while (Date.now() - started < budgetMs) {
    const batch = await rpc<DueRecipient[]>('dss_due_recipients', { p_gate: gate(), p_limit: 100 });
    if (batch.length === 0) return { sent, done: true };
    for (const d of new Set(batch.map((r) => r.study_date))) {
      if (!studies.has(d)) studies.set(d, await getStudy(d));
    }
    const emails = batch.map((r) => {
      const study = studies.get(r.study_date)!;
      const footer = footerFor(r.unsub_token, postal);
      const m = renderDailyEmail(toDailyStudy(r.study_date, study.content, r.premium, r.yesterday), footer);
      return { to: r.email, ...m, unsubscribeUrl: oneClickUrl(r.unsub_token) };
    });
    const ids = await sendBatch(emails);
    // Record per date (a batch can span two local dates near midnight UTC).
    for (const d of new Set(batch.map((r) => r.study_date))) {
      await rpc('dss_record_sends', {
        p_gate: gate(),
        p_date: d,
        p_rows: batch.flatMap((r, i) => (r.study_date === d ? [{ email: r.email, resend_id: ids[i] ?? null }] : [])),
      });
    }
    sent += batch.length;
    await new Promise((r) => setTimeout(r, 600)); // stay under Resend's default 2 requests/second
  }
  return { sent, done: false, reason: 'time budget used; the next hourly run continues' };
}

// Evening check-ins for Premium readers (8 PM their time). Their reply shapes tomorrow's study.
export async function sendCheckins(budgetMs = 60_000) {
  const postal = postalAddress();
  if (!postal) return 0;
  const started = Date.now();
  let sent = 0;
  while (Date.now() - started < budgetMs) {
    const batch = await rpc<{ email: string; unsub_token: string; local_date: string }[]>('dss_due_checkins', {
      p_gate: gate(),
      p_limit: 100,
    });
    if (batch.length === 0) break;
    const emails = batch.map((r) => {
      const footer = footerFor(r.unsub_token, postal);
      const dayIndex = Math.floor(new Date(`${r.local_date}T12:00:00Z`).getTime() / 86400000);
      return { to: r.email, ...renderCheckinEmail({ footer, dayIndex }), unsubscribeUrl: oneClickUrl(r.unsub_token) };
    });
    const ids = await sendBatch(emails);
    await rpc('dss_record_checkins', {
      p_gate: gate(),
      p_rows: batch.map((r, i) => ({ email: r.email, local_date: r.local_date, resend_id: ids[i] ?? null })),
    });
    sent += batch.length;
    await new Promise((r) => setTimeout(r, 600));
  }
  return sent;
}

export async function sendCheckinPreview(to: string) {
  const footer = footerFor('preview', postalAddress() ?? '(mailing address not set yet)');
  const dayIndex = Math.floor(Date.now() / 86400000);
  await sendBatch([{ to, ...renderCheckinEmail({ footer, dayIndex, isTest: true }), unsubscribeUrl: footer.unsubscribeUrl }]);
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

// What a Premium reader sees after replying with a note about their day (used only in previews).
export const SAMPLE_YESTERDAY: NonNullable<DailyStudy['yesterday']> = {
  reply: '(Sample) Long day at work, and I snapped at my kids when I got home. I felt awful about it all night.',
  passage: {
    text: 'Because of the LORD’s great love we are not consumed, for his compassions never fail. They are new every morning; great is your faithfulness.',
    ref: 'Lamentations 3:22–23 (NIV)',
  },
  body: [
    'These words were written in the rubble of Jerusalem, by someone who had every reason to give up. In the middle of real grief, he remembers one thing: God’s mercy does not run out overnight. It is new every morning.',
    'A hard evening doesn’t get the last word on you as a parent. This morning is a fresh start, and the same mercy God shows you is the mercy you can show your kids. A simple “I’m sorry I was short with you last night” teaches them more about grace than a perfect day would.',
    'Today, you might ask God for patience before you walk in the door this evening.',
  ],
  voice: {
    name: 'John Newton',
    dates: '1725–1807',
    kind: 'Thematic connection',
    body:
      'Before he became a pastor, Newton worked in the Atlantic slave trade, and he carried the weight of that past for the rest of his life. He never excused it. Instead he wrote, again and again, about grace that meets people who know exactly how far they have fallen. His best-known hymn, “Amazing Grace,” comes out of that experience: not a man who had it all together, but one who had been forgiven much and kept learning to receive it.',
    source: 'John Newton, “Amazing Grace,” written for a New Year’s Day sermon in 1773 and published in Olney Hymns (1779)',
  },
};

// A single preview copy (admin test sends). Not logged as a subscriber send.
export async function sendPreview(date: string, to: string, premium: boolean) {
  const study = await getStudy(date);
  if (!study) throw new Error('No study for that date yet.');
  const footer = footerFor('preview', postalAddress() ?? '(mailing address not set yet)');
  const m = renderDailyEmail({ ...toDailyStudy(date, study.content, premium, premium ? SAMPLE_YESTERDAY : null), isTest: true }, footer);
  await sendBatch([{ to, ...m, subject: `[Preview · ${premium ? 'Premium' : 'Free'}] ${m.subject}`, unsubscribeUrl: footer.unsubscribeUrl }]);
}
