'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar, { MobileNav } from '@/components/Sidebar';
import Header from '@/components/Header';
import { ProfileProvider } from '@/lib/profile-context';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      router.replace('/login');
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) return null;

  return (
    <ProfileProvider>
      <div className="flex h-dvh">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <Header />
          {/* Extra bottom padding on a phone clears the bottom nav bar. */}
          <main className="flex-1 min-h-0 min-w-0 bg-gray-50 p-4 pb-24 md:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
      <MobileNav />
    </ProfileProvider>
  );
}
