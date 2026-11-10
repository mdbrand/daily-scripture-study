import SignupForm from './SignupForm';
import Crest from './Crest';
import BackToTop from './BackToTop';
import FoundersOffer from './FoundersOffer';
import PremiumPlans from './PremiumPlans';
import LamplighterForm from './LamplighterForm';
import { SiteFooter } from './LegalShell';
import { anatomy, faqs, lampSteps, promises, voices } from './content';
import { lamplighterStats } from '@/lib/lamplighters';
import { premiumCheckoutOpen } from '@/lib/premium';
import { jsonLd, siteSchema } from '@/lib/articles/schema';
import AuthorAvatar from './AuthorAvatar';

export const revalidate = 300; // refresh the Lamplighter spots count every few minutes

function Lord() {
  return <span className="sc">Lord</span>;
}

// A real morning email, shown instead of described.
function EmailPreview() {
  return (
    <div className="mail" aria-label="A sample Morning Lamp email">
      <div className="mail-bar">
        <span className="mail-brand">Morning Lamp</span>
        <span className="mail-badge">Free edition</span>
      </div>
      <div className="mail-body">
        <p className="mail-kicker">Today’s Bible Study</p>
        <p className="mail-title">“Be still” was first a command to stop fighting</p>
        <blockquote className="mail-verse">
          “Be still, and know that I am God; I will be exalted among the nations, I will be exalted in the earth.”
          <cite>Psalm 46:10</cite>
        </blockquote>
        <p className="mail-h">Behind the Verse</p>
        <p className="mail-p">
          The Hebrew word behind “be still” means to let go or stop. God is speaking to warring nations: put down your
          weapons, and recognize who is God.
        </p>
        <div className="mail-voice">
          <p className="mail-voice-name">
            Martin Luther <span>1483–1546</span>
          </p>
          <p className="mail-p">
            Wrote “A Mighty Fortress Is Our God” as a paraphrase of Psalm 46, around 1529.
          </p>
        </div>
      </div>
    </div>
  );
}

