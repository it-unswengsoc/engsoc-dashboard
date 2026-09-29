/* A page's last-loaded data, kept so coming back to the page (from another
   page, or after a reload) can show it straight away while a fresh copy
   loads behind it. Held in memory for client-side navigation and in
   sessionStorage for reloads, and tied to the token it was loaded with, so a
   different sign-in in the same tab never sees someone else's. Only for
   small, JSON-safe data. */

const memory = new Map<string, { token: string; data: unknown }>();

export function readSessionCache<T>(key: string, token: string): T | null {
  const inMemory = memory.get(key);
  if (inMemory?.token === token) return inMemory.data as T;
  try {
    const stored = sessionStorage.getItem(key);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as { token: string; data: T };
    if (parsed.token !== token) return null;
    memory.set(key, parsed);
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeSessionCache<T>(key: string, token: string, data: T): void {
  const entry = { token, data };
  memory.set(key, entry);
  try {
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Storage full or unavailable — the in-memory copy still covers navigation.
  }
}
