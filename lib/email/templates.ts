// Email templates for Morning Lamp. Email-safe HTML: tables + inline styles only.

export type Passage = { text: string; ref: string }; // ref includes translation, e.g. "Psalm 46:10 (NIV)"
export type Voice = { name: string; dates: string; kind: 'Direct commentary' | 'Thematic connection'; body: string; source: string };
export type Link = { label: string; url?: string };
export type Edition = 'free' | 'premium';

export type DailyStudy = {
  dateLabel: string;
  subject: string;
  pillar: string;
  title: string;
  passage: Passage;
  intro: string;
  behind: string[];
  detail: string;
  voices: Voice[];
  readMore: Link[];
  premiumUrl?: string; // where the free email's Upgrade button points
  // Premium only: a short study on what the reader shared yesterday (verse, Behind the Verse, one voice).
  yesterday?: { reply: string; passage: Passage; body: string[]; voice?: Voice | null };
  // Which version this reader gets. Shown as a badge in the header.
  edition?: Edition;
  isTest?: boolean;
};

export type AnswerEmail = {
  subject: string;
  question: string;
  shortAnswer: string;
  sections: { heading: string; paragraphs: string[]; passages?: Passage[] }[];
  voices: Voice[];
  readMore: Link[];
  isTest?: boolean;
};

const C = {
  navy: '#182c39',
  gold: '#c9ae7c',
  goldDark: '#8f6f3c',
  ivory: '#faf6ec',
  page: '#f1ece2',
  ink: '#1f2f3a',
  muted: '#5d6b72',
  line: '#e2dacb',
};
export const PREMIUM_URL = 'https://morninglamp.study/?utm_source=email&utm_medium=free-daily&utm_campaign=premium-teaser#premium';

const YESTERDAY_INVITE =
  'Hit reply and tell us about your day in a sentence or two: something you’re grateful for, something weighing on you, a conversation you keep thinking about.';
const YESTERDAY_INVITE_2 =
  'Tomorrow morning, this space will hold a passage chosen for what you shared and a short reflection on it.';

function shorten(s: string, n: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
}

// Required on every subscriber email (CAN-SPAM): why they get it, a working unsubscribe link, and a postal address.
export type MailFooter = { unsubscribeUrl: string; postalAddress: string; reason?: string };

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = 'Arial, Helvetica, sans-serif';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
// LORD in small caps, as printed in English Bibles.
function rich(s: string): string {
  return esc(s).replace(/\bLORD\b/g, `<span style="font-variant:small-caps;">Lord</span>`);
}

const p = (html: string, extra = '') =>
  `<p style="margin:0 0 16px;font-family:${SANS};font-size:17px;line-height:1.65;color:${C.ink};${extra}">${html}</p>`;
const h = (text: string, color: string = C.navy) =>
  `<h2 style="margin:28px 0 12px;font-family:${SERIF};font-size:21px;line-height:1.3;font-weight:bold;color:${color};">${esc(text)}</h2>`;
const label = (text: string, color: string = C.goldDark) =>
  `<p style="margin:0 0 8px;font-family:${SANS};font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;color:${color};">${esc(text)}</p>`;
const quote = (q: Passage, big = true) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr>
     <td width="3" style="background:${C.gold};"></td>
     <td style="padding:2px 0 2px 18px;">
       <p style="margin:0;font-family:${SERIF};font-size:${big ? 22 : 19}px;line-height:1.5;color:${C.ink};">“${rich(q.text)}”</p>
       <p style="margin:8px 0 0;font-family:${SANS};font-size:14px;color:${C.muted};">${esc(q.ref)}</p>
     </td></tr></table>`;

function voicesHtml(voices: Voice[]): string {
  return voices
    .map(
      (v) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;background:#ffffff;border:1px solid ${C.line};border-radius:10px;"><tr><td style="padding:18px 20px;">
        <p style="margin:0 0 2px;font-family:${SERIF};font-size:18px;font-weight:bold;color:${C.navy};">${esc(v.name)} <span style="font-family:${SANS};font-size:14px;font-weight:normal;color:${C.muted};">(${esc(v.dates)})</span></p>
        <p style="margin:0 0 10px;font-family:${SANS};font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${C.goldDark};">${esc(v.kind)}</p>
        ${p(rich(v.body), 'font-size:16px;margin-bottom:8px;')}
        <p style="margin:0;font-family:${SANS};font-size:13px;color:${C.muted};">Source: ${esc(v.source)}</p>
      </td></tr></table>`,
    )
    .join('');
}

