// APPROVED FORMAT: see docs/email-format.md. Don't add, remove, or rename sections without the owner's sign-off.
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
  'Last Night’s Lamp is written in response to what you share the evening before. Tonight around 8 PM your time, we’ll check in to ask how your day went. Reply with a line or two, and tomorrow morning this section will be a study written for your day.';
const LAMP_SUBTITLE = 'Written for what you shared last night';
const YESTERDAY_INVITE_2 = 'You can also reply to this email anytime today.';

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
    <p style="margin:0 0 22px;font-family:${SANS};font-size:14px;color:${C.muted};">Pillar: ${esc(s.pillar)} · about 3 minutes</p>
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
  const lampBand = (subtitle: string) => `<tr><td style="background:${C.navy};padding:18px 32px;text-align:center;">
        <p style="margin:0;font-family:${SANS};font-size:13px;letter-spacing:2.5px;font-weight:bold;color:${C.gold};">LAST NIGHT’S LAMP</p>
        <p style="margin:6px 0 0;font-family:${SERIF};font-size:16px;font-style:italic;color:#e9e1cf;">${esc(subtitle)}</p>
      </td></tr>`;
  const yesterday = !isPremium
    ? ''
    : s.yesterday
      ? `${lampBand(LAMP_SUBTITLE)}
      <tr><td style="background:${C.ivory};padding:26px 32px 12px;">
        ${p(`<em>Last night you wrote: “${esc(shorten(s.yesterday.reply, 320))}”</em>`, `color:${C.muted};`)}
        ${quote(s.yesterday.passage, false)}
        ${h('Behind the Verse')}
        ${s.yesterday.body.slice(0, 3).map((b) => p(rich(b))).join('')}
        ${s.yesterday.voice ? `${h('Voices Through History')}${voicesHtml([s.yesterday.voice])}` : ''}
      </td></tr>`
      : `${lampBand('A study written in response to your day')}
      <tr><td style="background:${C.ivory};padding:26px 32px 12px;">
        ${h('Tonight, tell us about your day')}
        ${p(esc(YESTERDAY_INVITE))}
        ${p(esc(YESTERDAY_INVITE_2), `color:${C.muted};font-size:16px;`)}
      </td></tr>`;

  const premiumUrl = s.premiumUrl ?? PREMIUM_URL;
  const verseOrTeaser = isPremium
    ? ''
    : `<tr><td style="background:${C.page};padding:18px 0 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.navy};border-radius:12px;"><tr><td style="padding:28px 30px;text-align:center;">
      <p style="margin:0 0 8px;font-family:${SANS};font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;color:${C.gold};">Premium</p>
      <p style="margin:0 0 10px;font-family:${SERIF};font-size:22px;line-height:1.35;color:#f6efe1;">Last Night’s Lamp</p>
      <p style="margin:0 0 22px;font-family:${SANS};font-size:15px;line-height:1.6;color:#c9c2b3;">Each evening, Premium checks in to ask how your day went. Reply with a line or two, and the next morning brings a study written for what you shared: a passage for what you felt, the story behind it, and a voice from Christian history who walked through the same thing.</p>
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
            'LAST NIGHT’S LAMP',
            LAMP_SUBTITLE,
            `Last night you wrote: "${shorten(s.yesterday.reply, 320)}"`,
            `"${s.yesterday.passage.text}" (${s.yesterday.passage.ref})`,
            '',
            'BEHIND THE VERSE',
            ...s.yesterday.body.slice(0, 3),
            ...(s.yesterday.voice
              ? ['', 'VOICES THROUGH HISTORY', `${s.yesterday.voice.name} (${s.yesterday.voice.dates}), ${s.yesterday.voice.kind}: ${s.yesterday.voice.body} Source: ${s.yesterday.voice.source}`]
              : []),
            '',
          ]
        : ['LAST NIGHT’S LAMP', 'Tonight, tell us about your day', YESTERDAY_INVITE, YESTERDAY_INVITE_2, '']),
    ...(isPremium
      ? []
      : [
          'PREMIUM: LAST NIGHT’S LAMP',
          'Each evening, Premium checks in to ask how your day went. Reply with a line or two, and the next morning brings a study written for what you shared: a passage for what you felt, the story behind it, and a voice from Christian history.',
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
    'Each morning you’ll get one short Bible study: a passage, the history behind it, one detail most people miss, and a voice from church history. It takes about three minutes.',
    'Your first study arrives at 5 AM your time. If you don’t see it, check your Promotions or Spam folder and move it to your inbox, so the rest find you.',
    o.premium
      ? 'Each evening around 8 PM, we’ll check in to ask how your day went. Reply with a line or two, and the next morning’s study includes a short study written for what you shared.'
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

// Premium evening check-in. The reply becomes tomorrow's Last Night's Lamp.
const CHECKIN_SUBJECTS = [
  'How did today go?',
  'Before you rest: how was today?',
  'One line about your day?',
  'How was today, really?',
];
const EVENING_IMAGE = 'https://morninglamp.study/email/evening-header.png';

// Evening check-in (Premium, 8 PM local). Night look so it reads as the evening half of the loop:
// tonight you reply -> overnight we find Scripture -> 5 AM Last Night's Lamp.
export function renderCheckinEmail(o: { footer: MailFooter; dayIndex: number; isTest?: boolean }): { subject: string; html: string; text: string } {
  const subject = CHECKIN_SUBJECTS[((o.dayIndex % CHECKIN_SUBJECTS.length) + CHECKIN_SUBJECTS.length) % CHECKIN_SUBJECTS.length];
  const verse: Passage = { text: 'Your word is a lamp for my feet, a light on my path.', ref: 'Psalm 119:105 (NIV)' };
  const ask = 'Hit reply and tell us how today went, in a sentence or two: a win, a worry, a hard conversation, something you’re grateful for.';
  const why = 'We read what you share, find Scripture for it, and write tomorrow morning’s Last Night’s Lamp just for you: your own words, a passage for how you felt, the story behind it, and a voice from Christian history who walked through the same thing.';
  const quiet = 'Nothing to share tonight? No need to reply. Your daily study still arrives at 5 AM.';
  const steps: { when: string; what: string; now: boolean }[] = [
    { when: 'Tonight', what: 'Reply and tell us how your day went', now: true },
    { when: 'Overnight', what: 'We find Scripture for what you shared', now: false },
    { when: '5 AM', what: 'Last Night’s Lamp, written for you', now: false },
  ];
  const step = (st: (typeof steps)[number], i: number) => `<td width="33%" valign="top" style="padding:0 ${i < 2 ? 6 : 0}px 0 ${i > 0 ? 6 : 0}px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${st.now ? C.navy : '#ffffff'};border:1px solid ${st.now ? C.navy : C.line};border-radius:10px;"><tr><td style="padding:14px 12px;text-align:center;">
        <p style="margin:0 0 6px;font-family:${SANS};font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;color:${st.now ? C.gold : C.goldDark};">${i + 1} · ${esc(st.when)}</p>
        <p style="margin:0;font-family:${SANS};font-size:14px;line-height:1.45;color:${st.now ? '#f6efe1' : C.muted};">${esc(st.what)}</p>
      </td></tr></table>
    </td>`;
  const inner = `<tr><td style="background:#101e2a;padding:0;line-height:0;font-size:0;">
    <img src="${EVENING_IMAGE}" width="600" alt="A clay oil lamp glowing under a night sky" style="display:block;width:100%;max-width:600px;height:auto;border:0;">
  </td></tr>
  <tr><td style="background:#101e2a;padding:6px 32px 30px;text-align:center;">
    <p style="margin:0 0 14px;font-family:${SANS};font-size:12px;letter-spacing:3px;text-transform:uppercase;font-weight:bold;color:${C.gold};">Evening &middot; A lamp for your feet</p>
    <p style="margin:0;font-family:${SERIF};font-size:21px;line-height:1.5;font-style:italic;color:#f6efe1;">“${esc(verse.text)}”</p>
    <p style="margin:8px 0 0;font-family:${SANS};font-size:13px;color:#9fb0b8;">${esc(verse.ref)}</p>
  </td></tr>
  <tr><td style="background:${C.ivory};padding:30px 32px 18px;">
    ${label('Last Night’s Lamp · Evening check-in')}
    <h1 style="margin:0 0 16px;font-family:${SERIF};font-size:28px;line-height:1.25;color:${C.navy};">${esc(subject)}</h1>
    ${p(esc(ask))}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 22px;"><tr>
      ${steps.map(step).join('')}
    </tr></table>
    ${p(esc(why))}
    ${p(esc(quiet), `color:${C.muted};font-size:16px;`)}
    ${p('Rest well,<br>Morning Lamp')}
  </td></tr>`;
  return {
    subject: o.isTest ? `[Preview] ${subject}` : subject,
    html: shell(inner, 'Reply with a line about your day. Tomorrow’s Last Night’s Lamp will be written in response to it.', o.isTest, footerHtml(o.footer), 'premium'),
    text: [
      'MORNING LAMP · EVENING: A LAMP FOR YOUR FEET',
      `"${verse.text}" (${verse.ref})`,
      '',
      'LAST NIGHT’S LAMP · EVENING CHECK-IN',
      subject,
      '',
      ask,
      '',
      ...steps.map((st, i) => `${i + 1}. ${st.when}: ${st.what}`),
      '',
      why,
      '',
      quiet,
      '',
      'Rest well,',
      'Morning Lamp',
      ...footerText(o.footer),
    ].join('\n'),
  };
}

// ---------- Lamplighters (beta testers) ----------
function simpleEmail(o: {
  kicker: string;
  title: string;
  lines: string[];
  preheader: string;
  footer?: MailFooter;
  edition?: Edition;
  button?: { label: string; url: string };
}): { html: string; text: string } {
  const button = o.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 22px;"><tr><td style="background:${C.navy};border-radius:8px;">
        <a href="${esc(o.button.url)}" style="display:inline-block;padding:13px 24px;font-family:${SANS};font-size:16px;font-weight:bold;color:#faf6ec;text-decoration:none;">${esc(o.button.label)}</a>
      </td></tr></table>`
    : '';
  const inner = `<tr><td style="background:${C.ivory};padding:30px 32px 18px;">
    ${label(o.kicker)}
    <h1 style="margin:0 0 18px;font-family:${SERIF};font-size:28px;line-height:1.25;color:${C.navy};">${esc(o.title)}</h1>
    ${o.lines.map((l) => p(esc(l))).join('')}
    ${button}
    ${p('Grace and peace,<br>Morning Lamp')}
  </td></tr>`;
  return {
    html: shell(inner, o.preheader, false, footerHtml(o.footer), o.edition),
    text: [o.kicker.toUpperCase(), o.title, '', ...o.lines.flatMap((l) => [l, '']), ...(o.button ? [`${o.button.label}: ${o.button.url}`, ''] : []), 'Grace and peace,', 'Morning Lamp', ...footerText(o.footer)].join('\n'),
  };
}

