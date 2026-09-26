import type { TaskAttachment } from '@/services/tasks-api';
import { mockTaskAttachments } from '@/mocks/data/task-attachments';

export async function getTaskAttachments(taskId: number): Promise<TaskAttachment[]> {
  return (mockTaskAttachments[taskId] ?? []).slice();
}

export async function addTaskAttachment(
  taskId: number,
  input: { driveFileId: string; name: string; webViewLink: string | null; mimeType: string | null }
): Promise<TaskAttachment> {
  const attachment: TaskAttachment = {
    id: Date.now(),
    ...input,
    createdAt: new Date().toISOString(),
  };
  mockTaskAttachments[taskId] = [...(mockTaskAttachments[taskId] ?? []), attachment];
  return attachment;
}

export async function deleteTaskAttachment(attachmentId: number): Promise<void> {
  for (const taskId of Object.keys(mockTaskAttachments)) {
    mockTaskAttachments[Number(taskId)] = mockTaskAttachments[Number(taskId)].filter((a) => a.id !== attachmentId);
  }
}
