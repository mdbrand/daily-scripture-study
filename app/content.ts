// Landing page copy. Edit words here; layout lives in page.tsx.


export const steps = [
  {
    title: 'Read one passage',
    text: 'A short Bible passage chosen for everyday life. No reading plan to keep up with.',
  },
  {
    title: 'Learn the story behind it',
    text: 'Who wrote it, who first heard it, and what was happening at the time, explained simply.',
  },
  {
    title: 'Hear from faithful voices',
    text: 'What Christians through the centuries noticed in the same words, with sources you can check.',
  },
  {
    title: 'Ask any Bible question',
    text: 'Hit reply with anything you’ve wondered about, one question a day. Get a careful, plain-language answer with sources.',
  },
];

export const seasons = [
  'Single',
  'Dating or engaged',
  'Married',
  'Parents',
  'Single parents',
  'Starting over',
  'Widowed',
  'Empty nesters',
  'Students',
  'Retired',
];

export const premiumSteps = [
  {
    title: 'Tell us a little about your life',
    text: 'A two-minute welcome: your season of life, what you’re carrying, and who you’re praying for. Share only what you want.',
  },
  {
    title: 'Reply with one line at night',
    text: 'Just hit reply and tell us about your day. A win, a worry, a hard conversation. Skip it whenever you like.',
  },
  {
    title: 'Wake up to Scripture for your life',
    text: 'The next morning, your email speaks to what you shared, with the same care and real sources as the free study.',
  },
];

export const premiumFeatures = [
  {
    title: 'Yesterday, through the lens of Scripture',
    text: 'Your one-line reply becomes tomorrow’s study. A hard day, a big win, a quiet worry, held up to God’s Word.',
  },
  {
    title: 'A verse chosen for your season',
    text: 'Not a random verse of the day. A second passage picked for where you are: single, newly married, raising kids, grieving, starting over.',
  },
  {
    title: 'It remembers what matters',
    text: 'Mention a job interview or a loved one’s surgery, and it will come back to it at the right time. Like a friend who actually asks how it went.',
  },
  {
    title: 'Earn while you share',
    text: 'Every Premium member can join the partner program and earn 30% each month for every friend who joins through their link.',
  },
  {
    title: 'Your Scripture journal',
    text: 'Every passage and every reply, kept in one private place. Every 30 days, receive a recap of the verses that carried you and what you wrote along the way.',
  },
  {
    title: 'No streaks. No guilt.',
    text: 'Miss a day or a month? Your next email meets you where life is, not where you left off.',
  },
];

// [feature, Free (true / false / text), Premium (true / text)]
export const compare: [string, boolean | string, true | string][] = [
  ['A daily Bible study in plain language', true, true],
  ['The story behind the verse', true, true],
  ['Voices from Christian history, with sources', true, true],
  ['Ask any Bible question', '1 a day', '2 a day'],
  ['A second verse chosen for your season of life', false, true],
  ['Yesterday, through the lens of Scripture', false, true],
  ['Remembers what you share and follows up', false, true],
  ['Private Scripture journal + a recap every 30 days', false, true],
  ['Partner program: earn 30% every month for each friend who joins', false, true],
];

export const partnerSteps = [
  {
    title: 'Join Premium',
    text: 'The partner program is open to every Premium member.',
  },
  {
    title: 'Share your personal link',
    text: 'With friends, family, your small group, your church, or your followers.',
  },
  {
    title: 'Earn 30% every month',
    text: 'That’s $2.10 a month for each person who joins Premium through your link, paid after their month is fully paid and complete, for as long as they stay.',
  },
];

export const earnings = [
  { people: 4, monthly: '$8.40', note: 'Your Premium pays for itself' },
  { people: 25, monthly: '$52.50', note: 'A small group' },
  { people: 100, monthly: '$210', note: 'A church or community' },
  { people: 1000, monthly: '$2,100', note: 'A following' },
];

export const faqs = [
  {
    q: 'Do I need to know a lot about the Bible?',
    a: 'Not at all. Everything is written in plain language, and we explain names, places, and history as we go. If you have read the Bible for years, you will still find something new.',
  },
  {
    q: 'How long does it take?',
    a: 'About five minutes. Read it with your coffee, on your commute, or before the day gets busy.',
  },
  {
    q: 'What topics do you cover?',
    a: 'We rotate through seven areas of life: growing closer to God; work and purpose; love, family, and friendship; character; wisdom and decisions; serving others; and peace and trust.',
  },
  {
    q: 'How many Bible questions can I ask?',
    a: 'Free members can ask one question a day, and Premium members can ask two. Ask a second one on the free plan and we will answer it the next day. Each answer is 400 to 600 words, about a three-minute read. The limits keep every answer careful and well sourced.',
  },
  {
    q: 'What does it cost?',
    a: 'The daily email is free. Premium is $7 a month, about 23 cents a day, and you can cancel any time. Nothing is charged when you join the list.',
  },
  {
    q: 'How does the partner program work?',
    a: 'Any Premium member can become a partner and get a personal link. When someone joins Premium through your link, you earn 30% of what they pay ($2.10 a month at $7) for every month they pay for and complete. Each commission is paid once that month is over, about 30 days after their payment (net 30), so a referral who cancels or is refunded during their first month does not count. If they cancel later, the commission stops. Your own subscription does not count, and you need an active Premium membership to keep earning.',
  },
  {
    q: 'Is what I share with Premium private?',
    a: 'Yes. What you tell us is only used to write your emails. It is never sold, never used for ads, and never shown to anyone else. You can ask us to delete all of it at any time.',
  },
  {
    q: 'How are the Premium emails written?',
    a: 'Each one is prepared with the help of AI and guided by strict rules: Scripture comes first, every historical claim has a real source, and nothing is made up. It is a study companion, not a replacement for your church, a pastor, or professional care.',
  },
];

