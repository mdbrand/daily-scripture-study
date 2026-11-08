'use client';

import { useEffect, useId, useState } from 'react';
import type { Plan } from '@/lib/subscribe';
import { suggestEmail } from '@/lib/emailTypos';
import { track } from '@/lib/track';

type Props = {
  source: string;
  defaultPlan?: Plan;
  tone?: 'dark' | 'light';
  buttonLabel?: string;
  hidePlanSelect?: boolean; // used where the plan is already chosen (e.g. the Premium plan picker)
  premiumNote?: string;
};

export default function SignupForm({
  source,
  defaultPlan = 'free',
  tone = 'dark',
  buttonLabel,
  hidePlanSelect = false,
  premiumNote,
}: Props) {
  const id = useId();
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState<Plan>(defaultPlan);
  const [website, setWebsite] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [ref, setRef] = useState('');
  const [suggestion, setSuggestion] = useState<string | null>(null);

  // Remember a partner link (?ref=code) so the signup is credited even if they browse first.
  useEffect(() => {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get('ref');
      if (fromUrl) {
        window.localStorage.setItem('dss_ref', fromUrl);
        // Count one visit per partner link per browser per day (only the hero form reports it).
        const day = new Date().toISOString().slice(0, 10);
        const seen = `dss_click_${fromUrl}_${day}`;
        if (source === 'hero' && !window.localStorage.getItem(seen)) {
          window.localStorage.setItem(seen, '1');
          fetch('/api/partners/click', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: fromUrl }),
            keepalive: true,
          }).catch(() => {});
        }
      }
      setRef(fromUrl || window.localStorage.getItem('dss_ref') || '');
    } catch {
      // Storage can be blocked (private mode); the URL value still works for this visit.
      setRef(new URLSearchParams(window.location.search).get('ref') || '');
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Catch an obvious typo once, before sending. A second click sends it as typed.
    const typo = suggestEmail(email);
    if (typo && typo !== suggestion) {
      setSuggestion(typo);
      return;
    }
    setState('sending');
    setMessage('');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, plan, source, website, ref, timezone: browserTimeZone() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState('error');
        setMessage(data.error || 'Something went wrong. Please try again.');
        if (data.suggestion) setSuggestion(data.suggestion);
        return;
      }
      setState('done');
      // GA4 recommended event name; plan + form location as parameters.
      track('sign_up', { method: 'email', plan, form_location: source });
    } catch {
      setState('error');
      setMessage('Could not connect. Please check your internet and try again.');
    }
  }

  if (state === 'done') {
    return (
      <div className={`signup-done ${tone}`} role="status">
        <p className="done-title">You’re on the list.</p>
        {plan === 'premium' ? (
          <p>
            You picked <strong>Premium</strong>. We’ll email you before it opens. Nothing is charged
            today, and you can still choose the free email instead.
          </p>
        ) : (
          <p>We’ll email you when the first study is ready. Unsubscribe any time.</p>
        )}
      </div>
    );
  }

  return (
    <form className={`signup-form ${tone}${hidePlanSelect ? ' no-plan' : ''}`} onSubmit={onSubmit} noValidate>
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
        {!hidePlanSelect && (
          <>
            <label className="sr-only" htmlFor={`${id}-plan`}>
              Which edition?
            </label>
            <select id={`${id}-plan`} value={plan} onChange={(e) => setPlan(e.target.value as Plan)}>
              <option value="free">Free daily email</option>
              <option value="premium">Premium, from $7 a month</option>
            </select>
          </>
        )}
        <button type="submit" disabled={state === 'sending'}>
          {state === 'sending' ? 'Joining…' : buttonLabel || 'Join'}
        </button>
      </div>

      {/* Hidden from people; bots tend to fill it in. */}
      <div className="hp" aria-hidden="true">
        <label htmlFor={`${id}-website`}>Leave this empty</label>
        <input
          id={`${id}-website`}
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <p className="form-note">
        {plan === 'premium'
          ? premiumNote || 'Premium is $7/month or $47/year when it opens. No payment today.'
          : 'Free, always. Arrives at 5 AM your time. We never sell or share your email.'}{' '}
        By joining, you agree to our <a className="linklike" href="/terms">Terms</a> and{' '}
        <a className="linklike" href="/privacy">Privacy Policy</a>.
      </p>

      {suggestion && (
        <p className="form-suggest" role="status">
          Did you mean{' '}
          <button
            type="button"
            className="linklike"
            onClick={() => {
              setEmail(suggestion);
              setSuggestion(null);
              setState('idle');
              setMessage('');
            }}
          >
            {suggestion}
          </button>
          ?
        </p>
      )}

      {state === 'error' && (
        <p className="form-error" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}

// The reader's IANA time zone (e.g. "America/New_York"), so the study arrives at 5 AM their time.
function browserTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}
