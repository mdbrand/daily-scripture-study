'use client';

import { useEffect, useId, useState } from 'react';
import SignupForm from './SignupForm';
import { PLANS, YEARLY_SAVINGS_CENTS, YEARLY_SAVINGS_PCT } from '@/lib/plans';
import { suggestEmail } from '@/lib/emailTypos';
import { track } from '@/lib/track';

type Billing = 'yearly' | 'monthly';

// Public Premium pricing: $7/month or $47/year with the savings shown.
// When checkout is open (dss_config.premium_checkout_open) the button goes to Stripe;
// otherwise choosing a plan joins the early-access list for that plan.
export default function PremiumPlans() {
  const [billing, setBilling] = useState<Billing>('yearly');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch('/api/premium/settings', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => setOpen(!!s?.checkout_open))
      .catch(() => {});
  }, []);

  return (
    <div className="plans" id="pricing">
      <div className="plans-head">
        <p className="plans-kicker">Premium pricing</p>
        <h3>Pick whatever’s easiest for you.</h3>
      </div>

      <div className="plan-options" role="radiogroup" aria-label="Billing">
        <button
          type="button"
          role="radio"
          aria-checked={billing === 'yearly'}
          className={`plan-option${billing === 'yearly' ? ' selected' : ''}`}
          onClick={() => setBilling('yearly')}
        >
          <span className="plan-save">Save ${YEARLY_SAVINGS_CENTS / 100} ({YEARLY_SAVINGS_PCT}% off)</span>
          <span className="plan-name">Yearly</span>
          <span className="plan-price">
            ${PLANS.yearly.cents / 100}
            <small>/year</small>
          </span>
          <span className="plan-sub">
            About ${(PLANS.yearly.cents / 100 / 12).toFixed(2)} a month, billed once a year
          </span>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={billing === 'monthly'}
          className={`plan-option${billing === 'monthly' ? ' selected' : ''}`}
          onClick={() => setBilling('monthly')}
        >
          <span className="plan-name">Monthly</span>
          <span className="plan-price">
            ${PLANS.monthly.cents / 100}
            <small>/month</small>
          </span>
          <span className="plan-sub">Cancel any time</span>
        </button>
      </div>

      {open ? (
        <CheckoutForm billing={billing} />
      ) : (
        <SignupForm
          key={billing}
          source={`premium-${billing}`}
          defaultPlan="premium"
          tone="light"
          hidePlanSelect
          buttonLabel={billing === 'yearly' ? 'Get Premium yearly' : 'Get Premium monthly'}
          premiumNote={
            billing === 'yearly'
              ? `Premium yearly is $${PLANS.yearly.cents / 100}/year when it opens. No payment today.`
              : `Premium monthly is $${PLANS.monthly.cents / 100}/month when it opens. No payment today.`
          }
        />
      )}
    </div>
  );
}

function CheckoutForm({ billing }: { billing: Billing }) {
  const id = useId();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const price = billing === 'yearly' ? `$${PLANS.yearly.cents / 100}/year` : `$${PLANS.monthly.cents / 100}/month`;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const typo = suggestEmail(email);
    if (typo && typo !== suggestion) {
      setSuggestion(typo);
      return;
    }
    setBusy(true);
    setError('');
    let ref = '';
    try {
      ref = new URLSearchParams(window.location.search).get('ref') || window.localStorage.getItem('dss_ref') || '';
    } catch {}
    try {
      const res = await fetch('/api/premium/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, billing, ref }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setError(data.error || 'Something went wrong. Please try again.');
        setBusy(false);
        return;
      }
      track('begin_checkout', {
        currency: 'USD',
        value: (billing === 'yearly' ? PLANS.yearly.cents : PLANS.monthly.cents) / 100,
        item_name: `Premium ${billing}`,
      });
      window.location.href = data.url;
    } catch {
      setError('Could not connect. Please check your internet and try again.');
      setBusy(false);
    }
  }

  return (
    <form className="signup-form light no-plan" onSubmit={onSubmit} noValidate>
      <div className="fields">
        <label className="sr-only" htmlFor={`${id}-email`}>
          Email address
        </label>
        <input
          id={`${id}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Your email address"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setSuggestion(null);
          }}
          onBlur={() => setSuggestion(suggestEmail(email))}
        />
        <button type="submit" disabled={busy}>
          {busy ? 'Opening checkout…' : `Start Premium, ${price}`}
        </button>
      </div>
      {suggestion && (
        <p className="form-suggest" role="status">
          Did you mean{' '}
          <button type="button" className="linklike" onClick={() => { setEmail(suggestion); setSuggestion(null); }}>
            {suggestion}
          </button>
          ?
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <p className="form-note">
        Secure checkout by Stripe. Renews {billing === 'yearly' ? 'yearly' : 'monthly'} until you cancel; cancel
        anytime. All payments are final. By continuing, you agree to our <a className="linklike" href="/terms">Terms</a>.
      </p>
    </form>
  );
}
