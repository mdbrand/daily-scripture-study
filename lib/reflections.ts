import { rpc } from './supabaseRpc';
import { gate } from './partners';
import { sendEmail } from './email/send';
import { writeReflection } from './reflectionWriter';
import { anthropicKey } from './studyWriter';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://morninglamp.study';

// Keeps only what the reader wrote: drops quoted history ("> ..." and "On ... wrote:") and signatures.
export function stripQuoted(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (/^On .+wrote:$/i.test(t) || /^-{2,}\s*Original Message/i.test(t) || /^From: .+/i.test(t) || t === '--' || /^Sent from my /i.test(t)) break;
    if (t.startsWith('>')) continue;
    out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function senderAddress(from: string): string {
  const m = from.match(/<([^>]+)>/);
  return (m ? m[1] : from).trim().toLowerCase();
}

type Reader = { premium: boolean; timezone: string; mailable: boolean; next_date: string } | null;

// Called for every email that reaches us. Only Premium readers' notes become reflections.
export async function handleReply(from: string, text: string | null) {
  const email = senderAddress(from);
  const reply = stripQuoted(text || '');
  if (!reply || reply.length < 3 || !anthropicKey()) return { handled: false, reason: 'empty or no key' };

  const reader = await rpc<Reader>('dss_reader_lookup', { p_gate: gate(), p_email: email });
  if (!reader?.premium || !reader.mailable) return { handled: false, reason: 'not a Premium reader' };

  // Save first (joins with any earlier note today), then write the reflection from everything they shared.
  const merged = await rpc<string>('dss_reflection_save', {
    p_gate: gate(),
    p_email: email,
    p_for_date: reader.next_date,
    p_reply: reply,
    p_content: null,
    p_status: 'pending',
    p_note: null,
  });

  try {
    // Use a different historical voice from the one in that morning's main study, if it's written yet.
    const study = await rpc<{ content?: { voices?: { name: string }[] } } | null>('dss_study_get', {
      p_gate: gate(),
      p_date: reader.next_date,
    }).catch(() => null);
    const r = await writeReflection(merged, { avoidVoice: study?.content?.voices?.[0]?.name ?? null });
    const ready = r.kind === 'reflection' && r.passage;
    await rpc('dss_reflection_save', {
      p_gate: gate(),
      p_email: email,
      p_for_date: reader.next_date,
      p_reply: merged,
      p_content: ready ? { passage: r.passage, body: r.body, voice: r.voice } : null,
      p_status: ready ? 'ready' : 'skipped',
      p_note: r.kind,
    });
    if (r.kind === 'care') await alertCare(email, merged);
    return { handled: true, kind: r.kind, for_date: reader.next_date };
  } catch (e) {
    console.error('reflection writer', e);
    await rpc('dss_reflection_save', {
      p_gate: gate(),
      p_email: email,
      p_for_date: reader.next_date,
      p_reply: merged,
      p_content: null,
      p_status: 'failed',
      p_note: String(e instanceof Error ? e.message : e).slice(0, 300),
    });
    return { handled: false, reason: 'writer failed' };
  }
}

// Someone may be in crisis: a person should follow up, not an automated reflection.
async function alertCare(email: string, reply: string) {
  const admins = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!admins.length) return;
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  await sendEmail({
    to: admins,
    subject: 'Morning Lamp: a reader may need a personal follow-up',
    replyTo: email,
    html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;max-width:560px">
      <p>A Premium reader’s reply may show signs of crisis or danger, so no automated reflection was written. Please reach out personally. Replying to this email goes to them.</p>
      <p><strong>${esc(email)}</strong> wrote:</p>
      <blockquote style="border-left:3px solid #a8834a;margin:0;padding:4px 14px;white-space:pre-wrap">${esc(reply)}</blockquote>
      <p>If they may be in danger, the 988 Suicide &amp; Crisis Lifeline (call or text 988 in the US) is available 24/7.</p>
      <p><a href="${SITE}/admin/subscribers?q=${encodeURIComponent(email)}">Open in admin</a></p></div>`,
    text: `A Premium reader may need a personal follow-up.\n\n${email} wrote:\n\n${reply}\n\n988 Suicide & Crisis Lifeline: call or text 988 (US).`,
  }).catch((e) => console.error('care alert', e));
}
