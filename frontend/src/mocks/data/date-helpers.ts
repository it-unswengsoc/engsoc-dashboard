/* Dates are stored as ISO strings so the display bits (month chip, "3 days"
   badge, etc.) can be derived instead of going stale in here.

   They're generated relative to today so the mock never rots — hardcoded dates
   would drift into the past and make every task read as DUE. Swap `at()` for
   real ISO strings once this comes from the API. */
export function at(daysFromToday: number, time: string): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${time}`;
}
