// Public Premium prices. The yearly savings shown on the site are calculated from these.
export const PLANS = {
  monthly: { cents: 700, interval: 'month' as const },
  yearly: { cents: 4700, interval: 'year' as const },
};

export const YEARLY_SAVINGS_CENTS = PLANS.monthly.cents * 12 - PLANS.yearly.cents; // $84 - $47 = $37
export const YEARLY_SAVINGS_PCT = Math.round((YEARLY_SAVINGS_CENTS / (PLANS.monthly.cents * 12)) * 100); // 44
