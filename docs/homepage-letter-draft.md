# Morning Lamp home page: "letter" rewrite (DRAFT for Rob)

Draft only, written Nov 10, 2026. Nothing in `app/` or `lib/` has been changed. Prices, offers and the sample email are untouched.

Numbers such as "94 of 100 spots left" are live counts from the database. They are shown here as they read on the live page today and keep updating on their own.

## 1. The approach

- The page reads top to bottom as one letter: a "Dear friend," near the top, the same sections in the same order, and a signature plus a P.S. at the end.
- It is written in the first person ("I'll send you…") by Ezra Lampwright, the site's existing pen name, with a small line under the signature saying it is the pen name of the writing desk. The author page already says this, so the letter stays honest.
- The sales parts are all still there, just spoken instead of announced: the "every verse has a story" hook stays in the headline, the specifics stay (5 AM, under three minutes, NIV, real people and dates), the sample email stays exactly as it is, and the questions people have are answered in plain words.
- Every section still ends in a clear ask, and the button labels are still actions ("Yes, send me the study", "Claim my Lamplighter spot", "Apply to be a Lamplighter").
- The P.S. carries the last ask, right above the final signup form, because the P.S. is often the first thing people read in a letter.
- No new scarcity. The Lamplighter "Limited time" wording that already exists is kept as it is; nothing new is counted down.
- Nothing promises a person hand-reads each reply. Last Night's Lamp is described the way the approved email format does: "written for what you shared" and "written for the season you're in".
- Length: about the same as today. The hero and the closing get a few more lines (salutation, signature, P.S.); the Premium and Lamplighter sections get a little shorter.

---

## 2. Section by section, in page order

### 0. Top bar (Lamplighter offer; only shows while spots remain)

**Purpose:** quick alert about the free-for-life offer; links to the Lamplighters section.

CURRENT (`app/page.tsx`)
> **Limited time:** the first 100 Lamplighters get Premium free for life. 94 spots left.
> Link: Become a Lamplighter

PROPOSED
> **Limited time:** the first 100 Lamplighters get Premium free for life. 94 spots left.
> Link: Become a Lamplighter

**Note:** unchanged. It is a banner, not part of the letter, and changing it would only weaken a working offer.

---

### 1. Hero (above the fold)

**Purpose:** hook, the core promise, the free signup, and the Lamplighter offer box.

CURRENT (`app/page.tsx`)
> **H1:** Every verse has a story. Read it in three minutes.
>
> A free Bible study in your inbox every morning: one passage, the history behind it, and a voice from 2,000 years of faith.
>
> [ Your email address ] **[Start free]**
> *Free, always. Arrives at 5 AM your time. We never sell or share your email. By joining, you agree to our Terms and Privacy Policy.*
>
> *Lamplighter box (while spots remain):*
> LIMITED TIME ONLY
> **Become a Lamplighter and get Premium free for life.**
> Only the first 100 get lifetime access. 94 of 100 spots left.
> **[Claim my Lamplighter spot]**

PROPOSED, version A (with salutation; recommended)
> **H1:** Every verse has a story. Let me tell you one each morning.
>
> Dear friend,
>
> Every verse was written by someone, to someone, at a moment that mattered. Once you know that moment, the words land differently.
>
> So each morning at 5 AM, I'll send you one short passage, the story behind it, and a voice from 2,000 years of faith. It takes under three minutes, and it's free.
>
> [ Your email address ] **[Yes, send me the study]**
> *Free, always. It arrives at 5 AM your time. Your email stays with us: never sold, never shared. By joining, you agree to our Terms and Privacy Policy.*
>
> *Lamplighter box (while spots remain):*
> LIMITED TIME ONLY
> **One more thing: I'm looking for 100 Lamplighters.**
> Help shape Morning Lamp and get Premium free for life. Only the first 100 get lifetime access. 94 of 100 spots left.
> **[Claim my Lamplighter spot]**

PROPOSED, version B (no salutation)
> **H1:** Every verse has a story. Let me tell you one each morning.
>
> Every verse was written by someone, to someone, at a moment that mattered. Each morning at 5 AM, I'll send you one short passage, the story behind it, and a voice from 2,000 years of faith. Under three minutes, and free.
>
> *(form, form note and Lamplighter box the same as version A)*

