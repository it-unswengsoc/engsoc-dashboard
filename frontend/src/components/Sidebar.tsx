'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const dashboardLinks = [
  { label: 'Home', href: '/' },
  { label: 'Calendar', href: '/calendar' },
  { label: 'Documents', href: '/documents' },
];

const accountLinks = [
  { label: 'Settings', href: '/settings' },
];


export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    sessionStorage.removeItem('token');
    router.push('/login');
  }

  return (
    <aside className="w-56 min-h-screen bg-[#B1C9DC] flex flex-col p-4 shrink-0">
      <div className="text-sm font-bold mb-4 text-slate-800">
        EngSoc Dashboard
      </div>

      <nav className="flex flex-col flex-1">
        <NavGroup heading="Dashboard" links={dashboardLinks} pathname={pathname} />
        <NavGroup heading="Account" links={accountLinks} pathname={pathname} />
      </nav>

      <button
        onClick={handleLogout}
        className="px-3 py-2 rounded-md text-sm text-slate-600 hover:text-slate-900 text-left transition-colors"
      >
        Logout
      </button>
    </aside>
  );
}


// Components for SideBar

function NavLink({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        active
          ? 'bg-[#8fafc5] text-slate-900'
          : 'text-slate-700 hover:bg-[#9ab8cb] hover:text-slate-900'
      }`}
    >
      {label}
    </Link>
  );
}

function NavGroup({ heading, links, pathname }: { heading: string; links: { label: string; href: string }[]; pathname: string }) {
  return (
    <div className="mb-4">
      <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500 p-2 border-b border-[#8fafc5]">
        {heading}
      </p>
      <div className="flex flex-col gap-1">
        {links.map(({ label, href }) => (
          <NavLink key={href} label={label} href={href} active={pathname === href} />
        ))}
      </div>
    </div>
  );
}