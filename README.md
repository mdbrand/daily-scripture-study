# Morning Lamp

A daily Bible study by email, at **morninglamp.study** (domain bought Nov 8 2026 at Namecheap). Formerly "Daily Scripture Study"; the GitHub repo keeps the old name.

Next.js starter project for a public Scripture-study landing page and future subscription product. Prepared for Claude Code and eventual Vercel deployment.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000. Deploy on Vercel after pushing to a GitHub repository.

## What exists

- Responsive landing page: free daily email, sample study, life-season section, FAQ.
- Premium section ($7/month, early-access list only; **no payment is taken yet**).
- Email signup with a Free / Premium dropdown (hero, Premium price card, closing section).
  - `POST /api/subscribe` validates the email, rate-limits per IP, flags (never drops) honeypot hits,
    and saves into `public.dss_subscribers` in the **Mission OS** Supabase project.
  - Table schema: `supabase/migrations/20261108000000_dss_subscribers.sql` (RLS on, server-only access).
  - Writes go through the `public.dss_subscribe()` function (`supabase/migrations/20261108020000_dss_subscribe_rpc.sql`),
    so the route only needs `SUPABASE_URL` + the public `SUPABASE_PUBLISHABLE_KEY` (see `.env.example`). No secret key.
    Without them the form shows "Sign-ups are not open quite yet".
- Partner program section (Premium members earn a 30% recurring commission ($2.10/month at $7) per referred paying Premium member, for as long as
  that member stays subscribed). Payout rule: net 30, so each commission is earned only after the referred member
  has paid for and completed that month (first-month cancels/refunds earn nothing). Partner links are `/?ref=<code>`: the code is remembered in the browser and
  saved as `referred_by` on signup (`supabase/migrations/20261108010000_dss_referrals.sql`; first referrer wins).
  Partner codes, dashboards, and payouts are not built yet.

## Product architecture for Claude Code

1. Add email-only signup with server-side validation, double opt-in, unsubscribe link, and privacy policy. Do not store addresses in client code.
2. Separate PUBLIC daily edition (shared second Scripture) from future PAID personalized edition. Never expose one person's ChatGPT, Gmail, Fathom, or personal activity to other subscribers.
3. Build an editor/research workflow for one primary ESV passage, a second passage, biblical background, and historically verified commentary. Keep citation URLs and label direct commentary versus thematic parallels.
4. Track prior passages, commentators, dates, and angles; aim for 90-day commentator variety while prioritizing accuracy.
5. Render full-content responsive HTML email with navy header, ivory Today's Bible Study card, an independent full-width navy divider reading YESTERDAY, THROUGH THE LENS OF SCRIPTURE, and a separate white bordered A Verse for Your Life card.
6. Approved headings: Today's Bible Study; A Verse for Your Life; Looking Back at Yesterday; Behind the Verse; Voices Through History; Where to Read More.
7. Keep copy accessible to sixth-grade readers without removing dates, authorship uncertainty, historical detail, or sources. No prayers, challenges, generic applications, or invented historical quotations.
8. Add scheduled sending with idempotency to avoid duplicate sends; logging, delivery tracking, retries, and test sends. Respect ESV licensing and quotation limits.
9. Add subscriber consent, access controls, rate limiting, data retention, and GDPR/CCPA-aware deletion requests before public launch.
10. Keep current personal 4 AM ChatGPT/Gmail automation **separate** from this website until explicitly migrated. Do not assume Dotty push notifications are integrated.

## Deployment

Create a GitHub repository, push these files, import the repository into Vercel, then set environment variables. The static landing page works without external services.

## Premium recaps (spec)

Premium members get one recap **every 30 days** (fixed, no setting to choose). Each recap pulls from their private Scripture journal: the passages they
received, the ones that came during their hardest stretches, the historical voices they met, and their own
words from replies ("Two weeks ago, you wrote..."). Include a shareable card with no private details.

## Bible question limits (spec)

Replies that ask a question are answered by email. Guardrail: **Free = 1 question per day, Premium = 2 per day**,
counted per subscriber per calendar day in their time zone. Extra questions are not dropped: reply with a short,
friendly note and queue them for the next day. Free answers go out as their own reply; Premium answers can also
appear in the next morning's email under "You Asked."
Length: every answer is **400–600 words** (short answer + body + voices; `answerWordCount()` in
`lib/email/templates.ts` checks it, and `node scripts/render-test-emails.ts` flags any sample outside the range).

## Analytics & search

- **Google Tag Manager:** `GTM-TP8WP5KL` (env `NEXT_PUBLIC_GTM_ID`). All tags live in GTM, not in code.
- **GA4:** property "Morning Lamp" (`G-PJBD873773`), loaded by GTM. The signup form pushes
  `dataLayer.push({event: 'sign_up', method: 'email', plan, form_location})`; GTM sends it to GA4 as `sign_up`.
- **Search Console:** Domain property `morninglamp.study` (DNS TXT at Namecheap); sitemap `/sitemap.xml` submitted.


## Partner program

- `/partners`: email sign-in link (30 min, one use) → join (Premium only, pick a link name, accept terms) → dashboard with link, visits, sign-ups, pending/ready/paid commissions, and Stripe payout setup.
- Payouts use Stripe Connect Express. Connect must be turned on in the Stripe dashboard first.
- `/api/cron/daily` (Vercel Cron, 15:00 UTC): moves commissions older than 30 days to "earned". On the 1st it pays earned balances of $25+ by Stripe transfer, emails each partner a statement, and emails `ADMIN_EMAILS` a summary. Failed transfers are logged and retried next month.
- `/admin/partners`: report for addresses in `ADMIN_EMAILS` (sign in at /partners first).
- Commissions only go to active partners who are Premium themselves, and never for their own purchases.
