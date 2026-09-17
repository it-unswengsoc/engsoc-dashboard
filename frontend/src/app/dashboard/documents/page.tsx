import DocumentsView from '@/components/documents/DocumentsView';

/* No server-side fetch anymore: Drive now reads as the signed-in member's
   own Google account, which needs the JWT held in the browser's
   sessionStorage — a Server Component can't reach that. DocumentsView
   fetches everything itself client-side (see CalendarShell for the same
   pattern on the calendar page). */
export default function DocumentsPage() {
  return <DocumentsView />;
}
