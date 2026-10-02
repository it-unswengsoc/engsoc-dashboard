'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, MapPin } from 'lucide-react';
import { getPlace, searchPlaces, type PlaceSuggestion } from '@/services/places-api';

export interface LocationValue {
  text: string;
  /* Set only when the text came from picking a suggestion — typing over it
     clears them, so a map never points somewhere the text doesn't say. */
  lat: number | null;
  lng: number | null;
}

interface LocationFieldProps {
  label: string;
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  inputClassName: string;
  labelClassName: string;
  disabled?: boolean;
  maxLength?: number;
}

/* "UNSW Roundhouse, Anzac Parade, Kensington NSW 2033, Australia" — or
   just the name, if that would run past the field's limit. */
function placeText(name: string, address: string, maxLength: number): string {
  const full = !address || address.startsWith(name) ? address || name : `${name}, ${address}`;
  if (full.length <= maxLength) return full;
  return name.length <= maxLength ? name : name.slice(0, maxLength);
}

function newSession(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/* A location box that suggests real places as you type (Google Places,
   through the backend). Free text still works — picking a suggestion just
   adds the coordinates that put the event on a map. */
export default function LocationField({
  label,
  value,
  onChange,
  inputClassName,
  labelClassName,
  disabled = false,
  maxLength = 100,
}: LocationFieldProps) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [picking, setPicking] = useState(false);
  /* Once the backend says search is unavailable (no key, API off), stop
     asking for the rest of this form. */
  const [unavailable, setUnavailable] = useState(false);
  const [focused, setFocused] = useState(false);
  const session = useRef(newSession());
  const containerRef = useRef<HTMLDivElement>(null);
  const latestQuery = useRef('');

  const query = value.text.trim();
  const pinned = value.lat !== null && value.lng !== null;

  useEffect(() => {
    if (!focused || pinned || unavailable || query.length < 2) {
      setSuggestions([]);
      return;
    }
    const token = sessionStorage.getItem('token');
    if (!token) return;
    latestQuery.current = query;
    const timer = setTimeout(() => {
      searchPlaces(token, query, session.current)
        .then((found) => {
          if (latestQuery.current !== query) return;
          setSuggestions(found);
          setActive(0);
          setOpen(true);
        })
        .catch(() => setUnavailable(true));
    }, 250);
    return () => clearTimeout(timer);
  }, [query, focused, pinned, unavailable]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function pick(suggestion: PlaceSuggestion) {
    const token = sessionStorage.getItem('token');
    if (!token) return;
    setOpen(false);
    setPicking(true);
    try {
      const place = await getPlace(token, suggestion.placeId, session.current);
      onChange({ text: placeText(suggestion.name, place.address, maxLength), lat: place.lat, lng: place.lng });
    } catch {
      // Keep what they picked as text, just without a map.
      onChange({ text: placeText(suggestion.name, suggestion.detail, maxLength), lat: null, lng: null });
    } finally {
      setPicking(false);
      session.current = newSession(); // a pick ends Google's billing session
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(suggestions[active]);
    } else if (e.key === 'Escape') {
      // Close the list, not the whole dialog.
      e.stopPropagation();
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1.5">
      <label className="flex flex-col gap-1.5">
        <span className={labelClassName}>{label}</span>
        <div className="relative">
          <MapPin
            className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
              pinned ? 'text-[#3D6C94]' : 'text-gray-400'
            }`}
          />
          <input
            type="text"
            value={value.text}
            maxLength={maxLength}
            onChange={(e) => onChange({ text: e.target.value, lat: null, lng: null })}
            onFocus={() => {
              setFocused(true);
              if (suggestions.length > 0) setOpen(true);
            }}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={unavailable ? 'Where is it?' : 'Search for a place, or type an address'}
            role="combobox"
            aria-expanded={open && suggestions.length > 0}
            aria-autocomplete="list"
            autoComplete="off"
            className={`${inputClassName} pl-9`}
            disabled={disabled}
          />
        </div>
      </label>

      {picking ? (
        <span className="font-mono text-[10px] text-gray-400">Finding it on the map…</span>
      ) : pinned ? (
        <span className="flex items-center gap-1 text-[11px] font-semibold text-[#3D6C94]">
          <Check className="h-3 w-3" />
          Pinned on the map
        </span>
      ) : null}

      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
        >
          {suggestions.map((s, i) => (
            <li key={s.placeId} role="option" aria-selected={i === active}>
              <button
                type="button"
                // mousedown, so the pick lands before the input's blur
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors ${
                  i === active ? 'bg-gray-50' : ''
                }`}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-gray-900">{s.name}</span>
                  {s.detail && <span className="block truncate text-xs text-gray-500">{s.detail}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
