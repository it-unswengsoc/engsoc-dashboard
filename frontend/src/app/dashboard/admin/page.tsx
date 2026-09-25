import AdminView from '@/components/admin/AdminView';

/* Client-side only: needs the JWT held in sessionStorage to check the
   signed-in member's own role and to call the admin-only endpoints — a
   Server Component can't reach that. Same pattern as DocumentsView. */
export default function AdminPage() {
  return <AdminView />;
}
