// Founders lifetime offer: tiered, capped.
export const FOUNDERS = {
  tier1Limit: 250,
  cap: 1000,
  tier1Cents: 3700,
  tier2Cents: 6700,
  commissionRate: 0.3,
};

export type FounderStats = { sold: number; tier1_limit: number; cap: number };

export function currentTier(sold: number): { tier: 1 | 2; cents: number; leftAtPrice: number; soldOut: boolean } {
  if (sold >= FOUNDERS.cap) return { tier: 2, cents: FOUNDERS.tier2Cents, leftAtPrice: 0, soldOut: true };
  if (sold < FOUNDERS.tier1Limit)
    return { tier: 1, cents: FOUNDERS.tier1Cents, leftAtPrice: FOUNDERS.tier1Limit - sold, soldOut: false };
  return { tier: 2, cents: FOUNDERS.tier2Cents, leftAtPrice: FOUNDERS.cap - sold, soldOut: false };
}

export const dollars = (cents: number) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
