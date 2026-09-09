'use client';

import { useEffect, useState } from 'react';
import { getProfile } from '@/services/auth-api';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function WelcomeHeading() {
  const [firstName, setFirstName] = useState('');
  const [greeting, setGreeting] = useState('Welcome');

  useEffect(() => {
    setGreeting(getGreeting());

    const token = sessionStorage.getItem('token');
    if (!token) return;

    getProfile(token)
      .then((profile) => setFirstName(profile.firstName ?? ''))
      .catch(() => {});
  }, []);

  return (
    <h1 className="text-4xl font-bold text-gray-900">
      {greeting}{firstName ? `, ${firstName}` : ''}.
    </h1>
  );
}
