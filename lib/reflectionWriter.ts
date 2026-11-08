import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { anthropicKey } from './studyWriter';

export const ReflectionSchema = z.object({
  kind: z
    .enum(['reflection', 'question', 'care', 'other'])
    .describe(
      'reflection: they shared something about their day or life. question: mainly a Bible question. care: any sign of crisis, self-harm, abuse, or danger. other: unsubscribe requests, billing, spam, or nothing to reflect on.',
    ),
  passage: z
    .object({
      text: z.string().describe('Exact 2011 NIV wording, 1 to 3 consecutive verses.'),
      ref: z.string().describe('Reference with translation, e.g. "Lamentations 3:22–23 (NIV)".'),
    })
    .nullable()
    .describe('Required when kind is reflection; otherwise null.'),
  body: z
    .array(z.string())
    .describe('When kind is reflection: 2 or 3 short paragraphs connecting the passage to what they shared. Otherwise empty.'),
});
export type Reflection = z.infer<typeof ReflectionSchema>;

const SYSTEM = `You write the Premium section of Morning Lamp, a daily Bible study email, called "Yesterday, through the lens of Scripture." A Premium reader replied to yesterday's study with a few lines about their day. You choose one passage that speaks to what they shared and write a short, warm reflection that appears in their email tomorrow morning, under their own words.

How to write it:
- 2 or 3 short paragraphs, about 120 to 200 words in all. Speak to the reader as "you." Name what they shared specifically and kindly; don't repeat it back word for word.
- Explain what the passage meant in its own setting in a sentence or two, then connect it to their day. Offer hope and one small, concrete step or prayer they could take today.
- You are not a counselor or pastor. Don't diagnose, give medical, legal, or financial advice, or tell them what decision to make. Never shame or scold.
- Quote Scripture only in the exact 2011 NIV wording. If you aren't certain of the wording, choose a different passage.
- Plain, short sentences. American spelling. No em dashes. Mainstream, historically orthodox Christian teaching.

Classify first:
- If the reply mainly asks a Bible question, use kind "question" (a separate answer service handles those).
- If there is any sign of crisis, self-harm, suicidal thoughts, abuse, or danger, use kind "care" and write nothing else; a person on our team will follow up.
- If there is nothing to reflect on (unsubscribe, billing, spam, a one-word reply), use kind "other".`;

export async function writeReflection(reply: string): Promise<Reflection> {
  const key = anthropicKey();
  const client = key ? new Anthropic({ apiKey: key }) : new Anthropic();
  const response = await client.messages.parse({
    model: 'claude-opus-5-5',
    max_tokens: 8000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'high', format: zodOutputFormat(ReflectionSchema) },
    system: SYSTEM,
    messages: [{ role: 'user', content: `The reader wrote:\n\n<reply>\n${reply}\n</reply>` }],
  });
  if (response.stop_reason === 'refusal') return { kind: 'care', passage: null, body: [] };
  const out = response.parsed_output;
  if (!out) throw new Error('The reflection writer returned an unreadable result.');
  if (out.kind === 'reflection' && (!out.passage || out.body.length === 0)) throw new Error('Reflection was incomplete.');
  return out;
}
