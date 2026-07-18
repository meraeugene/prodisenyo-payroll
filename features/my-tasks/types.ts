export type TaskStatus = "todo" | "in_progress" | "completed" | "delayed";
export type TaskPriority = "low" | "medium" | "high";

export interface TaskRecord {
  id: string;
  title: string;
  description: string;
  projectName: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number; // percentage completed
  notes?: string;
}
