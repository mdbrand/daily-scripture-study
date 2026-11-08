'use client';

import { useState } from 'react';
import SignupForm from './SignupForm';
import { PLANS, YEARLY_SAVINGS_CENTS, YEARLY_SAVINGS_PCT } from '@/lib/plans';

type Billing = 'yearly' | 'monthly';

// Public Premium pricing: $7/month or $47/year with the savings shown.
// Until Premium checkout opens, choosing a plan joins the early-access list for that plan.
export default function PremiumPlans() {
  const [billing, setBilling] = useState<Billing>('yearly');

  return (
    <div className="plans" id="pricing">
      <div className="plans-head">
        <p className="plans-kicker">Premium pricing</p>
        <h3>Choose how you’d like to pay.</h3>
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
    </div>
  );
}
