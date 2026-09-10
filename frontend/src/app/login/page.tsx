'use client';

import { Suspense, useEffect, useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { login } from '@/services/auth-api';

/* The backend's OAuth callback is a full-page redirect, not a fetch — it
   comes back here as ?token=... on success or ?error=... on failure, since
   there's no JSON response to await from a browser navigation. */
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  domain_not_allowed: 'Only @unswengsoc.com accounts can sign in with Google.',
  google_auth_failed: 'Google sign-in failed. Please try again.',
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    const oauthError = searchParams.get('error');

    if (token) {
      sessionStorage.setItem('token', token);
      router.push('/');
      return;
    }

    if (oauthError) {
      setError(OAUTH_ERROR_MESSAGES[oauthError] ?? 'Sign-in failed. Please try again.');
    }
  }, [searchParams, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(email, password);
      sessionStorage.setItem('token', data.token);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect to server');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>EngSoc Dashboard</h1>
        <h2 style={styles.subtitle}>Sign in</h2>

        {/* Plain relative link, not apiUrl() — this is only ever clicked in
            a browser, and apiUrl() resolves an absolute URL for server-side
            fetches, which would mismatch between the SSR and hydration
            passes for a client link like this. */}
        <a href="/api/backend/auth/google" style={styles.googleButton}>
          <GoogleIcon />
          Sign in with Google
        </a>

        <div style={styles.divider}>
          <span style={styles.dividerLine} />
          <span style={styles.dividerText}>or</span>
          <span style={styles.dividerLine} />
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@engsoc.com"
            required
            style={styles.input}
          />

          <label style={styles.label}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            style={styles.input}
          />

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.09-1.8 2.73v2.27h2.91c1.7-1.57 2.69-3.87 2.69-6.64z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.27c-.81.54-1.84.86-3.05.86-2.35 0-4.34-1.58-5.05-3.71H.99v2.33A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.99A9 9 0 0 0 0 9c0 1.45.35 2.83.99 4.03l2.96-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.99 4.97l2.96 2.33C4.66 5.16 6.65 3.58 9 3.58z" />
    </svg>
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
  card: {
    backgroundColor: '#fff',
    padding: '2.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px',
  },
  title: {
    margin: '0 0 0.25rem',
    fontSize: '1.25rem',
    color: '#555',
  },
  subtitle: {
    margin: '0 0 1.5rem',
    fontSize: '1.75rem',
    color: '#111',
  },
  googleButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.625rem',
    padding: '0.75rem',
    backgroundColor: '#fff',
    color: '#3c4043',
    border: '1px solid #dadce0',
    borderRadius: '4px',
    fontSize: '0.9375rem',
    fontWeight: 600,
    textDecoration: 'none',
    cursor: 'pointer',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    margin: '1.25rem 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    fontSize: '0.8125rem',
    color: '#9ca3af',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#333',
    marginTop: '0.5rem',
  },
  input: {
    padding: '0.625rem 0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    outline: 'none',
  },
  button: {
    marginTop: '1.25rem',
    padding: '0.75rem',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: {
    color: '#dc2626',
    fontSize: '0.875rem',
    margin: '0.25rem 0 0',
  },
};
