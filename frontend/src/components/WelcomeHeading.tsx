'use client';

import { useEffect, useState } from 'react';
import { useProfile } from '@/lib/profile-context';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function WelcomeHeading() {
  const firstName = useProfile().profile?.firstName ?? '';
  const [greeting, setGreeting] = useState('Welcome');

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  return (
    <h1 className="text-4xl font-bold text-gray-900">
      {greeting}{firstName ? `, ${firstName}` : ''}.
    </h1>
  );
}
