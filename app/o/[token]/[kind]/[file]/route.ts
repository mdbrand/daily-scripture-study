import { after } from 'next/server';
import { classifyOpen, clientIp, recordEvent, validRef } from '@/lib/emailEvents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The 1x1 image at the bottom of each email. Loading it tells us the email was opened, and the
// request's user agent tells us whether a person's mail app or Apple's privacy relay did the loading.
const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

export async function GET(req: Request, { params }: { params: Promise<{ token: string; kind: string; file: string }> }) {
  const { token, kind, file } = await params;
  const ref = validRef(token, kind, file.replace(/\.gif$/i, ''));
  if (ref) {
    const ua = req.headers.get('user-agent');
    const source = classifyOpen(ua, clientIp(req.headers));
    after(() => recordEvent(ref, 'open', source, ua));
  }
  return new Response(GIF, {
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': String(GIF.length),
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'X-Robots-Tag': 'noindex',
    },
  });
}
