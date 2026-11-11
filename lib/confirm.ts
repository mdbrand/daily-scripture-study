import { rpc } from './supabaseRpc';
import { sendEmail } from './email/send';
import { renderConfirmEmail, renderGiftEmail } from './email/templates';
import { GIFTS, type GiftKey } from './gifts';
import { lamplighterStats } from './lamplighters';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://morninglamp.study';

// Sends the confirm-your-email message (at most once every 10 minutes per address; never to bots
// or people already confirmed). Nobody gets study emails until they confirm.
export async function sendConfirmation(
  email: string,
  opts: { lamplighter?: boolean; origin?: string; invite?: { premium: boolean }; gift?: GiftKey | null } = {},
) {
  const gate = process.env.DSS_DB_GATE;
  if (!gate) return false;
  const r = await rpc<{ send: boolean; token?: string }>('dss_confirm_prepare', { p_gate: gate, p_email: email });
  const base = opts.origin?.startsWith('http://localhost') ? opts.origin : SITE;
  const gift = opts.gift ? GIFTS[opts.gift] : null;
  if (!r.send || !r.token) {
    // Already a confirmed reader asking for a plan: no confirm step needed, so email the plan itself.
    if (gift && !r.token) {
      const reader = await rpc<{ mailable: boolean } | null>('dss_reader_lookup', { p_gate: gate, p_email: email }).catch(() => null);
      // At most 2 plan emails per address per hour, so the form can't be used to pester a reader.
      const allowed =
        !!reader?.mailable &&
        (await rpc<boolean>('dss_rate_hit', { p_gate: gate, p_key: `gift:${email}`, p_window_seconds: 3600, p_max: 2 }).catch(() => false));
      if (allowed) {
        await sendEmail({ to: email, ...renderGiftEmail({ name: gift.name, about: gift.about, link: `${base}${gift.href}` }) });
        return true;
      }
    }
    return false;
  }
  const foundingOpen = !opts.invite && !opts.lamplighter && (await lamplighterStats()).open;
  await sendEmail({
    to: email,
    ...renderConfirmEmail({
      link: `${base}/confirm/${r.token}${opts.gift ? `?gift=${opts.gift}` : ''}`,
      lamplighter: opts.lamplighter,
      invite: opts.invite,
      foundingOpen,
      gift: gift?.name,
    }),
  });
  return true;
}
