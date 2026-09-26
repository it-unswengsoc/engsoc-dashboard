import type { TaskAttachment } from '@/services/tasks-api';

/* Keyed by task id — mirrors the real task_attachments table's task_id
   foreign key without needing a join in the mock. */
export const mockTaskAttachments: Record<number, TaskAttachment[]> = {};
