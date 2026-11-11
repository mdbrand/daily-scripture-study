import { createHmac, timingSafeEqual } from 'node:crypto';
import { rpc } from './supabaseRpc';
import { gate } from './partners';

// Our own open and click tracking. We run it ourselves (not through the email provider) so we can
// see WHAT loaded the email: Apple Mail opens every message on its own, and counting those as reads
// would make the open rate a lie.
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://morninglamp.study';

export const MAIL_KINDS = ['study', 'checkin', 'welcome'] as const;
export type MailKind = (typeof MAIL_KINDS)[number];
// Which email this is: the reader (their unsubscribe token), the kind, and the date it was for.
export type TrackRef = { token: string; kind: MailKind; date: string };
export type EventSource = 'human' | 'apple' | 'bot';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function validRef(token: string, kind: string, date: string): TrackRef | null {
  if (!UUID.test(token) || !DATE.test(date) || !(MAIL_KINDS as readonly string[]).includes(kind)) return null;
  return { token: token.toLowerCase(), kind: kind as MailKind, date };
}

// ---------- link signing (so /r can never be used to bounce people to someone else's site) ----------
function secret(): string | null {
  return process.env.SESSION_SECRET || null;
}
export function signLink(url: string): string | null {
  const s = secret();
  return s ? createHmac('sha256', s).update(`ml-link:${url}`).digest('base64url').slice(0, 22) : null;
}
export function linkSignatureOk(url: string, sig: string | null): boolean {
  const want = signLink(url);
  if (!want || !sig || sig.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(sig), Buffer.from(want));
}

// ---------- adding tracking to an email's HTML ----------
const unescapeAttr = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Web links go through /r (which records the click, then sends the reader on). The unsubscribe link is
// left alone so nothing can ever get between a reader and leaving. Then a 1x1 image marks the open.
export function withTracking(html: string, t: TrackRef): string {
  if (!validRef(t.token, t.kind, t.date)) return html;
  const base = `${SITE}/r/${t.token}/${t.kind}/${t.date}`;
  let out = html.replace(/href="(https?:\/\/[^"]+)"/g, (whole, raw: string) => {
    const url = unescapeAttr(raw);
    if (url.startsWith(`${SITE}/u/`) || url.startsWith(`${SITE}/api/unsubscribe/`)) return whole;
    const sig = signLink(url);
    if (!sig) return whole;
    return `href="${escapeAttr(`${base}?u=${encodeURIComponent(url)}&s=${sig}`)}"`;
  });
  const pixel = `<img src="${SITE}/o/${t.token}/${t.kind}/${t.date}.gif" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`;
  out = out.includes('</body>') ? out.replace('</body>', `${pixel}</body>`) : out + pixel;
  return out;
}

// ---------- who (or what) loaded it ----------
const BOT_UA =
  /bot\b|crawl|spider|scan|preview|monitor|headless|phantom|python|curl|wget|okhttp|go-http|java\/|libwww|httpclient|axios|node-fetch|undici|barracuda|proofpoint|mimecast|symantec|trendmicro|fireeye|safelinks|urldefense|zgrab|facebookexternalhit|slackbot|whatsapp|telegram|skypeuripreview|bingpreview|google-safety|googleother/i;

// Apple Mail Privacy Protection downloads every image through Apple's relay as soon as the mail arrives,
// whether or not the person ever reads it. Those requests carry a bare "Mozilla/5.0" user agent with no
// device details (a real browser or mail app always says more). Apple's own network is 17.x.x.x.
export function classifyOpen(ua: string | null, ip: string | null): EventSource {
  const a = (ua || '').trim();
  if (a === 'Mozilla/5.0' || (ip || '').startsWith('17.')) return 'apple';
  if (!a || BOT_UA.test(a)) return 'bot';
  return 'human'; // includes Gmail's and Yahoo's image proxies, which fetch when the reader opens
}
export function classifyClick(ua: string | null): EventSource {
  const a = (ua || '').trim();
  if (!a || a === 'Mozilla/5.0' || BOT_UA.test(a)) return 'bot';
  return 'human';
}

// A short, private label for a clicked link: our own pages lose the reader's token and any tracking tags.
export function linkLabel(url: string): string {
  try {
    const u = new URL(url);
    if (u.origin === new URL(SITE).origin) {
      const path = u.pathname.replace(/^\/s\/[^/]+\//, '/s/').replace(/\/$/, '') || '/';
      return `${path}${u.hash}`.slice(0, 200);
    }
    const search = u.searchParams.get('search');
    return `${u.hostname.replace(/^www\./, '')}${u.pathname}${search ? ` (${search})` : ''}`.slice(0, 200);
  } catch {
    return 'link';
  }
}

export function clientIp(headers: Headers): string | null {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip');
}

// ---------- saving events (never throws: tracking must not break an email, an image or a link) ----------
export async function recordSent(rows: { track: TrackRef; resendId?: string | null }[]) {
  if (rows.length === 0) return;
  try {
    await rpc('dss_email_sent', {
      p_gate: gate(),
      p_rows: rows.map((r) => ({ token: r.track.token, kind: r.track.kind, date: r.track.date, resend_id: r.resendId ?? '' })),
    });
  } catch (e) {
    console.error('emailEvents: recordSent', e);
  }
}

export async function recordEvent(t: TrackRef, type: 'open' | 'click', source: EventSource, ua: string | null, link: string | null = null) {
  try {
    return await rpc<string>('dss_email_event', {
      p_gate: gate(),
      p_token: t.token,
      p_kind: t.kind,
      p_date: t.date,
      p_type: type,
      p_source: source,
      p_link: link,
      p_ua: ua,
    });
  } catch (e) {
    console.error('emailEvents: recordEvent', e);
    return 'error';
  }
}

const WEBHOOK_TYPES: Record<string, 'delivered' | 'bounced' | 'complained'> = {
  'email.delivered': 'delivered',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
};
// Resend's delivery events. Events for other sites on the same Resend account simply don't match a send.
export async function recordWebhook(eventType: string, resendId: string | undefined, dedupe: string | null) {
  const type = WEBHOOK_TYPES[eventType];
  if (!type || !resendId) return false;
  try {
    return await rpc<boolean>('dss_email_webhook', { p_gate: gate(), p_resend_id: resendId, p_type: type, p_dedupe: dedupe });
  } catch (e) {
    console.error('emailEvents: recordWebhook', e);
    return false;
  }
}

export async function recordReply(email: string, dedupe: string) {
  try {
    return await rpc<boolean>('dss_email_reply', { p_gate: gate(), p_email: email, p_dedupe: dedupe });
  } catch (e) {
    console.error('emailEvents: recordReply', e);
    return false;
  }
}
