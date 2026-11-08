import type { Metadata } from 'next';
import { EB_Garamond, Inter } from 'next/font/google';
import './style.css';

const garamond = EB_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-book',
  display: 'swap',
});
const inter = Inter({ subsets: ['latin'], variable: '--font-ui', display: 'swap' });

export const metadata: Metadata = {
  title: 'Morning Lamp: a daily Bible study by email',
  description:
    'A few quiet minutes with God’s Word, every morning. One Bible passage, the story behind it, in plain, simple language.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${garamond.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