function readMoreHtml(links: Link[]): string {
  return `<ul style="margin:0 0 8px;padding-left:20px;">${links
    .map(
      (l) =>
        `<li style="margin:0 0 6px;font-family:${SANS};font-size:16px;line-height:1.5;color:${C.ink};">${
          l.url ? `<a href="${esc(l.url)}" style="color:${C.goldDark};">${esc(l.label)}</a>` : esc(l.label)
        }</li>`,
    )
    .join('')}</ul>`;
}

function footerHtml(f?: MailFooter): string {
  if (!f) return '';
  return `<p style="margin:0 0 6px;font-family:${SANS};font-size:13px;line-height:1.6;color:${C.muted};">${esc(
    f.reason ?? 'You’re getting this because you signed up for Morning Lamp at morninglamp.study.',
  )} <a href="${esc(f.unsubscribeUrl)}" style="color:${C.muted};text-decoration:underline;">Unsubscribe</a></p>
  <p style="margin:0 0 10px;font-family:${SANS};font-size:13px;line-height:1.6;color:${C.muted};">Mission Driven Brand, LLC · ${esc(f.postalAddress)}</p>`;
}

function footerText(f?: MailFooter): string[] {
  if (!f) return [];
  return [
    '',
    f.reason ?? 'You’re getting this because you signed up for Morning Lamp at morninglamp.study.',
    `Unsubscribe: ${f.unsubscribeUrl}`,
    `Mission Driven Brand, LLC · ${f.postalAddress}`,
  ];
}

function badgeHtml(edition?: Edition): string {
  if (edition === 'premium') {
    return `<span style="display:inline-block;background:${C.gold};color:${C.navy};font-family:${SANS};font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;padding:6px 12px;border-radius:999px;">&#10022; Premium</span>`;
  }
  if (edition === 'free') {
    return `<span style="display:inline-block;border:1px solid #5d7480;color:#c9c2b3;font-family:${SANS};font-size:12px;letter-spacing:2px;text-transform:uppercase;padding:5px 12px;border-radius:999px;">Free edition</span>`;
  }
  return '';
}

function shell(inner: string, preheader: string, isTest?: boolean, footerHtml = '', edition?: Edition): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Morning Lamp</title></head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
${isTest ? `<tr><td style="padding:0 0 10px;font-family:${SANS};font-size:12px;color:${C.muted};text-align:center;">TEST SEND · not a live subscription email</td></tr>` : ''}
<tr><td style="background:${C.navy};padding:22px 32px;border-radius:12px 12px 0 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="vertical-align:middle;"><p style="margin:0;font-family:${SERIF};font-size:20px;color:${C.gold};">Morning Lamp</p></td>
    <td align="right" style="vertical-align:middle;">${badgeHtml(edition)}</td>
  </tr></table>
</td></tr>
${inner}
<tr><td style="padding:24px 32px 8px;text-align:center;">
  ${footerHtml}
  <p style="margin:0 0 6px;font-family:${SANS};font-size:13px;line-height:1.6;color:${C.muted};">Morning Lamp: Scripture, history, and the story behind each verse.</p>
  <p style="margin:0;font-family:${SANS};font-size:13px;line-height:1.6;color:${C.muted};">Scripture quotations are from the Holy Bible, New International Version® (NIV®).</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

