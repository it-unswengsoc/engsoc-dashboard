import { getDocumentsPageData } from '@/services/documents';
import DocumentsView from '@/components/documents/DocumentsView';

/* Fetches live Drive data server-side; the deployment's own URL doesn't
   exist yet at build time, so this can't be statically prerendered. */
export const dynamic = 'force-dynamic';

export default async function DocumentsPage() {
  try {
    const { folders, recentFiles } = await getDocumentsPageData();
    return <DocumentsView folders={folders} recentFiles={recentFiles} />;
  } catch (error) {
    // Most likely cause right now: GOOGLE_DRIVE_REFRESH_TOKEN isn't set on
    // the backend yet (the one-time admin drive-connect flow hasn't been
    // completed) — fail to an empty, working page instead of crashing the
    // whole route.
    console.error('Failed to load documents page data:', error);
    return <DocumentsView folders={[]} recentFiles={[]} />;
  }
}
