import { getDocumentsPageData } from '@/services/documents';
import DocumentsView from '@/components/documents/DocumentsView';

/* Fetches live Drive data server-side; the deployment's own URL doesn't
   exist yet at build time, so this can't be statically prerendered. */
export const dynamic = 'force-dynamic';

export default async function DocumentsPage() {
  const { folders, recentFiles } = await getDocumentsPageData();

  return <DocumentsView folders={folders} recentFiles={recentFiles} />;
}
