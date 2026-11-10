import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './style.css';
import { GtmHead, GtmNoScript } from './Analytics';

// EB Garamond and Inter are self-hosted from app/fonts/ (the same woff2 files Google Fonts
// serves, SIL Open Font License, see app/fonts/OFL-*.txt). next/font/google downloaded them
// from Google during every build, and Google now and then answers with extension-less font
// URLs (fonts.gstatic.com/l/font?kit=...) that Next 15 cannot parse, which failed builds at
// random. Like Google's own CSS, each font is split into a latin file (preloaded) and a
// latin-ext file (fetched only when a page uses one of its characters, e.g. ā or ḥ).
// next/font needs literal option values, so the unicode ranges are written out in each call.
const garamond = localFont({
  src: [
    { path: './fonts/eb-garamond-latin.woff2', weight: '400 600', style: 'normal' },
    { path: './fonts/eb-garamond-italic-latin.woff2', weight: '400 600', style: 'italic' },
  ],
  declarations: [{ prop: 'unicode-range', value: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' }],
  display: 'swap',
  adjustFontFallback: 'Times New Roman',
});
const garamondExt = localFont({
  src: [
    { path: './fonts/eb-garamond-latin-ext.woff2', weight: '400 600', style: 'normal' },
    { path: './fonts/eb-garamond-italic-latin-ext.woff2', weight: '400 600', style: 'italic' },
  ],
  declarations: [{ prop: 'unicode-range', value: 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF' }],
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
});
const inter = localFont({
  src: './fonts/inter-latin.woff2',
  weight: '100 900',
  style: 'normal',
  declarations: [{ prop: 'unicode-range', value: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' }],
  display: 'swap',
});
const interExt = localFont({
  src: './fonts/inter-latin-ext.woff2',
  weight: '100 900',
  style: 'normal',
  declarations: [{ prop: 'unicode-range', value: 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF' }],
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
});

// The latin-ext family comes first: its unicode-range skips it for ordinary latin text, so
// those characters fall through to the latin family (and its metric-matched fallback).
const fontVariables = {
  '--font-book': `${garamondExt.style.fontFamily}, ${garamond.style.fontFamily}`,
  '--font-ui': `${interExt.style.fontFamily}, ${inter.style.fontFamily}`,
} as React.CSSProperties;

export const metadata: Metadata = {
  metadataBase: new URL('https://morninglamp.study'),
  alternates: { canonical: '/' },
  // Bing Webmaster Tools site verification.
  verification: { other: { 'msvalidate.01': '1062370FD5889BC16C5A53CFC7466776' } },
  title: 'Morning Lamp: a daily Bible study by email',
  description:
    'Every verse has a story. A free Bible study by email each morning: one passage, the history behind it, and a voice from 2,000 years of faith, in under three minutes.',
  // Link previews (iMessage, Facebook, LinkedIn, X). The image is app/opengraph-image.png, drawn from scripts/og-image.svg.
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Morning Lamp',
    title: 'Daily Relevant Bible Study...Literally',
    description: 'One passage, the world behind it, and a voice from 2,000 years of faith. Free, every morning.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Daily Relevant Bible Study...Literally',
    description: 'One passage, the world behind it, and a voice from 2,000 years of faith. Free, every morning.',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" style={fontVariables}>
      <body>
        <GtmNoScript />
        {children}
        <GtmHead />
      </body>
    </html>
  );
}
