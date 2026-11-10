import { rpc } from './supabaseRpc';
import { sendEmail } from './email/send';
import { renderConfirmEmail } from './email/templates';
import { lamplighterStats } from './lamplighters';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://morninglamp.study';

// Sends the confirm-your-email message (at most once every 10 minutes per address; never to bots
// or people already confirmed). Nobody gets study emails until they confirm.
export async function sendConfirmation(
  email: string,
  opts: { lamplighter?: boolean; origin?: string; invite?: { premium: boolean } } = {},
) {
  const gate = process.env.DSS_DB_GATE;
  if (!gate) return false;
  const r = await rpc<{ send: boolean; token?: string }>('dss_confirm_prepare', { p_gate: gate, p_email: email });
  if (!r.send || !r.token) return false;
  const base = opts.origin?.startsWith('http://localhost') ? opts.origin : SITE;
  const foundingOpen = !opts.invite && !opts.lamplighter && (await lamplighterStats()).open;
  await sendEmail({ to: email, ...renderConfirmEmail({ link: `${base}/confirm/${r.token}`, lamplighter: opts.lamplighter, invite: opts.invite, foundingOpen }) });
  return true;
}
