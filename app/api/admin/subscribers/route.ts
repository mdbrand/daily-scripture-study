import { NextResponse } from 'next/server';
import { getSessionEmail, isAdmin } from '@/lib/session';
import { rpc } from '@/lib/supabaseRpc';
import { gate } from '@/lib/partners';

export const runtime = 'nodejs';

const go = (req: Request, path: string) => NextResponse.redirect(new URL(path, req.url), 303);
const view = (email: string, msg: string) => `/admin/subscribers/view?email=${encodeURIComponent(email)}&msg=${encodeURIComponent(msg)}`;

// Admin edits to subscribers (plain form posts): save, mark as spam, delete.
export async function POST(req: Request) {
  if (!isAdmin(await getSessionEmail())) return go(req, '/admin/subscribers');
  const form = await req.formData();
  const action = String(form.get('action') || '');

  try {
    if (action === 'save') {
      const email = String(form.get('email') || '');
      const patch = {
        email: String(form.get('new_email') || email).trim(),
        timezone: String(form.get('timezone') || '').trim(),
        plan_interest: String(form.get('plan_interest') || ''),
        unsubscribed: form.get('unsubscribed') === 'on',
        suspected_bot: form.get('suspected_bot') === 'on',
        beta_until: String(form.get('beta_until') || ''),
        admin_note: String(form.get('admin_note') || ''),
      };
      const r = await rpc<{ ok: boolean; error?: string; email?: string }>('dss_admin_subscriber_update', {
        p_gate: gate(),
        p_email: email,
        p_patch: patch,
      });
      return go(req, view(r.email ?? email, r.ok ? 'saved' : r.error || 'error'));
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
