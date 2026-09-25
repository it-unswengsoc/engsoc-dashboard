/* Values must match the user_role enum in database/create-tables.sql
   exactly: 'member', 'director', 'executive', 'admin'. */
export const ROLE_OPTIONS = [
  { value: 'member', label: 'Member' },
  { value: 'director', label: 'Director' },
  { value: 'executive', label: 'Executive' },
  { value: 'admin', label: 'Admin' },
];

export function roleLabel(value: string): string {
  return ROLE_OPTIONS.find((role) => role.value === value)?.label ?? value;
}
