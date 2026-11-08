// "Did you mean gmail.com?" — catches common domain typos before they cost a signup.
// Safe to use in the browser (no big lists here).

const COMMON = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'live.com',
  'msn.com', 'me.com', 'mac.com', 'comcast.net', 'att.net', 'verizon.net', 'sbcglobal.net',
  'cox.net', 'charter.net', 'ymail.com', 'rocketmail.com', 'proton.me', 'protonmail.com',
];

function distance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

export function suggestEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  const at = email.lastIndexOf('@');
  if (at < 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!domain || COMMON.includes(domain)) return null;
  let best: string | null = null;
  let bestScore = Infinity;
  for (const c of COMMON) {
    const d = distance(domain, c);
    if (d < bestScore) {
      bestScore = d;
      best = c;
    }
  }
  return best && bestScore > 0 && bestScore <= 2 ? `${local}@${best}` : null;
}