export function renderDailyEmail(s: DailyStudy, footer?: MailFooter): { subject: string; html: string; text: string } {
  const study = `<tr><td style="background:${C.ivory};padding:30px 32px 14px;">
    ${label(`Today’s Bible Study · ${s.dateLabel}`)}
    <h1 style="margin:0 0 6px;font-family:${SERIF};font-size:28px;line-height:1.25;color:${C.navy};">${esc(s.title)}</h1>
    <p style="margin:0 0 22px;font-family:${SANS};font-size:14px;color:${C.muted};">Pillar: ${esc(s.pillar)} · about 5 minutes</p>
    ${quote(s.passage)}
    ${p(rich(s.intro))}
    ${h('Behind the Verse')}
    ${s.behind.slice(0, 3).map((b) => p(rich(b))).join('')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 8px;background:#ffffff;border-radius:10px;"><tr><td style="padding:16px 20px;">
      ${label('One detail you might miss')}
      ${p(rich(s.detail), 'margin:0;font-size:16px;')}
    </td></tr></table>
    ${h('Voices Through History')}
    ${voicesHtml(s.voices.slice(0, 1))}
    ${h('Where to Read More')}
    ${readMoreHtml(s.readMore)}
  </td></tr>`;

  // Premium readers always get the second half: a reflection on what they shared, or an invitation to share.
  const isPremium = s.edition === 'premium';
  const yesterdayBand = `<tr><td style="background:${C.navy};padding:16px 32px;text-align:center;">
        <p style="margin:0;font-family:${SANS};font-size:13px;letter-spacing:2.5px;font-weight:bold;color:${C.gold};">YESTERDAY, THROUGH THE LENS OF SCRIPTURE</p>
      </td></tr>`;
  const yesterday = !isPremium
    ? ''
    : s.yesterday
      ? `${yesterdayBand}
      <tr><td style="background:${C.ivory};padding:26px 32px 12px;">
        ${h('Looking Back at Yesterday')}
        ${p(`<em>You wrote: “${esc(shorten(s.yesterday.reply, 320))}”</em>`, `color:${C.muted};`)}
        ${quote(s.yesterday.passage, false)}
        ${h('Behind the Verse')}
        ${s.yesterday.body.slice(0, 3).map((b) => p(rich(b))).join('')}
        ${s.yesterday.voice ? `${h('Voices Through History')}${voicesHtml([s.yesterday.voice])}` : ''}
      </td></tr>`
      : `${yesterdayBand}
      <tr><td style="background:${C.ivory};padding:26px 32px 12px;">
        ${h('How was yesterday?')}
        ${p(esc(YESTERDAY_INVITE))}
        ${p(esc(YESTERDAY_INVITE_2), `color:${C.muted};font-size:16px;`)}
      </td></tr>`;

  const premiumUrl = s.premiumUrl ?? PREMIUM_URL;
  const verseOrTeaser = isPremium
    ? ''
    : `<tr><td style="background:${C.page};padding:18px 0 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.navy};border-radius:12px;"><tr><td style="padding:28px 30px;text-align:center;">
      <p style="margin:0 0 8px;font-family:${SANS};font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;color:${C.gold};">Premium</p>
      <p style="margin:0 0 10px;font-family:${SERIF};font-size:22px;line-height:1.35;color:#f6efe1;">Yesterday, through the lens of Scripture</p>
      <p style="margin:0 0 22px;font-family:${SANS};font-size:15px;line-height:1.6;color:#c9c2b3;">Reply with a line about your day. With Premium, the next morning brings a study written for it: a passage for what you felt, the story behind it, and a voice from Christian history who walked through the same thing.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;"><tr>
        <td style="background:${C.gold};border-radius:8px;">
          <a href="${esc(premiumUrl)}" style="display:inline-block;padding:14px 28px;font-family:${SANS};font-size:16px;font-weight:bold;color:${C.navy};text-decoration:none;">Get Premium: $7/month or $47/year</a>
        </td>
      </tr></table>
      <p style="margin:14px 0 0;font-family:${SANS};font-size:13px;color:#9fb0b8;">Save $37 with yearly. Cancel anytime.</p>
    </td></tr></table>
  </td></tr>`;
  const verse = `${verseOrTeaser}
  <tr><td style="background:${C.page};padding:18px 0 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.ivory};border-radius:12px;border:1px solid ${C.line};"><tr><td style="padding:20px 30px;text-align:center;">
      <p style="margin:0 0 4px;font-family:${SERIF};font-size:19px;color:${C.navy};">Have a Bible question?</p>
      <p style="margin:0;font-family:${SANS};font-size:15px;line-height:1.6;color:${C.muted};">Just hit reply and ask, one question a day. You’ll get a careful, plain-language answer with sources.</p>
    </td></tr></table>
  </td></tr>`;

  const edition: Edition = isPremium ? 'premium' : 'free';
  const html = shell(study + yesterday + verse, s.intro, s.isTest, footerHtml(footer), edition);

  const text = [
    s.isTest ? 'TEST SEND · not a live subscription email\n' : '',
    `MORNING LAMP${edition === 'premium' ? ' PREMIUM' : ' (FREE EDITION)'}: ${s.dateLabel}`,
    '',
    `TODAY'S BIBLE STUDY: ${s.title}`,
    `"${s.passage.text}" (${s.passage.ref})`,
    '',
    s.intro,
    '',
    'BEHIND THE VERSE',
    ...s.behind.slice(0, 3),
    '',
    `One detail you might miss: ${s.detail}`,
    '',
    'VOICES THROUGH HISTORY',
    ...s.voices.slice(0, 1).map((v) => `${v.name} (${v.dates}), ${v.kind}: ${v.body} Source: ${v.source}`),
    '',
    'WHERE TO READ MORE',
    ...s.readMore.map((l) => `- ${l.label}${l.url ? ` ${l.url}` : ''}`),
    '',
    ...(!isPremium
      ? []
      : s.yesterday
        ? [
            'YESTERDAY, THROUGH THE LENS OF SCRIPTURE',
            `You wrote: "${shorten(s.yesterday.reply, 320)}"`,
            `"${s.yesterday.passage.text}" (${s.yesterday.passage.ref})`,
            '',
            'BEHIND THE VERSE',
            ...s.yesterday.body.slice(0, 3),
            ...(s.yesterday.voice
              ? ['', 'VOICES THROUGH HISTORY', `${s.yesterday.voice.name} (${s.yesterday.voice.dates}), ${s.yesterday.voice.kind}: ${s.yesterday.voice.body} Source: ${s.yesterday.voice.source}`]
              : []),
            '',
          ]
        : ['YESTERDAY, THROUGH THE LENS OF SCRIPTURE', 'How was yesterday?', YESTERDAY_INVITE, YESTERDAY_INVITE_2, '']),
    ...(isPremium
      ? []
      : [
          'PREMIUM: YESTERDAY, THROUGH THE LENS OF SCRIPTURE',
          'Reply with a line about your day. With Premium, the next morning brings a study written for it: a passage for what you felt, the story behind it, and a voice from Christian history.',
          `Get Premium ($7/month or $47/year, save $37 yearly): ${s.premiumUrl ?? PREMIUM_URL}`,
          '',
        ]),
    'Have a Bible question? Just hit reply and ask, one question a day.',
    '',
    'Scripture quotations are from the Holy Bible, New International Version (NIV).',
    ...footerText(footer),
  ].join('\n');

  return { subject: s.subject, html, text };
}

