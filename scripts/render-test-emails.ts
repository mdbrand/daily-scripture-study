// Renders the sample emails to email-previews/*.html (and .txt). Run: node scripts/render-test-emails.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { ANSWER_WORDS, answerWordCount, renderAnswerEmail, renderDailyEmail } from '../lib/email/templates.ts';
import { answerPsalm46War, sampleAnswer, sampleFreeStudy } from '../lib/email/samples.ts';

mkdirSync('email-previews', { recursive: true });
for (const [name, out] of [
  ['free-daily', renderDailyEmail(sampleFreeStudy)],
  ['you-asked', renderAnswerEmail(sampleAnswer)],
] as const) {
  writeFileSync(`email-previews/${name}.html`, out.html);
  writeFileSync(`email-previews/${name}.txt`, `Subject: ${out.subject}\n\n${out.text}`);
  console.log(`${name}: ${out.subject} (${out.html.length} bytes)`);
}

for (const [name, a] of [['you-asked', sampleAnswer], ['answer-psalm46-war', answerPsalm46War]] as const) {
  const n = answerWordCount(a);
  const ok = n >= ANSWER_WORDS.min && n <= ANSWER_WORDS.max;
  console.log(`${name}: ${n} words ${ok ? 'OK' : `OUTSIDE ${ANSWER_WORDS.min}-${ANSWER_WORDS.max}`}`);
}
