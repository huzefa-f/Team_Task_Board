export type User = {
  id: number;
  email: string;
  name: string;
};

export type Project = {
  id: number;
  name: string;
  owner_id: number;
  created_at: string;
};

export type ProjectMember = {
  id: number;
  user_id: number;
  role: "admin" | "member";
  user: User;
};

export type Task = {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  due_date: string | null;
  assignee_id: number | null;
  assignee: User | null;
  created_by: number;
  created_at: string;
  updated_at: string;
};

export type ActivityLogEntry = {
  id: number;
  actor_name: string;
  task_title: string | null;
  action: "task_created" | "task_assigned" | "status_changed" | "task_edited" | "member_invited";
  detail: string | null;
  created_at: string;
};