// Answers must be 400–600 words (short answer + sections + voices), about a 3-minute read.
export const ANSWER_WORDS = { min: 400, max: 600 } as const;

export function answerWordCount(a: AnswerEmail): number {
  const parts = [
    a.shortAnswer,
    ...a.sections.flatMap((sec) => [...(sec.passages ?? []).map((q) => q.text), ...sec.paragraphs]),
    ...a.voices.map((v) => v.body),
  ];
  return parts.join(' ').split(/\s+/).filter(Boolean).length;
}

export function renderAnswerEmail(a: AnswerEmail): { subject: string; html: string; text: string } {
  const inner = `<tr><td style="background:${C.ivory};padding:30px 32px 14px;">
    ${label('You Asked')}
    <h1 style="margin:0 0 20px;font-family:${SERIF};font-size:27px;line-height:1.3;color:${C.navy};">${esc(a.question)}</h1>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;background:#ffffff;border-left:3px solid ${C.gold};"><tr><td style="padding:16px 20px;">
      ${label('The short answer')}
      ${p(rich(a.shortAnswer), 'margin:0;')}
    </td></tr></table>
    ${a.sections
      .map((sec) => h(sec.heading) + (sec.passages ?? []).map((q) => quote(q, false)).join('') + sec.paragraphs.map((x) => p(rich(x))).join(''))
      .join('')}
    ${h('Voices Through History')}
    ${voicesHtml(a.voices)}
    ${h('Where to Read More')}
    ${readMoreHtml(a.readMore)}
  </td></tr>
  <tr><td style="background:${C.page};padding:18px 0 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:2px solid ${C.navy};border-radius:12px;"><tr><td style="padding:20px 30px;text-align:center;">
      <p style="margin:0 0 4px;font-family:${SERIF};font-size:19px;color:${C.navy};">Got another question?</p>
      <p style="margin:0;font-family:${SANS};font-size:15px;line-height:1.6;color:${C.muted};">Hit reply with your next one. No question is too basic. Free members can ask one a day; Premium members, two.</p>
    </td></tr></table>
  </td></tr>`;

  const html = shell(inner, a.shortAnswer, a.isTest);
  const text = [
    a.isTest ? 'TEST SEND · not a live subscription email\n' : '',
    `YOU ASKED: ${a.question}`,
    '',
    `The short answer: ${a.shortAnswer}`,
    '',
    ...a.sections.flatMap((sec) => [
      sec.heading.toUpperCase(),
      ...(sec.passages ?? []).map((q) => `"${q.text}" (${q.ref})`),
      ...sec.paragraphs,
      '',
    ]),
    'VOICES THROUGH HISTORY',
    ...a.voices.map((v) => `${v.name} (${v.dates}), ${v.kind}: ${v.body} Source: ${v.source}`),
    '',
    'WHERE TO READ MORE',
    ...a.readMore.map((l) => `- ${l.label}${l.url ? ` ${l.url}` : ''}`),
    '',
    'Got another question? Hit reply. Free members can ask one a day; Premium members, two.',
    '',
    'Scripture quotations are from the Holy Bible, New International Version (NIV).',
  ].join('\n');
  return { subject: a.subject, html, text };
}

