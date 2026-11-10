# Morning Lamp email format (approved November 8, 2026)

This is the approved format for every Morning Lamp email. **Do not add, remove, rename, or reorder sections without the owner's sign-off.** Code that builds these emails: `lib/email/templates.ts` (layout), `lib/studyWriter.ts` (daily study), `lib/reflectionWriter.ts` (Last Night's Lamp), `lib/daily.ts` (sending).

## Header (every email)
Navy bar with "Morning Lamp" on the left. Badge on the right: gold **✦ Premium** pill for Premium readers, outlined **Free edition** tag for everyone else.

## Daily study: free edition (5 AM in the reader's own time zone)
1. **Today's Bible Study**: date, title, pillar, one passage (exact 2011 NIV), short intro.
2. **Behind the Verse**: no more than **3 paragraphs**.
3. **One detail you might miss.**
4. **Voices Through History**: **exactly one voice**. Prefer someone who commented on this passage itself ("Direct commentary"); otherwise a "Thematic connection".
5. **Where to Read More**: 2 or 3 links.
6. **Premium box** (navy): titled "Last Night's Lamp", explains the evening check-in, button "Get Premium: $7/month or $47/year".
7. **Have a Bible question?**: one question a day.

## Daily study: Premium edition
Sections 1–5 above (no Premium box), then **Last Night's Lamp**:

- Navy divider: **LAST NIGHT'S LAMP**, italic subtitle *Written for what you shared last night*.
- "Last night you wrote: '…'"
- **One passage** that speaks to the feeling behind what they shared.
- **Behind the Verse**: no more than 3 paragraphs, unpacking that passage and connecting it to their day.
- **Voices Through History**: **one voice** who wrote about or lived through the same feeling. Must be a different person from the voice in the main study.

**When the reader didn't reply last night** (approved by the owner Nov 10, 2026), the section is never wasted:
- **Season** (they tapped a season more recently than their last note): subtitle *Written for the season you're in*, "You told us you're in a season of waiting. This study is written for it.", then the same passage / Behind the Verse / one voice, written for that season. Written as soon as they tap, or overnight.
- **Follow-up** (they shared a note in the last 21 days): subtitle *Picking up where you left off*, "On Saturday night you wrote: '…'", then a fresh study that picks up from that note (different passage, asks how things have moved, one next step, one voice). Written overnight, 2–4 AM their time.
- Both end with a line inviting tonight's reply and the 7 season buttons, smaller ("Or tap the season you're in").
- **Nothing to go on** (never shared, no season): subtitle *A study written in response to your day*, heading "What season are you in?" with the **7 one-tap season buttons** (Anxious, Waiting, Grieving, Stretched thin, Starting over, Far from God, Grateful), then "Or tell us about your day" and the invitation to reply to tonight's check-in.
- A season button opens morninglamp.study/s/<token>/<season>, which saves the season and writes tomorrow's Lamp for it (unless they already shared something for tomorrow). A real reply always wins over a season.

There is **no "A Verse for Your Life"** and no second verse anywhere. It was removed on purpose.

## Evening check-in: Premium only (8 PM in the reader's time zone)
- Night look so it reads as the evening half of the loop: under the "Morning Lamp" header, a night-sky picture with a glowing clay oil lamp (`public/email/evening-header.png`, drawn from `scripts/evening-header.svg`), then a dark band: "Evening · A lamp for your feet" and Psalm 119:105 (NIV).
- Small label: "Last Night's Lamp · Evening check-in". Rotating headline ("How did today go?", "Before you rest: how was today?", ...).
- The ask: hit reply and tell us how today went.
- Three-step path, "Tonight" lit: 1 Tonight: reply and tell us how your day went · 2 Overnight: we find Scripture for what you shared · 3 5 AM: Last Night's Lamp, written for you.
- Says plainly that what they share becomes tomorrow morning's Last Night's Lamp.
- **7 one-tap season buttons** (approved by the owner Nov 10, 2026), for readers too busy to reply: "Too busy to write tonight? Tap the season you're in, and tomorrow's Last Night's Lamp will be written for it." then the same 7 rotating buttons (4 hard, 3 good) and styling as the morning email. They rotate on the next morning's date and the reader's token, the same rotation that morning's email uses. Listed as links in the plain-text version too. Same tap behavior as the morning buttons: a tap at 8 PM writes the next morning's Lamp, and a real reply still wins.
- "Nothing to share tonight? No need to reply. Your daily study still arrives at 5 AM." Then "Rest well, Morning Lamp".
- Not sent if they already shared something that day.

## Rules
- The Premium section is called **Last Night's Lamp** everywhere: emails, website, admin. Never "Yesterday, through the lens of Scripture".
- Bible questions: **one a day for everyone**, free and Premium.
- Scripture is always the exact 2011 NIV wording.
- Replies that sound like a crisis get no automated reflection; admins are emailed to follow up personally.
- Every subscriber email has the unsubscribe link and mailing address in the footer.
- Before shipping any change to these emails, send test copies of the free, Premium, and check-in emails from `/admin/studies` and check them against this page.