export function renderLamplighterReceived(): { subject: string; html: string; text: string } {
  return {
    subject: 'We got your Lamplighter application',
    ...simpleEmail({
      kicker: 'Lamplighters',
      title: 'Thank you for applying',
      preheader: 'We read every application and reply within a few days.',
      lines: [
        'We got your application to be one of the first 100 Lamplighters. We read every one, and we’ll email you within a few days.',
        'You’re also on the list for the free daily study, so you won’t miss anything while you wait.',
      ],
    }),
  };
}

export function renderLamplighterAccepted(o: { footer: MailFooter }): { subject: string; html: string; text: string } {
  return {
    subject: 'You’re a Lamplighter. Welcome.',
    ...simpleEmail({
      kicker: 'Lamplighters',
      title: 'Welcome, Lamplighter',
      preheader: 'Premium is on for you, free, for life.',
      edition: 'premium',
      footer: o.footer,
      lines: [
        'You’re one of the first Lamplighters. Premium is on for you, free, for life. As long as Morning Lamp is running, you’ll never pay for it.',
        'Each morning at 5 AM your time, your study arrives. Each evening around 8 PM, we’ll check in to ask how your day went. Reply with a line or two, and the next morning brings Last Night’s Lamp: a study written in response to your day.',
        'Once a week we’ll send you one short question about how it’s going. Honest answers, good and bad, are the whole point. Just hit reply.',
        'If you ever share your experience publicly, please mention that you received Premium free as a beta tester. If we ever quote you, we’ll ask first and note the same.',
      ],
    }),
  };
}