export function renderWelcomeEmail(o: { premium: boolean; footer: MailFooter }): { subject: string; html: string; text: string } {
  const lines = [
    'Thank you for joining Morning Lamp.',
    'Each morning you’ll get one short Bible study: a passage, the history behind it, one detail most people miss, and voices from church history. It takes about five minutes.',
    'Your first study arrives at 5 AM your time. If you don’t see it, check your Promotions or Spam folder and move it to your inbox, so the rest find you.',
    o.premium
      ? 'As a Premium member, you can reply to any study with a Bible question, up to two a day, and you’ll get a careful answer with sources.'
      : 'Have a Bible question? Reply to any study and ask, one question a day.',
  ];
  const verse: Passage = { text: 'Your word is a lamp for my feet, a light on my path.', ref: 'Psalm 119:105 (NIV)' };
  const inner = `<tr><td style="background:${C.ivory};padding:30px 32px 18px;">
    <h1 style="margin:0 0 18px;font-family:${SERIF};font-size:28px;line-height:1.25;color:${C.navy};">Welcome to Morning Lamp</h1>
    ${lines.map((l) => p(esc(l))).join('')}
    ${quote(verse, false)}
    ${p('Grace and peace,<br>Morning Lamp')}
  </td></tr>`;
  return {
    subject: 'Welcome to Morning Lamp',
    html: shell(inner, 'Your first study arrives at 5 AM your time.', false, footerHtml(o.footer), o.premium ? 'premium' : 'free'),
    text: ['Welcome to Morning Lamp', '', ...lines.flatMap((l) => [l, '']), `"${verse.text}" (${verse.ref})`, '', 'Grace and peace,', 'Morning Lamp', ...footerText(o.footer)].join('\n'),
  };
}
