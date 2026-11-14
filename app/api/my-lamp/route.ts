import { NextResponse } from 'next/server';
import { getSessionEmail } from '@/lib/session';
import { MY_LAMP_ACTIONS, myLampAction, type MyLampAction } from '@/lib/myLamp';

export const runtime = 'nodejs';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// One change a signed-in reader makes to their own notes or memory. The email always comes from the
// session, never from the form, so nobody can act on someone else's notes.
export async function POST(req: Request) {
  const url = new URL(req.url);
  const back = (q: string) => NextResponse.redirect(new URL(`/my-lamp${q}`, url.origin), 303);

  // Forms on other sites can't act here: the session cookie is SameSite=Lax, and the page must be ours.
  const origin = req.headers.get('origin');
  if (origin && origin !== url.origin) return back('?done=error');

  const email = await getSessionEmail();
  if (!email) return back('');

  const form = await req.formData();
  const action = String(form.get('action') || '') as MyLampAction;
  const id = String(form.get('id') || '');
  const date = String(form.get('date') || '');
  if (!MY_LAMP_ACTIONS.includes(action)) return back('?done=error');
  if (action === 'forget' && !UUID.test(id)) return back('?done=error');
  if ((action === 'keep_out' || action === 'keep_in' || action === 'delete_note') && !DATE.test(date)) return back('?done=error');

  try {
    const r = await myLampAction(email, action, UUID.test(id) ? id : null, DATE.test(date) ? date : null);
    return back(`?done=${r === 'ok' ? action : 'error'}`);
  } catch (e) {
    console.error('my-lamp action', e);
    return back('?done=error');
  }
}
