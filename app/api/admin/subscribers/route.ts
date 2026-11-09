import { after, NextResponse } from 'next/server';
import { getSessionEmail, isAdmin } from '@/lib/session';
import { rpc } from '@/lib/supabaseRpc';
import { gate } from '@/lib/partners';
import { sendConfirmation } from '@/lib/confirm';
import { sendTodayTo, welcomeAndToday } from '@/lib/daily';

export const runtime = 'nodejs';

const go = (req: Request, path: string) => NextResponse.redirect(new URL(path, req.url), 303);
const view = (email: string, msg: string) => `/admin/subscribers/view?email=${encodeURIComponent(email)}&msg=${encodeURIComponent(msg)}`;

// Admin edits to subscribers (plain form posts): save, mark as spam, delete.
export async function POST(req: Request) {
  const admin = await getSessionEmail();
  if (!isAdmin(admin)) return go(req, '/admin/subscribers');
  const form = await req.formData();
  const action = String(form.get('action') || '');

  // Add people by hand: "start" = they get email right away; "invite" = they get a confirm invite first.
  if (action === 'add') {
    const mode = String(form.get('mode') || '') === 'start' ? 'start' : 'invite';
    const premium = form.get('premium') === 'on';
    const timezone = String(form.get('timezone') || '').trim();
    const emails = [...new Set((String(form.get('emails') || '').toLowerCase().match(/[^\s,;<>()"']+@[^\s,;<>()"']+\.[a-z]{2,}/g) ?? []))].slice(0, 200);
    if (emails.length === 0) return go(req, '/admin/subscribers?addmsg=none');
    const counts = { added: 0, existing: 0 };
    const skipped: string[] = [];
    const toInvite: string[] = [];
    const started: string[] = [];
    for (const e of emails) {
      try {
        const r = await rpc<{ status: string; confirmed?: boolean }>('dss_admin_add_subscriber', {
          p_gate: gate(),
          p_email: e,
          p_premium: premium,
          p_start_now: mode === 'start',
          p_timezone: timezone,
          p_added_by: admin,
        });
        if (r.status === 'added' || r.status === 'existing') {
          counts[r.status] += 1;
          if (mode === 'invite' && !r.confirmed) toInvite.push(e);
          if (mode === 'start') started.push(e);
        } else skipped.push(`${e} (${r.status === 'unsubscribed' ? 'unsubscribed earlier' : 'not a valid email'})`);
      } catch {
        skipped.push(`${e} (error)`);
      }
    }
    const origin = new URL(req.url).origin;
    after(async () => {
      try {
        for (const e of toInvite) await sendConfirmation(e, { origin, invite: { premium } });
        if (mode === 'start') await welcomeAndToday(started);
      } catch (err) {
        console.error('admin add', err);
      }
    });
    const sp = new URLSearchParams({ addmsg: mode, added: String(counts.added), existing: String(counts.existing), invited: String(toInvite.length) });
    if (skipped.length) sp.set('skipped', skipped.join(', ').slice(0, 1500));
    return go(req, `/admin/subscribers?${sp}`);
  }

  try {
    if (action === 'save') {
      const email = String(form.get('email') || '');
      const patch = {
        email: String(form.get('new_email') || email).trim(),
        timezone: String(form.get('timezone') || '').trim(),
        plan_interest: String(form.get('plan_interest') || ''),
        unsubscribed: form.get('unsubscribed') === 'on',
        suspected_bot: form.get('suspected_bot') === 'on',
        beta_until: form.get('lifetime') === 'on' ? 'lifetime' : String(form.get('beta_until') || ''),
        admin_note: String(form.get('admin_note') || ''),
      };
      const r = await rpc<{ ok: boolean; error?: string; email?: string }>('dss_admin_subscriber_update', {
        p_gate: gate(),
        p_email: email,
        p_patch: patch,
      });
      if (r.ok) {
        await rpc('dss_admin_set_confirmed', { p_gate: gate(), p_email: r.email ?? email, p_confirmed: form.get('confirmed') === 'on' });
      }
      return go(req, view(r.email ?? email, r.ok ? 'saved' : r.error || 'error'));
    }

    // "Send today's study now" (manual: any hour, even while daily sending is off; never twice a day).
    if (action === 'today') {
      const email = String(form.get('email') || '');
      const r = await sendTodayTo(email, true);
      return go(req, view(email, `today_${r.status}`));
    }

    if (action === 'spam') {
      const email = String(form.get('email') || '');
      const r = await rpc<{ ok: boolean; error?: string }>('dss_admin_subscriber_update', {
        p_gate: gate(),
        p_email: email,
        p_patch: { suspected_bot: true, unsubscribed: true },
      });
      return go(req, view(email, r.ok ? 'spam' : r.error || 'error'));
    }

    if (action === 'delete') {
      const emails = form.getAll('email').map(String).filter(Boolean).slice(0, 200);
      const r = await rpc<{ deleted: number; blocked: string[] }>('dss_admin_subscriber_delete', { p_gate: gate(), p_emails: emails });
      const sp = new URLSearchParams({ deleted: String(r.deleted) });
      if (r.blocked.length) sp.set('blocked', r.blocked.join(','));
      return go(req, `/admin/subscribers?${sp.toString()}`);
    }
  } catch (e) {
    console.error('admin subscribers', action, e);
  }
  return go(req, '/admin/subscribers?msg=error');
}