const FEEDBACK_QUESTIONS = [
  'What’s one thing you’d change about Morning Lamp?',
  'Which part of the study do you read first, and which do you skip?',
  'Did Last Night’s Lamp feel like it was really written for your day? Why or why not?',
  'Would you recommend Morning Lamp to a friend? What would you tell them?',
];
export function renderLamplighterFeedback(o: { footer: MailFooter; weekIndex: number }): { subject: string; html: string; text: string } {
  const q = FEEDBACK_QUESTIONS[((o.weekIndex % FEEDBACK_QUESTIONS.length) + FEEDBACK_QUESTIONS.length) % FEEDBACK_QUESTIONS.length];
  return {
    subject: `Lamplighter question: ${q}`,
    ...simpleEmail({
      kicker: 'Lamplighters · Weekly question',
      title: q,
      preheader: 'One honest sentence is plenty. Just hit reply.',
      edition: 'premium',
      footer: { ...o.footer, reason: 'You’re getting this because you joined the Lamplighters beta at morninglamp.study.' },
      lines: ['Just hit reply. One honest sentence is plenty, and it shapes what Morning Lamp becomes.', 'Thank you for helping us build this.'],
    }),
  };
}

// ---------- Confirm your email (double opt-in) ----------
export function renderConfirmEmail(o: { link: string; lamplighter?: boolean; invite?: { premium: boolean } }): { subject: string; html: string; text: string } {
  if (o.invite) {
    // Someone on the Morning Lamp team added this person by hand; nothing else goes out until they tap the button.
    const r = simpleEmail({
      kicker: 'You’re invited',
      title: 'Rob signed you up for Morning Lamp',
      preheader: 'A free three-minute Bible study, every morning. Tap to start.',
      lines: [
        'Rob thought you’d enjoy Morning Lamp: a short Bible study in your inbox every morning at 5 AM your time. One passage, the history behind it, and a voice from 2,000 years of faith. It takes about three minutes.',
        ...(o.invite.premium
          ? ['He also gave you Premium, free for life. Each evening we’ll ask how your day went, and the next morning brings Last Night’s Lamp: a study written in response to what you shared.']
          : []),
        'Tap the button to start. Nothing else will arrive until you do. Not interested? Just ignore this email, and you won’t hear from us again.',
      ],
      button: { label: 'Yes, start my daily study', url: o.link },
    });
    return { subject: 'Rob signed you up for Morning Lamp', ...r };
  }
  const lines = o.lamplighter
    ? [
        'Thank you for applying to be a Lamplighter. Please confirm your email so we can reach you. We read every application and will write back within a few days.',
        'Confirming also starts your free daily study: one passage, the history behind it, and a voice from history, at 5 AM your time.',
      ]
    : [
        'Tap the button to confirm your email and start your free daily study: one passage, the history behind it, and a voice from history, at 5 AM your time.',
      ];
  const r = simpleEmail({
    kicker: o.lamplighter ? 'Lamplighters' : 'One quick step',
    title: 'Confirm your email',
    preheader: 'Tap to confirm and start your daily study.',
    lines: [...lines, 'If you didn’t sign up, you can ignore this email. You won’t hear from us again.'],
    button: { label: 'Confirm my email', url: o.link },
  });
  return { subject: o.lamplighter ? 'Confirm your email for Lamplighters' : 'Confirm your email for Morning Lamp', ...r };
}
