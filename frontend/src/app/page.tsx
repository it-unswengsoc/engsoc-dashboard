'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import NavBar from '@/components/Navbar';

export default function Home() {
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
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Welcome to EngSoc Dashboard</h1>
    </main>
  );
}
