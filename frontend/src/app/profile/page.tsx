'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProfile } from '@/services/auth-api';
import type { Profile } from '@/types/auth';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem('token');

    if (!token) {
      router.push('/login');
      return;
    }

    getProfile(token)
      .then(setProfile)
      .catch((err) => {
        if (err.message === 'Unauthorized') {
          sessionStorage.removeItem('token');
          router.push('/login');
        } else {
          setError('Failed to load profile');
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  function handleLogout() {
    sessionStorage.removeItem('token');
    router.push('/login');
  }

  if (loading) return <p style={styles.center}>Loading...</p>;
  if (error) return <p style={{ ...styles.center, color: '#dc2626' }}>{error}</p>;
  if (!profile) return null;

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Profile</h1>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            Logout
          </button>
        </div>

        <div style={styles.field}>
          <span style={styles.label}>Name</span>
          <span>{profile.firstName} {profile.lastName}</span>
        </div>
        <div style={styles.field}>
          <span style={styles.label}>Email</span>
          <span>{profile.email}</span>
        </div>
        <div style={styles.field}>
          <span style={styles.label}>Role</span>
          <span style={styles.badge}>{profile.role}</span>
        </div>
        <div style={styles.field}>
          <span style={styles.label}>Member since</span>
          <span>{new Date(profile.createdAt).toLocaleDateString()}</span>
        </div>
        <div style={styles.field}>
          <span style={styles.label}>User ID</span>
          <span style={styles.muted}>#{profile.id}</span>
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    fontFamily: 'sans-serif',
  },
  center: {
    textAlign: 'center',
    marginTop: '4rem',
    fontFamily: 'sans-serif',
  },
  card: {
    backgroundColor: '#fff',
    padding: '2.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '420px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.75rem',
  },
  title: {
    margin: 0,
    fontSize: '1.75rem',
    color: '#111',
  },
  logoutBtn: {
    padding: '0.4rem 0.9rem',
    backgroundColor: 'transparent',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#555',
  },
  field: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 0',
    borderBottom: '1px solid #f0f0f0',
    fontSize: '0.95rem',
  },
  label: {
    fontWeight: 600,
    color: '#555',
  },
  badge: {
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    padding: '0.2rem 0.6rem',
    borderRadius: '999px',
    fontSize: '0.8rem',
    fontWeight: 600,
    textTransform: 'capitalize',
  },
  muted: {
    color: '#999',
  },
};
