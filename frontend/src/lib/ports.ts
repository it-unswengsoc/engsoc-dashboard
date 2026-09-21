/* Values must match the port_type enum in database/create-tables.sql exactly:
   Postgres enums are case-sensitive, so 'IT' and 'publication' are not
   interchangeable with 'it' and 'publications'. Labels are display copy — the
   port answers to "Publications" even though the enum spells it singular. */
export const PORT_OPTIONS = [
  { value: 'careers', label: 'Careers' },
  { value: 'sponsorships', label: 'Sponsorships' },
  { value: 'IT', label: 'IT' },
  { value: 'publication', label: 'Publications' },
  { value: 'cabinet', label: 'Cabinet' },
  { value: 'socials', label: 'Socials' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'outreach', label: 'Outreach' },
  { value: 'programs', label: 'Programs' },
  { value: 'HR', label: 'HR' },
];

export function portLabel(value: string): string {
  return PORT_OPTIONS.find((port) => port.value === value)?.label ?? value;
}
