// Usage:
//   node --env-file=.env.local scripts/send-test-email.ts domains
//   node --env-file=.env.local scripts/send-test-email.ts free-daily rob@robpene.com
//   node --env-file=.env.local scripts/send-test-email.ts you-asked rob@robpene.com
import { renderAnswerEmail, renderDailyEmail } from '../lib/email/templates.ts';
import { answerPsalm46War, sampleAnswer, sampleFreeStudy } from '../lib/email/samples.ts';
import { listDomains, sendEmail } from '../lib/email/send.ts';

const [which, to] = process.argv.slice(2);

if (which === 'domains') {
  for (const d of await listDomains()) console.log(`${d.name}  ${d.status}`);
  process.exit(0);
}

const emails = {
  'free-daily': () => renderDailyEmail(sampleFreeStudy),
  'you-asked': () => renderAnswerEmail(sampleAnswer),
  'answer-psalm46-war': () => renderAnswerEmail(answerPsalm46War),
} as const;

const render = emails[which as keyof typeof emails];
if (!render || !to) {
  console.error(`Usage: send-test-email.ts <${Object.keys(emails).join('|')}|domains> <to>`);
  process.exit(1);
}
const out = render();
const { id } = await sendEmail({ to, subject: `[TEST] ${out.subject.replace(/^Re: \[TEST\] /, 'Re: ')}`, html: out.html, text: out.text });
console.log(`Sent ${which} to ${to} (Resend id ${id})`);