export default async function Home() {
  const [spots, checkoutOpen] = await Promise.all([lamplighterStats(), premiumCheckoutOpen().catch(() => false)]);

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(siteSchema()) }} />
      {/* Lamplighter offer: top bar (only while spots remain) */}
      {spots.open && (
        <p className="ll-bar">
          <span>
            <strong>Limited time:</strong> the first {spots.spots} Lamplighters get Premium free for life.{' '}
            <span className="ll-bar-left">{spots.left} spots left.</span>
          </span>
          <a href="#lamplighters">Become a Lamplighter</a>
        </p>
      )}

      {/* Hero */}
      <header className="title-page">
        <nav className="topbar container" aria-label="Site">
          <a className="wordmark" href="#top" id="top">
            <Crest size={34} title="" />
            <span>Morning Lamp</span>
          </a>
          <div className="toplinks">
            <a href="/bible-verses">Bible Verses</a>
            <a href="#sample">Sample</a>
            <a href="#premium">Premium</a>
            <a href="#lamplighters">Lamplighters</a>
          </div>
        </nav>

        <div className="title-block">
          <Crest size={96} />
          <h1>Every verse has a story. Let me tell you one each morning.</h1>
          <div className="letter-open">
            <a className="letter-from" href="/authors/ezra-lampwright">
              <AuthorAvatar size={52} />
              <span>
                A letter from <strong>Ezra Lampwright</strong>
                <small>Writer of Morning Lamp</small>
              </span>
            </a>
            <p className="salutation">Dear friend,</p>
            <p>
              I’m Ezra, and I write Morning Lamp. My name comes from Ezra, the scribe who read God’s
              word aloud to his people “from daybreak till noon” (Nehemiah 8:3). Mornings with Scripture are an old
              idea. I’d like to share them with you.
            </p>
            <p>
              Every verse was written by someone, to someone, at a moment that mattered. Once you know that moment, the
              words land differently.
            </p>
            <p>
              So each morning at 5 AM, I’ll send you one short passage, the story behind it, and a voice from 2,000
              years of faith. It takes under three minutes, and it’s free.
            </p>
          </div>
          <SignupForm source="hero" tone="light" hidePlanSelect buttonLabel="Yes, send me the study" />
          {spots.open && (
            <div className="ll-offer">
              <p className="ll-offer-kicker">Limited time only</p>
              <p className="ll-offer-title">One more thing: I’m looking for {spots.spots} Lamplighters.</p>
              <p className="ll-offer-text">
                Help shape Morning Lamp and get Premium free for life. Only the first {spots.spots} get lifetime access. {spots.left} of {spots.spots} spots left.
              </p>
              <a className="button gold" href="#lamplighters">
                Claim my Lamplighter spot
              </a>
            </div>
          )}
        </div>
      </header>

      {/* See it */}
      <section className="chapter tinted" id="sample">
        <div className="container split see-it">
          <EmailPreview />
          <div>
            <h2>Here’s what a morning with me looks like.</h2>
            <p className="letter-lead">
              That one is on Psalm 46:10. Most of us read “be still” as “relax.” In its first setting, it meant “stop
              fighting.” That’s the kind of thing I’ll show you.
            </p>
            <ol className="anatomy">
              {anatomy.map((a) => (
                <li key={a.title}>
                  <strong>{a.title}</strong>
                  <span>{a.text}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Why it's different */}
      <section className="chapter">
        <div className="container">
          <h2 className="center">Not just a verse of the day. The world behind it.</h2>
          <p className="center letter-lead">
            You won’t read alone, either. You’ll hear from people like these, who loved the same words long before us:
          </p>
          <ol className="ages" aria-label="Voices you’ll meet">
            {voices.map((v) => (
              <li key={v.name}>
                <span className="ages-year">{v.year}</span>
                <span className="ages-name">{v.name}</span>
                <span className="ages-work">{v.work}</span>
              </li>
            ))}
          </ol>
          <p className="center letter-lead promises-lead">And three promises from me:</p>
          <ul className="promises">
            {promises.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Premium */}
      <section className="chapter chapel premium-center" id="premium">
        <div className="container">
          <header className="chapter-head on-dark">
            <p className="kicker">{checkoutOpen ? 'Premium · $7 a month or $47 a year' : 'Premium'}</p>
            <h2>Last Night’s Lamp: a study written for your day.</h2>
            <p>
              Some mornings you don’t need just any verse. You need one for the conversation that went badly, the news
              you’re waiting on, or the thing you can’t stop being grateful for. That’s what Last Night’s Lamp is for.
            </p>
          </header>

          <ol className="lamp-steps">
            {lampSteps.map((s) => (
              <li key={s.time}>
                <span className="lamp-time">{s.time}</span>
                <strong>{s.title}</strong>
                <span>{s.text}</span>
              </li>
            ))}
          </ol>

          <p className="season-note">
            Quiet night? Tap the season you’re in, like Waiting, Grieving or Grateful, and your next study is written
            for that.
          </p>

          <div className="example">
            <p className="reply">
              <span>Your reply last night</span>
              “Hard conversation with my sister. I said some things I regret.”
            </p>
            <article className="leaf">
              <p className="leaf-kicker">Last Night’s Lamp</p>
              <blockquote className="leaf-verse">
                “If it is possible, as far as it depends on you, live at peace with everyone.”
                <cite>Romans 12:18</cite>
              </blockquote>
              <p>
                Paul wrote this to believers in Rome who disagreed sharply. Notice “as far as it depends on you.” Peace
                isn’t fully in your hands. Only your part is.
              </p>
            </article>
          </div>

          {/* Founders appears only when switched on in the database (dss_config.founders_open). */}
          <FoundersOffer />
          {checkoutOpen ? (
            <>
              <PremiumPlans />
              <p className="fine on-dark-fine">Your free morning study comes with it.</p>
            </>
          ) : (
            // During the beta, the first 100 Lamplighters get Premium free for life instead of a paid waitlist.
            <div className="beta-cta">
              <p className="beta-cta-title">Right now, you can have it free for life.</p>
              <p>
                I’m inviting the first {spots.spots} Lamplighters to use Premium free, for good. {spots.left} of{' '}
                {spots.spots} spots left.
              </p>
              <a className="button gold" href="#lamplighters">
                Apply to be a Lamplighter
              </a>
              <p className="beta-price">After the beta, Premium is $7 a month or $47 a year.</p>
            </div>
          )}
        </div>
      </section>

      {/* Lamplighters */}
      <section className="chapter" id="lamplighters">
        <div className="container lamp-wrap">
          <div>
            <p className="kicker">
              Lamplighters · {spots.left} of {spots.spots} spots left
            </p>
            <h2>Would you be one of the first 100?</h2>
            <p className="lamp-lede">
              Here’s the deal, plainly. You get Premium free for life. In return, you tell me honestly what works and
              what doesn’t. I’ll ask one short question a week.
            </p>
          </div>
          <LamplighterForm open={spots.open} />
        </div>
      </section>

      {/* Questions */}
      <section className="chapter tinted">
        <div className="container narrow">
          <h2 className="center">You might be wondering</h2>
          <div className="faq">
            {faqs.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing */}
      <section className="chapter chapel closing" id="signup">
        <div className="container narrow center">
          <Crest size={64} />
          <figure className="epigraph on-dark">
            <blockquote>Your word is a lamp for my feet, a light on my path.</blockquote>
            <figcaption>Psalm 119:105</figcaption>
          </figure>
          <h2>Start your mornings in the Word.</h2>
          <div className="letter-close">
            <p>
              That’s the whole idea: a few quiet minutes each morning with one verse, and the story that brings it to
              life. I’d be glad to send it to you.
            </p>
            <p className="signoff">
              Warmly,
              <span className="signature">Ezra Lampwright</span>
              <a className="penname" href="/authors/ezra-lampwright">
                The pen name of the Morning Lamp writing desk
              </a>
            </p>
            <p className="ps">
              <strong>P.S.</strong> Your first study can be waiting for you at 5 AM. Add your email below, tap “Confirm
              my email” when my note arrives, and that’s it. It’s free, and it always will be.
            </p>
          </div>
          <SignupForm source="closing" tone="dark" hidePlanSelect buttonLabel="Yes, send me the study" />
        </div>
      </section>

      <SiteFooter />
      <BackToTop />
    </main>
  );
}
