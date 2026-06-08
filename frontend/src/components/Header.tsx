'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/services/auth';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/calendar': 'Calendar',
  '/documents': 'Documents',
  '/settings': 'Settings',
};

export default function Header() {
  const pathname = usePathname();
  const [initials, setInitials] = useState('');

  const title = pageTitles[pathname] ?? 'Dashboard';

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) return;

    getProfile(token)
      .then((profile) => {
        const first = profile.firstName?.[0] ?? '';
        const last = profile.lastName?.[0] ?? '';
        setInitials((first + last).toUpperCase());
      })
      .catch(() => {});
  }, []);

  return (
    <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-200">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Search bar — TODO: wire up to search API */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search..."
            className="pl-9 pr-4 py-2 text-sm bg-gray-100 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white w-56 transition-colors"
          />
          <svg
            className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Notifications — TODO: wire up to notifications API, add red dot for unread */}
        <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>

        {/* User avatar — links to profile page */}
        <Link
          href="/profile"
          className="w-9 h-9 rounded-md bg-blue-600 text-white text-sm font-bold flex items-center justify-center hover:bg-blue-700 transition-colors"
        >
          {initials || '?'}
        </Link>
      </div>
    </header>
  );
}
