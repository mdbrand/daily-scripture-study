import Link from 'next/link';
import LegalShell from '../LegalShell';
import { SignInForm } from '../partners/PartnerForms';
import { getSessionEmail, isAdmin } from '@/lib/session';

export const ADMIN_TABS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/subscribers', label: 'Subscribers' },
  { href: '/admin/studies', label: 'Daily studies' },
  { href: '/admin/reflections', label: 'Premium replies' },
  { href: '/admin/lamplighters', label: 'Lamplighters' },
  { href: '/admin/partners', label: 'Partners' },
] as const;

// Returns the signed-in admin's email, or null (the page then renders <AdminSignIn />).
export async function adminEmail() {
  const email = await getSessionEmail();
  return isAdmin(email) ? email : null;
}

export function AdminSignIn({ next = '/admin' }: { next?: string }) {
  return (
    <LegalShell title="Morning Lamp admin">
      <p>Sign in with an admin email address. We’ll send you a one-time link.</p>
      <SignInForm next={next} />
    </LegalShell>
  );
}

export default function AdminShell({
  title,
  active,
  email,
  children,
}: {
  title: string;
  active: (typeof ADMIN_TABS)[number]['href'];
  email: string;
  children: React.ReactNode;
}) {
  return (
    <LegalShell
      title={title}
      intro={
        <nav className="admin-nav" aria-label="Admin">
          {ADMIN_TABS.map((t) => (
            <Link key={t.href} href={t.href} aria-current={t.href === active ? 'page' : undefined}>
              {t.label}
            </Link>
          ))}
          <form action="/api/auth/logout" method="post" className="admin-who">
            <span>{email}</span>
            <button type="submit" className="link-button">Sign out</button>
          </form>
        </nav>
      }
    >
      {children}
    </LegalShell>
  );
}