**Note:** the hook stays in the first half of the headline (it is also the line search engines and AI answers pick up); the second half now sounds like a person offering something. "Three minutes" moves into the body so the headline stays short on a phone. The button says yes to something instead of naming a plan. The form note is shared by every free signup form, so changing it changes the closing form too.

---

### 2. The sample (`#sample`)

**Purpose:** show a real-looking morning email instead of describing it, then list what is in it.

CURRENT (`app/page.tsx` + `anatomy` in `app/content.ts`)
> *[Sample email: "Be still" was first a command to stop fighting / Psalm 46:10 / Behind the Verse / Martin Luther 1483–1546]*
>
> **H2:** Here's what you'll get.
> 1. **The passage.** One short passage from the NIV.
> 2. **The story behind it.** Who wrote it, when, and what was happening.
> 3. **A voice from history.** What a faithful Christian from the past saw in it, with the source.

PROPOSED
> *[Sample email: unchanged, word for word]*
>
> **H2:** Here's what a morning with me looks like.
>
> That one is on Psalm 46:10. Most of us read "be still" as "relax." In its first setting, it meant "stop fighting." That's the kind of thing I'll show you.
>
> 1. **The passage.** One short passage, word for word from the NIV.
> 2. **The story behind it.** Who wrote it, when, and what was happening around them.
> 3. **One detail you might miss.** The small thing that changes how the verse reads.
> 4. **A voice from history.** What a faithful Christian from the past saw in it, with the source so you can look it up.

**Note:** the sample email itself is not touched; it has to match the approved email format. The new two-line lead-in points the reader at the most surprising thing in the sample, which is the persuasion. Item 3 is new to the page but not new to the product: "One detail you might miss" is section 3 of the approved free email (`docs/email-format.md`). It only adds a row to the `anatomy` array; drop it if you want to keep the list at three.

---

### 3. Why it's different (the voices strip)

**Purpose:** separate Morning Lamp from "verse of the day" apps; show real history; make three trust promises.

CURRENT (`app/page.tsx` + `voices`, `promises` in `app/content.ts`)
> **H2:** Not just a verse of the day… It's the world behind it.
>
> c. 400 Augustine, *Confessions* · 1534 Martin Luther, *German Bible* · 1708 Matthew Henry, *Commentary* · 1869 Charles Spurgeon, *The Treasury of David* · 1971 Corrie ten Boom, *The Hiding Place*
>
> - Real history, real dates.
> - Voices with sources, never made-up quotes.
> - Honest when scholars disagree.

PROPOSED
> **H2:** Not just a verse of the day. The world behind it.
>
> You won't read alone, either. You'll hear from people like these, who loved the same words long before us:
>
> *(voices strip unchanged)*
>
> And three promises from me:
> - Real history, with real dates.
> - Voices with sources. Never a made-up quote.
> - When scholars disagree, I'll tell you.

**Note:** keeps the "verse of the day" contrast (a phrase people search for) and the real names and dates, which are the proof. The promises become promises one person makes to another. "People like these" keeps it honest: these five are examples, not a schedule.

---

### 4. Premium: Last Night's Lamp (`#premium`)

**Purpose:** explain the paid feature, show an example, and give the next step (Lamplighter application now; plans when checkout opens).

CURRENT (`app/page.tsx` + `lampSteps` in `app/content.ts`)
> PREMIUM · $7 A MONTH OR $47 A YEAR *(or just "PREMIUM" while checkout is closed)*
> **H2:** Last Night's Lamp: a study written for your day.
>
> **8 PM** · We ask how your day went. A short check-in, every evening.
> **Tonight** · You reply with one line. A win, a worry, a hard conversation.
> **5 AM** · A study written for your day. A passage for how you felt, the story behind it, and a voice who walked through the same thing.
>
> *Your reply last night:* "Hard conversation with my sister. I said some things I regret."
> *Last Night's Lamp:* "If it is possible, as far as it depends on you, live at peace with everyone." Romans 12:18. Paul wrote this to believers in Rome who disagreed sharply. Notice "as far as it depends on you." Peace isn't fully in your hands. Only your part is.
>
> *Beta box (checkout closed, today):*
> **Get Premium free for life.**
> Be one of the first 100 Lamplighters. 94 of 100 spots left.
> **[Apply to be a Lamplighter]**
> After the beta, Premium is $7 a month or $47 a year.

