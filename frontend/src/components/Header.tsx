'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getProfile } from '@/services/auth-api';
import { search, type DriveSearchResultData } from '@/services/documents';
import NewItemDialog from '@/components/dialogs/NewItemDialog';

const SEARCH_DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 2;

function SearchResultRow({ result, onNavigate }: { result: DriveSearchResultData; onNavigate: () => void }) {
  const content = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-gray-100 font-mono text-[8px] font-bold text-gray-600">
        {result.type === 'folder' ? 'DIR' : result.extensionLabel || 'FILE'}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-gray-900">{result.name}</span>
        <span className="block truncate font-mono text-[10px] text-gray-400">
          {result.driveName} · {result.modifiedLabel}
        </span>
      </span>
    </>
  );

  // A real <a target="_blank">, not a button calling window.open() on
  // click — see the same reasoning on the documents page's own "Open file".
  if (result.webViewLink) {
    return (
      <a
        href={result.webViewLink}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
        className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50"
      >
        {content}
      </a>
    );
  }

  return <div className="flex items-center gap-3 px-4 py-2.5 opacity-60">{content}</div>;
}

export default function Header() {
  const [initials, setInitials] = useState('');
  const [newDialogOpen, setNewDialogOpen] = useState(false);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DriveSearchResultData[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [resultsOpen, setResultsOpen] = useState(false);

  const searchBoxRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // A global search across every Shared Drive (and My Drive) the member can
  // see — same access boundary as the documents page's column browser, just
  // not scoped to wherever's currently open there. Debounced so every
  // keystroke doesn't fire its own request.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setSearchError('');
      setSearching(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const token = sessionStorage.getItem('token');
      if (!token) return;

      setSearching(true);
      setSearchError('');
      search(token, trimmed)
        .then(setResults)
        .catch((err) => setSearchError(err instanceof Error ? err.message : 'Search failed'))
        .finally(() => setSearching(false));
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setResultsOpen(false);
      }
    }
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showDropdown = resultsOpen && query.trim().length >= MIN_QUERY_LENGTH;

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-4 px-8 py-2 bg-white border-b border-gray-200">
      <div ref={searchBoxRef} className="relative flex-1 max-w-md ml-6">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setResultsOpen(true);
          }}
          onFocus={() => setResultsOpen(true)}
          placeholder="Search the EngSoc Drive..."
          className="pl-9 pr-4 py-2 text-sm bg-gray-100 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white w-full transition-colors"
        />
        <svg
          className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>

        {showDropdown && (
          <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-96 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
            {searching ? (
              <p className="px-4 py-6 text-center font-mono text-xs text-gray-400">Searching…</p>
            ) : searchError ? (
              <p className="px-4 py-6 text-center font-mono text-xs text-[#8B2E38]">{searchError}</p>
            ) : results.length === 0 ? (
              <p className="px-4 py-6 text-center font-mono text-xs text-gray-400">No files found.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {results.map((result) => (
                  <SearchResultRow key={result.id} result={result} onNavigate={() => setResultsOpen(false)} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* New button */}
        <button
          onClick={() => setNewDialogOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-[#B1C9DC] px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#9db8cd] hover:shadow-md active:scale-[0.98]"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          New
        </button>

        {/* Notifications — TODO: wire up to notifications API, add red dot for unread */}
        <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>

        {/* User avatar — links to profile page */}
        <Link
          href="/dashboard/profile"
          className="w-9 h-9 rounded-full bg-[#B1C9DC] text-white text-sm font-bold flex items-center justify-center hover:bg-[#9db8cd] transition-colors"
        >
          {initials || '?'}
        </Link>
      </div>

      <NewItemDialog open={newDialogOpen} onClose={() => setNewDialogOpen(false)} />
    </header>
  );
}
