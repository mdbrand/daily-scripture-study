import type { Metadata } from 'next';
import './style.css';
export const metadata: Metadata = { title: 'Daily Scripture Study', description: 'Go deeper into God’s Word. Every morning.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