PROPOSED
> PREMIUM · $7 A MONTH OR $47 A YEAR *(kicker logic unchanged)*
> **H2:** Last Night's Lamp: a study written for your day.
>
> Some mornings you don't need just any verse. You need one for the conversation that went badly, the news you're waiting on, or the thing you can't stop being grateful for. That's what Last Night's Lamp is for.
>
> **8 PM** · I ask how your day went. A short check-in, every evening.
> **Tonight** · You reply with one line. A win, a worry, a hard conversation. One line is enough.
> **5 AM** · A study written for your day. A passage for how you felt, the story behind it, and a voice who walked through the same thing.
>
> Quiet night? Tap the season you're in, like Waiting, Grieving or Grateful, and your next study is written for that.
>
> *(reply + Last Night's Lamp example: unchanged, word for word)*
>
> *Beta box (checkout closed):*
> **Right now, you can have it free for life.**
> I'm inviting the first 100 Lamplighters to use Premium free, for good. 94 of 100 spots left.
> **[Apply to be a Lamplighter]**
> After the beta, Premium is $7 a month or $47 a year.

*When checkout opens (`PremiumPlans`, `app/PremiumPlans.tsx`):* kicker "Premium pricing" stays; heading "Choose how you'd like to pay." becomes **"Pick whatever's easiest for you."**; plan cards, prices, savings and button labels unchanged. Fine print "Includes everything in the free study." becomes **"Your free morning study comes with it."**

*Founders Membership box (`app/FoundersOffer.tsx`, switched off today):* unchanged.

**Note:** the H2 keeps the exact name "Last Night's Lamp" (required everywhere). The new opening paragraph sells the feeling before the mechanics. The season line describes what the approved format already does (season buttons in the Premium morning email; the next study is written for that season). The example reply and Romans 12:18 are kept word for word.

---

### 5. Lamplighters (`#lamplighters`)

**Purpose:** the beta offer and its application form.

CURRENT (`app/page.tsx` + `app/LamplighterForm.tsx`)
> LAMPLIGHTERS · 94 OF 100 SPOTS LEFT
> **H2:** Be one of the first 100.
> Get Premium free for life. In return, tell us honestly what works and what doesn't: one short question a week.
>
> Form: *Email* / *Why would you like to join?* (placeholder "One line is plenty.") / **[Apply to be a Lamplighter]**
> When full: "All 100 spots are taken. You can still start the free daily study above."

PROPOSED
> LAMPLIGHTERS · 94 OF 100 SPOTS LEFT
> **H2:** Would you be one of the first 100?
> Here's the deal, plainly. You get Premium free for life. In return, you tell me honestly what works and what doesn't. I'll ask one short question a week.
>
> Form: *Email* / *Why would you like to join?* (placeholder "One line is plenty.") / **[Apply to be a Lamplighter]**
> When full: "All 100 spots are taken, but the free daily study is still yours. Start it above."

**Note:** a question reads like an invitation instead of a banner. The terms are spelled out ("the deal, plainly"), which builds trust and still makes the offer. The form, its labels and its button are unchanged so the application data stays the same.

---

### 6. Questions

**Purpose:** answer the objections: cost, time, translation, cancelling.

CURRENT (`faqs` in `app/content.ts`)
> **H2:** Questions
> - **Is it really free?** Yes. The daily study is free, always. Premium adds Last Night's Lamp for $7 a month or $47 a year.
> - **How long does it take?** Under three minutes. It arrives at 5 AM in your time zone.
> - **Which Bible translation?** The NIV, so it reads the way people speak today.
> - **Can I cancel or unsubscribe?** Anytime. Every email has a one-click unsubscribe link. Premium can be canceled anytime and stays active until the end of the period you paid for.

PROPOSED
> **H2:** You might be wondering
> - **Is it really free?** Yes. The daily study is free, and it always will be. Premium adds Last Night's Lamp for $7 a month or $47 a year.
> - **How long does it take?** Under three minutes. It arrives at 5 AM in your time zone, before your day gets going.
> - **Which Bible translation?** The NIV, so it reads the way people speak today. Every verse is quoted word for word.
> - **Can I cancel or unsubscribe?** Anytime, no hard feelings. Every email has a one-click unsubscribe link. Premium can be canceled anytime and stays active until the end of the period you paid for.

**Note:** same four questions, same facts and prices; the heading and a few words sound like a person answering. "Word for word" matches the rule that Scripture is always the exact 2011 NIV.

---

### 7. Closing (`#signup`), now with signature and P.S.

**Purpose:** the last signup ask.

CURRENT (`app/page.tsx`)
> *[Crest]*
> *Your word is a lamp for my feet, a light on my path.* Psalm 119:105
> **H2:** Start your mornings in the Word.
> [ Your email address ] **[Start free]**
> *Free, always. Arrives at 5 AM your time. We never sell or share your email. By joining, you agree to our Terms and Privacy Policy.*

PROPOSED
> *[Crest]*
> *Your word is a lamp for my feet, a light on my path.* Psalm 119:105 *(unchanged)*
> **H2:** Start your mornings in the Word.
>
> That's the whole idea: a few quiet minutes each morning with one verse, and the story that brings it to life. I'd be glad to send it to you.
>
> Warmly,
> *Ezra Lampwright*
> <small>The pen name of the Morning Lamp writing desk</small> *(links to /authors/ezra-lampwright)*
>
> **P.S.** Your first study can be waiting for you at 5 AM. Add your email below, tap "Confirm my email" when my note arrives, and that's it. It's free, and it always will be.
>
> [ Your email address ] **[Yes, send me the study]**
> *(form note as in the hero)*

**Note:** the headline and Psalm 119:105 stay. The signature closes the letter; the small pen-name line keeps it honest. The P.S. carries the final ask, sits right above the form, and names the confirm-email step so fewer people stall after signing up.

---

## 3. Choices for Rob

1. **Salutation.** "Dear friend," (recommended), "Good morning," or none (hero version B).
2. **Who signs it.**
   - "Warmly, Ezra Lampwright" with the small pen-name line (recommended; matches the bylines on the site).
   - "Ezra Lampwright, for the Morning Lamp writing desk" (one line, no separate note).
   - "The Morning Lamp desk" (switch the letter from "I" to "we" throughout).
   - Your own first name, as founder. That's the most personal choice, but the "I" lines would then be from you, so check that you're comfortable with "I'll send you…" and "I ask how your day went."
3. **"I" or "we".** The draft uses "I" for warmth. The emails themselves say "we" ("tell us", "we find Scripture for what you shared"). If you'd like the page and the emails to match exactly, use "we" and sign as the desk.
4. **Headline.** "Every verse has a story. Let me tell you one each morning." (recommended) or keep today's "Every verse has a story. Read it in three minutes."
5. **Main button label.** "Yes, send me the study" (recommended), "Send me tomorrow's study", or keep "Start free".
6. **P.S. text.** As drafted, or a shorter one: "P.S. It's free, it takes under three minutes, and your first study can be waiting at 5 AM. Add your email below."
7. **Optional P.P.S. (only while Lamplighter spots remain):** "P.P.S. If you'd like Premium free for life, there are still 94 Lamplighter spots. Apply above." This repeats an existing offer; it adds no new scarcity.
8. **Fourth "what you'll get" item** ("One detail you might miss"). Keep it (it's in every free email) or drop it to keep the list at three.
9. **Optional line under the signature about the name:** "Named for Ezra, who read God's law aloud 'from daybreak till noon.'" This quotes Nehemiah 8:3 (NIV), which is on the author page but not on the home page today, so check it before using it.

### Scripture check
The main draft quotes no new verses. It keeps the three already on the page, word for word: Psalm 46:10 (in the sample email), Romans 12:18 (in the Premium example) and Psalm 119:105 (closing). The only new verse is the optional Nehemiah 8:3 fragment in choice 9 ("from daybreak till noon"). Check it against the 2011 NIV before using it.
