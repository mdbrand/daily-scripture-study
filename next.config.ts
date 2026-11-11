import type { NextConfig } from 'next';
import { withBotId } from 'botid/next/config';

// Short links that are easy to say from the front of a church or print in a bulletin.
const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/advent', destination: '/guides/advent-reading-plan', permanent: false },
      { source: '/2027', destination: '/guides/2027-bible-reading-plan', permanent: false },
    ];
  },
};

// BotID (Vercel's invisible bot protection) needs its proxy routes wired in here.
export default withBotId(nextConfig);
