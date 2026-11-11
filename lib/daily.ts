import { rpc } from './supabaseRpc';
import { gate } from './partners';
import { resendKey } from './email/send';
import { renderCheckinEmail, renderDailyEmail, renderWelcomeEmail, type DailyStudy, type MailFooter, renderLamplighterAccepted } from './email/templates';
import { PILLARS, writeStudy, type RecentStudy, type StudyContent } from './studyWriter';
import { recordSent, withTracking, type TrackRef } from './emailEvents';

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
  return { unsubscribeUrl: `${SITE}/u/${token}`, postalAddress: postal, seasonBase: `${SITE}/s/${token}` };
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
// track: set on real subscriber emails so opens and clicks can be measured. Previews and test copies leave it off.
type Outgoing = { to: string; subject: string; html: string; text: string; unsubscribeUrl: string; track?: TrackRef };

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
        html: e.track ? withTracking(e.html, e.track) : e.html,
        text: e.text,
        ...(replyTo ? { reply_to: replyTo } : {}),
        // One-click unsubscribe (required by Gmail and Yahoo for bulk senders).
        headers: { 'List-Unsubscribe': `<${e.unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      })),
    ),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend batch ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  const ids = ((body.data ?? []) as { id: string }[]).map((d) => d.id);
  await recordSent(emails.flatMap((e, i) => (e.track ? [{ track: e.track, resendId: ids[i] }] : [])));
  return ids;
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
      return { to: r.email, ...m, unsubscribeUrl: oneClickUrl(r.unsub_token), track: { token: r.unsub_token, kind: 'study' as const, date: r.study_date } };
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
      // The morning a reply or season tap tonight writes for (dss_season_set: after 5 AM local -> tomorrow).
      const nextDate = new Date((dayIndex + 1) * 86400000 + 43200000).toISOString().slice(0, 10);
      return {
        to: r.email,
        ...renderCheckinEmail({ footer, dayIndex, nextDate }),
        unsubscribeUrl: oneClickUrl(r.unsub_token),
        track: { token: r.unsub_token, kind: 'checkin' as const, date: r.local_date },
      };
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
  await sendBatch([{ to, ...renderCheckinEmail({ footer, dayIndex, nextDate: pacificDate(1), isTest: true }), unsubscribeUrl: footer.unsubscribeUrl }]);
}

// Welcome emails for people who joined but haven't been welcomed yet.
// todayFor: people whose welcome should say today's study is in the next email.
export async function sendWelcomes(limit = 100, todayFor?: Set<string>) {
  const postal = postalAddress();
  if (!postal) return 0;
  const pending = await rpc<Recipient[]>('dss_welcome_pending', { p_gate: gate(), p_limit: limit });
  if (pending.length === 0) return 0;
  const emails = pending.map((r) => {
    const footer = footerFor(r.unsub_token, postal);
    return {
      to: r.email,
      ...renderWelcomeEmail({ premium: r.premium, footer, todayNext: todayFor?.has(r.email.toLowerCase()) }),
      unsubscribeUrl: oneClickUrl(r.unsub_token),
      track: { token: r.unsub_token, kind: 'welcome' as const, date: pacificDate(0) },
    };
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

// ---------- one person, today (joined after the 5 AM run) ----------
export type TodayResult = {
  status: 'ok' | 'not_found' | 'unsubscribed' | 'flagged' | 'unconfirmed' | 'sending_off' | 'outside_hours' | 'no_study' | 'already' | 'error';
  study_date?: string;
};
type TodayClaim = TodayResult & { email?: string; unsub_token?: string; premium?: boolean; yesterday?: DailyStudy['yesterday'] | null };

// Would today's study go to this person right now? (No send; used to word the welcome email.)
export const todayCheck = (email: string, manual = false) =>
  rpc<TodayResult>('dss_today_claim', { p_gate: gate(), p_email: email, p_manual: manual, p_dry: true });

// Sends today's study (for their local date) to one person. manual = the admin button (any hour, even
// while daily sending is off); otherwise only 5 AM to 7:59 PM their time while sending is on. Never twice.
export async function sendTodayTo(email: string, manual = false): Promise<TodayResult> {
  const postal = postalAddress();
  if (!postal) return { status: 'error' };
  const c = await rpc<TodayClaim>('dss_today_claim', { p_gate: gate(), p_email: email, p_manual: manual, p_dry: false });
  if (c.status !== 'ok' || !c.email || !c.unsub_token || !c.study_date) return { status: c.status, study_date: c.study_date };
  try {
    const study = await getStudy(c.study_date);
    if (!study) throw new Error('study vanished');
    const m = renderDailyEmail(toDailyStudy(c.study_date, study.content, !!c.premium, c.yesterday), footerFor(c.unsub_token, postal));
    const [id] = await sendBatch([
      { to: c.email, ...m, unsubscribeUrl: oneClickUrl(c.unsub_token), track: { token: c.unsub_token, kind: 'study', date: c.study_date } },
    ]);
    await rpc('dss_today_finish', { p_gate: gate(), p_email: c.email, p_date: c.study_date, p_resend_id: id ?? null, p_ok: true });
    return { status: 'ok', study_date: c.study_date };
  } catch (e) {
    console.error('sendTodayTo', email, e);
    await rpc('dss_today_finish', { p_gate: gate(), p_email: c.email, p_date: c.study_date, p_resend_id: null, p_ok: false }).catch(() => {});
    return { status: 'error', study_date: c.study_date };
  }
}

// Right after someone confirms (or is started by an admin): welcome first, then today's study if they
// joined after their 5 AM and it's before 8 PM their time. Does nothing while daily sending is off.
// A brand-new Founding Lamplighter: their welcome IS the Lamplighter welcome (Premium for life),
// then today's study if it's still today's window. Marks them welcomed so the generic welcome doesn't follow.
export async function welcomeFounding(email: string) {
  const postal = postalAddress();
  if (!postal || !(await dailySettings()).send_open) return;
  const me = (await rpc<{ email: string; unsub_token: string }[]>('dss_lamplighters_active', { p_gate: gate() })).find(
    (a) => a.email === email.toLowerCase(),
  );
  if (!me) return welcomeAndToday([email]);
  const today = (await todayCheck(email)).status === 'ok';
  await sendBatch([
    {
      to: me.email,
      ...renderLamplighterAccepted({ footer: footerFor(me.unsub_token, postal), todayNext: today }),
      unsubscribeUrl: oneClickUrl(me.unsub_token),
      track: { token: me.unsub_token, kind: 'welcome', date: pacificDate(0) },
    },
  ]);
  await rpc('dss_mark_welcomed', { p_gate: gate(), p_emails: [me.email] });
  if (today) await sendTodayTo(email);
}

export async function welcomeAndToday(emails: string[]) {
  if (!(await dailySettings()).send_open) return;
  const today = new Set<string>();
  for (const e of emails) {
    if ((await todayCheck(e)).status === 'ok') today.add(e.toLowerCase());
  }
  await sendWelcomes(Math.max(10, emails.length + 10), today);
  for (const e of today) await sendTodayTo(e);
}

// ---------- admin: send one reader a given day's email again ----------
// Uses whatever is on file now (e.g. a Last Night's Lamp written after their first copy went out).
// Not recorded as a send; their original send stays on file.
export async function resendDay(email: string, date: string): Promise<'ok' | 'not_found' | 'not_mailable' | 'no_study' | 'error'> {
  const postal = postalAddress();
  if (!postal) return 'error';
  const info = await rpc<{ status: string; email?: string; unsub_token?: string; premium?: boolean; yesterday?: DailyStudy['yesterday'] | null }>(
    'dss_resend_info',
    { p_gate: gate(), p_email: email, p_date: date },
  );
  if (info.status !== 'ok' || !info.email || !info.unsub_token) return info.status as 'not_found' | 'not_mailable';
  const study = await getStudy(date);
  if (!study) return 'no_study';
  const m = renderDailyEmail(toDailyStudy(date, study.content, !!info.premium, info.yesterday ?? null), footerFor(info.unsub_token, postal));
  await sendBatch([{ to: info.email, ...m, unsubscribeUrl: oneClickUrl(info.unsub_token), track: { token: info.unsub_token, kind: 'study', date } }]);
  return 'ok';
}
