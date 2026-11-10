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
          <h1>Every verse has a story. Read it in three minutes.</h1>
          <p className="lede">
            A free Bible study in your inbox every morning: one passage, the history behind it, and a voice from 2,000
            years of faith.
          </p>
          <SignupForm source="hero" tone="light" hidePlanSelect buttonLabel="Start free" />
          {spots.open && (
            <div className="ll-offer">
              <p className="ll-offer-kicker">Limited time only</p>
              <p className="ll-offer-title">Become a Lamplighter and get Premium free for life.</p>
              <p className="ll-offer-text">
                Only the first {spots.spots} get lifetime access. {spots.left} of {spots.spots} spots left.
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
            <h2>Here’s what you’ll get.</h2>
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
          <h2 className="center">Not just a verse of the day… It’s the world behind it.</h2>
          <ol className="ages" aria-label="Voices you’ll meet">
            {voices.map((v) => (
              <li key={v.name}>
                <span className="ages-year">{v.year}</span>
                <span className="ages-name">{v.name}</span>
                <span className="ages-work">{v.work}</span>
              </li>
            ))}
          </ol>
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
              <p className="fine on-dark-fine">Includes everything in the free study.</p>
            </>
          ) : (
            // During the beta, the first 100 Lamplighters get Premium free for life instead of a paid waitlist.
            <div className="beta-cta">
              <p className="beta-cta-title">Get Premium free for life.</p>
              <p>
                Be one of the first 100 Lamplighters. {spots.left} of {spots.spots} spots left.
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
            <h2>Be one of the first 100.</h2>
            <p className="lamp-lede">
              Get Premium free for life. In return, tell us honestly what works and what doesn’t: one short question
              a week.
            </p>
          </div>
          <LamplighterForm open={spots.open} />
        </div>
      </section>

      {/* Questions */}
      <section className="chapter tinted">
        <div className="container narrow">
          <h2 className="center">Questions</h2>
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
          <SignupForm source="closing" tone="dark" hidePlanSelect buttonLabel="Start free" />
        </div>
      </section>

      <SiteFooter />
      <BackToTop />
    </main>
  );
}
