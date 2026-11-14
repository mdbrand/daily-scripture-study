import { NextResponse } from 'next/server';
import { getSessionEmail, isAdmin } from '@/lib/session';
import { rpc } from '@/lib/supabaseRpc';
import { gate } from '@/lib/partners';
import { generateStudy, postalAddress, sendCheckinPreview, sendPreview } from '@/lib/daily';

export const runtime = 'nodejs';
export const maxDuration = 300;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Admin actions from /admin/studies (plain form posts).
export async function POST(req: Request) {
  const email = await getSessionEmail();
  if (!isAdmin(email)) return NextResponse.redirect(new URL('/admin/studies', req.url), 303);
  const form = await req.formData();
  const action = String(form.get('action') || '');
  const date = String(form.get('date') || '');
  const back = (msg: string) =>
    NextResponse.redirect(new URL(`/admin/studies?${DATE.test(date) ? `date=${date}&` : ''}msg=${msg}`, req.url), 303);

  try {
    switch (action) {
      case 'hold':
      case 'approve':
        if (!DATE.test(date)) return back('bad-date');
        await rpc('dss_study_set_status', { p_gate: gate(), p_date: date, p_status: action === 'hold' ? 'held' : 'approved' });
        return back(action === 'hold' ? 'held' : 'approved');
      case 'write':
        if (!DATE.test(date)) return back('bad-date');
        await generateStudy(date);
        return back('written');
      case 'test-free':
      case 'test-premium':
      case 'test-premium-memory':
        if (!DATE.test(date)) return back('bad-date');
        await sendPreview(date, email!, action !== 'test-free', action === 'test-premium-memory');
        return back('test-sent');
      case 'test-checkin':
      case 'test-checkin-followup':
        await sendCheckinPreview(email!, action === 'test-checkin-followup');
        return back('test-sent');
      case 'sending-on':
        if (!postalAddress()) return back('need-address');
        await rpc('dss_set_send_open', { p_gate: gate(), p_open: true });
        return back('sending-on');
      case 'sending-off':
        await rpc('dss_set_send_open', { p_gate: gate(), p_open: false });
        return back('sending-off');
      default:
        return back('unknown');
    }
  } catch (e) {
    console.error('admin studies', action, e);
    return back('error');
  }
}
