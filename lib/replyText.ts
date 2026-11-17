// Cleaning a reader's emailed note down to only what they wrote. Pure (no database), so the email
// templates can use it too.

// Invisible characters mail apps add: Gmail's tracking mark "ᐧ" and zero-width characters.
const INVISIBLE = /[ᐧ​‌‍⁠﻿]/g;

// The "On <date>, <sender> wrote:" line above the quoted email. Gmail and Apple Mail wrap it onto two or
// three lines when it's long ("On Mon, Nov 16, 2026 at 8:00 PM Morning Lamp <study@…>\nwrote:"), so a
// one-line check misses it. It must start a line, contain a digit (the date) and stay short.
const QUOTE_HEADER = /(^|\n)[ \t]*On [^\n]{3,200}(?:\n[^\n]{0,200}){0,2}?wrote:[ \t]*(?=\n|$)/i;

// Keeps only what the reader wrote: drops quoted history ("> ..." and "On ... wrote:"), signatures and
// invisible tracking characters.
export function stripQuoted(text: string): string {
  let t = text.replace(/\r\n/g, '\n').replace(INVISIBLE, '');
  const m = t.match(QUOTE_HEADER);
  if (m && m.index !== undefined && /\d/.test(m[0])) t = t.slice(0, m.index);
  const out: string[] = [];
  for (const line of t.split('\n')) {
    const s = line.trim();
    if (/^On .+wrote:$/i.test(s) || /^-{2,}\s*Original Message/i.test(s) || /^From: .+/i.test(s) || s === '--' || /^Sent from my /i.test(s)) break;
    if (s.startsWith('>')) continue;
    out.push(line);
  }
  return out.join('\n').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
}
