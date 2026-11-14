import { rpc } from './supabaseRpc';
import { gate } from './partners';
import { sendEmail } from './email/send';
import { writeReflection, type LampMode } from './reflectionWriter';
import { seasonByKey, type LampMeta } from './seasons';
import { anthropicKey } from './studyWriter';
import { markRecalled, memoryContext, planMemory, saveMemory } from './memory';

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
  return writeLampFor(email, reply, reader.next_date);
}

// Saves what a reader shared (joined with any earlier note for that date), then writes that morning's
// Last Night's Lamp from everything they shared. Also used by admins to write one for a specific date.
export async function writeLampFor(
  email: string,
  reply: string,
  forDate: string,
  opts: { replace?: boolean; mode?: LampMode; meta?: LampMeta } = {},
) {
  // replace: start fresh for that date instead of joining with an earlier note.
  if (opts.replace) {
    await rpc('dss_reflection_save', { p_gate: gate(), p_email: email, p_for_date: forDate, p_reply: reply, p_content: {}, p_status: 'pending', p_note: null });
  }
  const merged = await rpc<string>('dss_reflection_save', {
    p_gate: gate(),
    p_email: email,
    p_for_date: forDate,
    p_reply: reply,
    p_content: null,
    p_status: 'pending',
    p_note: null,
  });

  try {
    // Use a different historical voice from the one in that morning's main study, if it's written yet.
    const study = await rpc<{ content?: { voices?: { name: string }[] } } | null>('dss_study_get', {
      p_gate: gate(),
      p_date: forDate,
    }).catch(() => null);
    // Memory only applies to a note the reader wrote (not a season tap or a follow-up we wrote ourselves).
    const fromNote = !opts.mode || opts.mode.kind === 'reply';
    const memory = fromNote ? await memoryContext(email, forDate) : { on: false, items: [] };
    // Deciding what to remember runs alongside writing the study, so the reader's Lamp isn't slowed down.
    const [r, plan] = await Promise.all([
      writeReflection(merged, { avoidVoice: study?.content?.voices?.[0]?.name ?? null, mode: opts.mode, earlier: memory.on ? memory.items : [] }),
      memory.on ? planMemory(merged, memory.items, forDate) : Promise.resolve(null),
    ]);
    const ready = r.kind === 'reflection' && r.passage;
    const recalled = ready && r.recall ? memory.items.find((m) => m.id === r.recall) : undefined;
    const meta: LampMeta | undefined = recalled
      ? { source: 'reply', recall: { id: recalled.id, quote: recalled.quote, date: recalled.source_date } }
      : opts.meta;
    await rpc('dss_reflection_save', {
      p_gate: gate(),
      p_email: email,
      p_for_date: forDate,
      p_reply: merged,
      p_content: ready ? { passage: r.passage, body: r.body, voice: r.voice, ...(meta ? { meta } : {}) } : null,
      p_status: ready ? 'ready' : 'skipped',
      p_note: r.kind,
    });
    // Remember only from a note that became a study: never from a crisis note, a Bible question or feedback.
    if (ready && plan) await saveMemory(email, forDate, plan);
    if (recalled) await markRecalled(email, recalled.id, forDate);
    if (r.kind === 'care') await alertCare(email, merged);
    return { handled: true, kind: r.kind, for_date: forDate };
  } catch (e) {
    console.error('reflection writer', e);
    await rpc('dss_reflection_save', {
      p_gate: gate(),
      p_email: email,
      p_for_date: forDate,
      p_reply: merged,
      p_content: null,
      p_status: 'failed',
      p_note: String(e instanceof Error ? e.message : e).slice(0, 300),
    });
    return { handled: false, reason: 'writer failed' };
  }
}

// ---------- seasons and no-reply mornings ----------

// A Premium reader tapped a season in their email. Saves it and, unless they already shared something for
// tomorrow morning, writes tomorrow's Last Night's Lamp for that season.
export async function tapSeason(token: string, key: string) {
  const season = seasonByKey(key);
  if (!season) return { status: 'bad_season' as const };
  const r = await rpc<{ status: string; email?: string; next_date?: string; has_note?: boolean }>('dss_season_set', {
    p_gate: gate(),
    p_token: token,
    p_season: season.key,
  });
  if (r.status !== 'ok' || !r.email || !r.next_date) return { status: r.status };
  if (r.has_note || !anthropicKey()) return { status: 'ok' as const, season, write: null };
  return {
    status: 'ok' as const,
    season,
    write: () =>
      writeLampFor(r.email!, `Season: ${season.label}`, r.next_date!, {
        replace: true,
        mode: { kind: 'season', season: season.prompt },
        meta: { source: 'season', season: season.key },
      }),
  };
}

type Candidate = { email: string; for_date: string; season: string | null; season_at: string | null; last_note: string | null; last_note_date: string | null; last_note_at: string | null };

// Overnight (2–4 AM the reader's time), for Premium readers who didn't reply: write this morning's Lamp
// from the season they tapped, or pick up their latest note. Whichever they gave us more recently wins.
export async function writeFallbacks(budgetMs = 150_000) {
  if (!anthropicKey()) return 0;
  const started = Date.now();
  let written = 0;
  // Each batch can take ~1–2 minutes (Claude writes them in parallel), so only start one with time to finish.
  while (Date.now() - started < budgetMs - 110_000) {
    const batch = await rpc<Candidate[]>('dss_fallback_candidates', { p_gate: gate(), p_limit: 4 });
    if (batch.length === 0) break;
    await Promise.all(
      batch.map(async (c) => {
        const season = seasonByKey(c.season);
        const seasonNewer = season && (!c.last_note_at || (c.season_at ?? '') > c.last_note_at);
        if (season && (seasonNewer || !c.last_note)) {
          return writeLampFor(c.email, `Season: ${season.label}`, c.for_date, {
            replace: true,
            mode: { kind: 'season', season: season.prompt },
            meta: { source: 'season', season: season.key },
          });
        }
        if (c.last_note && c.last_note_date) {
          const daysAgo = Math.round((Date.parse(c.for_date) - Date.parse(c.last_note_date)) / 86400000);
          return writeLampFor(c.email, c.last_note, c.for_date, {
            replace: true,
            mode: { kind: 'followup', daysAgo },
            meta: { source: 'followup', from_date: c.last_note_date },
          });
        }
      }),
    );
    written += batch.length;
  }
  return written;
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
