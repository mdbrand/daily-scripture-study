// Server-side email quality checks. Not for the browser (the throwaway list is large).
import { promises as dns } from 'node:dns';
import disposable from 'disposable-email-domains';

const DISPOSABLE = new Set<string>(disposable as string[]);

// Real inboxes that hide the person's address. Allowed by default but flagged, so they can be
// reviewed or blocked later with one switch (BLOCK_PRIVACY_RELAYS=true).
const PRIVACY_RELAYS = new Set<string>([
  'proton.me', 'protonmail.com', 'protonmail.ch', 'pm.me',
  'tuta.io', 'tuta.com', 'tutanota.com', 'tutanota.de', 'tutamail.com', 'keemail.me',
  'privaterelay.appleid.com', 'mozmail.com', 'duck.com',
  'simplelogin.com', 'simplelogin.co', 'simplelogin.fr', 'aleeas.com', 'slmail.me', 'silomails.com',
  'anonaddy.com', 'anonaddy.me', 'addy.io', 'burnermail.io', 'relay.firefox.com',
]);

function domainAndParents(domain: string): string[] {
  const parts = domain.split('.');
  const out: string[] = [];
  for (let i = 0; i < parts.length - 1; i++) out.push(parts.slice(i).join('.'));
  return out;
}

export type EmailVerdict =
  | { ok: true; flag: 'privacy_relay' | null }
  | { ok: false; reason: 'disposable' | 'no_mail_server' | 'privacy_relay_blocked'; message: string };

async function canReceiveMail(domain: string): Promise<boolean | 'unknown'> {
  const withTimeout = <T,>(p: Promise<T>) =>
    Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 2500))]);
  try {
    const mx = await withTimeout(dns.resolveMx(domain));
    if (mx.length > 0) return true;
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code !== 'ENOTFOUND' && code !== 'ENODATA') return 'unknown';
  }
  // No MX: mail can still go to the domain's own address record.
  try {
    const a = await withTimeout(dns.resolve4(domain));
    return a.length > 0;
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    return code === 'ENOTFOUND' || code === 'ENODATA' ? false : 'unknown';
  }
}

export async function checkEmail(email: string): Promise<EmailVerdict> {
  const domain = email.slice(email.lastIndexOf('@') + 1);
  const chain = domainAndParents(domain);

  if (chain.some((d) => DISPOSABLE.has(d) && !PRIVACY_RELAYS.has(d))) {
    return {
      ok: false,
      reason: 'disposable',
      message: 'Please use your everyday email. Temporary inboxes expire before the studies arrive.',
    };
  }

  const relay = chain.some((d) => PRIVACY_RELAYS.has(d));
  if (relay && process.env.BLOCK_PRIVACY_RELAYS === 'true') {
    return {
      ok: false,
      reason: 'privacy_relay_blocked',
      message: 'Please use your everyday email address so your studies reach you.',
    };
  }

  // Never turn a real person away because of a slow DNS lookup: only reject a clear "no".
  if ((await canReceiveMail(domain)) === false) {
    return {
      ok: false,
      reason: 'no_mail_server',
      message: `We can’t deliver to “${domain}”. Please check the spelling of your email.`,
    };
  }

  return { ok: true, flag: relay ? 'privacy_relay' : null };
}
