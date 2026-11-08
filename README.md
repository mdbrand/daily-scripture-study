# Daily Scripture Study

Next.js starter project for a public Scripture-study landing page and future subscription product. Prepared for Claude Code and eventual Vercel deployment.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000. Deploy on Vercel after pushing to a GitHub repository.

## What exists

- Responsive landing page with approved brand colors and clear public positioning.
- Seven pillars, historical voices, and the two-study concept.
- Explicitly labeled coming-soon interest list; **no functional email collection yet**.

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
