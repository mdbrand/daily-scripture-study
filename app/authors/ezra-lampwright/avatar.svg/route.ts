// The avatar as a standalone SVG file (used as the author image in schema).
export const dynamic = 'force-static';

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#172b38"/><circle cx="32" cy="32" r="29" fill="none" stroke="#a8834a" stroke-width="1.2"/><path d="M24 17c3 3.4 4.2 6 3.2 8.4-.7 1.7-2.4 2.6-4 2.2-1.9-.5-2.9-2.4-2.3-4.4.5-1.9 2-3.3 3.1-6.2z" fill="#d9c08f"/><path d="M12 37c0-3.3 5.4-6 12-6s12 2.7 12 6c0 2.4-2.8 4.4-6.8 5.4l1.8 4.6h-14l1.8-4.6C14.8 41.4 12 39.4 12 37z" fill="#a8834a"/><path d="M33 34.5c4 0 7-1.4 9-3.5" fill="none" stroke="#a8834a" stroke-width="2" stroke-linecap="round"/><path d="M52 12c-7 3-12.4 10.6-14.6 19.8l-1.4 6.2 3.4-5.2C46.2 30.5 51 22.5 52 12z" fill="#ede6d8"/><path d="M50 16 36.4 38" stroke="#172b38" stroke-width="0.9"/><path d="M14 51h36" stroke="#a8834a" stroke-width="1.4" stroke-linecap="round"/></svg>`;

export function GET() {
  return new Response(SVG, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' } });
}
