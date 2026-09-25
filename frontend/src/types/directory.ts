/* The member directory — any signed-in user can read this (contrast with
   the admin-only user *management* list in types/admin.ts). Backs the task
   assignee picker and @mention resolution. */
export interface DirectoryUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  port: string | null;
}
