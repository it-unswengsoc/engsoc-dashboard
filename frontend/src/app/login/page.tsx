'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { login } from '@/services/auth-api';
import { apiUrl } from '@/services/api-config';

/* The backend's OAuth callback is a full-page redirect, not a fetch — it
   comes back here as ?token=... on success or ?error=... on failure, since
   there's no JSON response to await from a browser navigation. */
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  domain_not_allowed: 'Only @unswengsoc.com accounts can sign in with Google.',
  google_auth_failed: 'Google sign-in failed. Please try again.',
};

// TODO: point at the real IT contact once there is one.
const IT_CONTACT_HREF = '#';

const inputStyles =
  'w-full rounded-lg border border-transparent bg-gray-100 px-3 py-2 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B1C9DC]';

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
  const [showEmailLogin, setShowEmailLogin] = useState(false);

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
    <main className="flex min-h-screen">
      <aside className="hidden flex-1 bg-[#B1C9DC] md:block" />

      <section className="flex flex-1 flex-col bg-gray-50 px-8 py-8 md:px-12">
        <div className="flex items-center gap-2.5">
          <Image src="/engsoc-logo.png" alt="" width={44} height={44} className="shrink-0 rounded-md" />
          <div className="text-sm font-bold uppercase leading-tight tracking-wide">
            <div className="text-[#AD1C2B]">UNSW</div>
            <div className="text-[#01183A]">Engineering Society</div>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-sm">
            <h1 className="text-4xl font-bold text-gray-900">Sign in</h1>
            <p className="mt-3 text-sm text-gray-500">
              Login using your <span className="font-bold text-gray-700">@unswengsoc</span>{' '}
              account
            </p>

            {error && (
              <p
                role="alert"
                className="mt-6 rounded-lg bg-[#F1C4C9]/50 px-3 py-2 text-sm font-medium text-[#8B2E38]"
              >
                {error}
              </p>
            )}

            <a
              href={apiUrl('/auth/google')}
              className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl border border-gray-200 bg-white py-3 text-sm font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md active:scale-[0.98]"
            >
              <GoogleIcon />
              Sign in with Google
            </a>

            {showEmailLogin ? (
              <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Email
                  </span>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputStyles}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Password
                  </span>
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputStyles}
                  />
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 rounded-xl bg-[#B1C9DC] py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#9db8cd] hover:shadow-md active:scale-[0.98] disabled:opacity-60"
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowEmailLogin(true)}
                className="mt-3 w-full text-center text-xs text-gray-400 transition-colors hover:text-gray-600"
              >
                Sign in with email instead
              </button>
            )}

            <p className="mt-6 text-center text-sm text-gray-500">
              Trouble accessing?{' '}
              <a href={IT_CONTACT_HREF} className="font-bold text-[#AD1C2B] hover:underline">
                Contact IT
              </a>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.09-1.8 2.73v2.27h2.91c1.7-1.57 2.69-3.87 2.69-6.64z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.27c-.81.54-1.84.86-3.05.86-2.35 0-4.34-1.58-5.05-3.71H.99v2.33A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.99A9 9 0 0 0 0 9c0 1.45.35 2.83.99 4.03l2.96-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.99 4.97l2.96 2.33C4.66 5.16 6.65 3.58 9 3.58z" />
    </svg>
  );
}
