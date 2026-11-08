// Founders lifetime offer: open (no cap). The live price comes from the database
// (dss_config.founders_price_cents) so it can change without a deploy.
export const FOUNDERS = {
  defaultCents: 3700,
  commissionRate: 0.3,
};

export type FounderStats = { sold: number; price_cents: number };

// Price label stored with each sale: 1 = the $37 founders price, 2 = any higher price.
export const tierFor = (cents: number): 1 | 2 => (cents <= 3700 ? 1 : 2);

export const dollars = (cents: number) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
