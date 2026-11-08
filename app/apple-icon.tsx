import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// Home-screen icon: the Morning Lamp crest mark (sun over an open book) on chapel navy.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#172b38' }}>
        <svg width="180" height="180" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="51" fill="none" stroke="#d9c08f" strokeWidth="3" />
          <g fill="none" stroke="#d9c08f" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M42,58 a18,18 0 0,1 36,0" />
            <line x1="60" y1="27" x2="60" y2="33" />
            <line x1="40" y1="35" x2="44" y2="40" />
            <line x1="80" y1="35" x2="76" y2="40" />
            <path d="M60,66 C52,61 42,60 32,62 L32,84 C42,82 52,83 60,88 C68,83 78,82 88,84 L88,62 C78,60 68,61 60,66 Z" />
            <line x1="60" y1="66" x2="60" y2="88" />
          </g>
        </svg>
      </div>
    ),
    size,
  );
}
