'use client';

import { useEffect, useId, useState } from 'react';
import { suggestEmail } from '@/lib/emailTypos';
import { track } from '@/lib/track';

type Stats = { sold: number; cap: number; tier1_limit: number; tier: 1 | 2; cents: number; leftAtPrice: number; soldOut: boolean };

const money = (c: number) => `$${Math.round(c / 100)}`;

// Lifetime Founders offer: live spots-left counter + email → Stripe Checkout.
export default function FoundersOffer() {
  const id = useId();
  const [stats, setStats] = useState<Stats | null>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [suggestion, setSuggestion] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/founders/stats', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => s && setStats(s))
      .catch(() => {});
  }, []);

  const price = stats ? stats.cents : 3700;
  const tier1 = !stats || stats.tier === 1;

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
      const res = await fetch('/api/founders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, ref }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setError(data.error || 'Something went wrong. Please try again.');
        setBusy(false);
        return;
      }
      track('begin_checkout', { currency: 'USD', value: price / 100, item_name: 'Founders Membership' });
      window.location.href = data.url;
    } catch {
      setError('Could not connect. Please check your internet and try again.');
      setBusy(false);
    }
  }

  if (stats?.soldOut) {
    return (
      <div className="founders sold-out" id="founders">
        <p className="founders-kicker">Founders Membership</p>
        <h3>All 1,000 Founders spots are taken.</h3>
        <p>Thank you. Premium monthly is coming soon; join the list below to hear first.</p>
      </div>
    );
  }

  return (
    <div className="founders" id="founders">
      <div className="founders-head">
        <p className="founders-kicker">Founders Membership, limited to 1,000</p>
        <h3>Premium for life, one payment.</h3>
        <p className="founders-price">
          <span className="amount">{money(price)}</span>
          <span className="once">one time</span>
          {tier1 && <span className="then">then $67 after the first 250</span>}
        </p>
        {stats && (
          <p className="founders-count" aria-live="polite">
            <strong>{stats.leftAtPrice.toLocaleString('en-US')}</strong> of{' '}
            {(tier1 ? stats.tier1_limit : stats.cap - stats.tier1_limit).toLocaleString('en-US')} left at{' '}
            {money(price)}
          </p>
        )}
        <ul className="founders-points">
          <li>Every Premium feature, for as long as Premium exists</li>
          <li>Your price never changes, no monthly bill</li>
          <li>Join the partner program and earn 30%</li>
          <li>Full refund anytime before launch and within 30 days after</li>
        </ul>
      </div>
      <form className="signup-form light founders-form" onSubmit={onSubmit} noValidate>
        <label className="sr-only" htmlFor={`${id}-email`}>
          Email address
        </label>
        <div className="fields founders-fields">
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
            {busy ? 'Opening checkout…' : `Become a Founder for ${money(price)}`}
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
          Secure checkout by Stripe. Premium begins when it launches. By continuing, you agree to our{' '}
          <a className="linklike" href="/terms">Terms</a>.
        </p>
      </form>
    </div>
  );
}
