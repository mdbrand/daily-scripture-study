import type { Metadata } from 'next';
import { EB_Garamond, Inter } from 'next/font/google';
import './style.css';
import { GtmHead, GtmNoScript } from './Analytics';

const garamond = EB_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-book',
  display: 'swap',
});
const inter = Inter({ subsets: ['latin'], variable: '--font-ui', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL('https://morninglamp.study'),
  alternates: { canonical: '/' },
  title: 'Morning Lamp: a daily Bible study by email',
  description:
    'Every verse has a story. A free Bible study by email each morning: one passage, the history behind it, and a voice from 2,000 years of faith, in under three minutes.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${garamond.variable} ${inter.variable}`}>
      <body>
        <GtmNoScript />
        {children}
        <GtmHead />
      </body>
    </html>
  );
}
