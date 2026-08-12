'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/', label: 'Summary', icon: 'M3 12l9-8 9 8v8a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z' },
  { href: '/review', label: 'Review', icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11' },
];

function useActive() {
  const pathname = usePathname();
  return (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
}

/**
 * Desktop: segmented control that sits directly on the page background and joins the
 * content below it, so the page reads as the body of the selected tab.
 * Mobile: fixed bottom bar, thumb-reachable — rendered by <BottomNav/> in the same file.
 */
export default function NavTabs() {
  const isActive = useActive();
  return (
    <div className="hidden md:flex gap-1.5 mb-5 p-1 rounded-full bg-black/[0.055] w-fit">
      {ITEMS.map((it) => {
        const active = isActive(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`px-6 py-2 rounded-full text-small uppercase tracking-[0.1em] font-bold transition-colors ${
              active ? 'bg-credink text-white shadow-sm' : 'text-credmuted hover:text-credink'
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}

export function BottomNav() {
  const isActive = useActive();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-credsurface border-t border-credline pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        {ITEMS.map((it) => {
          const active = isActive(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className="flex-1 flex flex-col items-center gap-1.5 py-2"
            >
              <span
                className={`flex items-center justify-center rounded-full transition-colors ${
                  active ? 'bg-credink text-white px-5 py-1.5' : 'text-credmuted px-5 py-1.5'
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={it.icon} />
                </svg>
              </span>
              <span className={`text-micro uppercase tracking-[0.08em] ${active ? 'font-bold text-credink' : 'font-semibold text-credmuted'}`}>
                {it.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
