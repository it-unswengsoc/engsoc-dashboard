'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';

export default function Home() {
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setMessage(data.message);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch from backend:', err);
        setMessage('Backend not connected');
        setLoading(false);
      });
  }, []);

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1>EngSoc Dashboard</h1>
        <p className={styles.status}>
          Backend Status: {loading ? 'Checking...' : message}
        </p>
        <p className={styles.description}>
          Welcome to the Engineering Society Dashboard
        </p>
      </div>
    </main>
  );
}
