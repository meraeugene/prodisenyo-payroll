export type ProjectStatus = "planning" | "active" | "completed" | "on_hold";

export interface ProjectRecord {
  id: string;
  name: string;
  location: string;
  client: string;
  status: ProjectStatus;
  budget: number;
  spent: number;
  progress: number; // percentage
  startDate: string;
  endDate: string;
  manager: string;
  engineer: string;
  tasksCount: number;
  completedTasksCount: number;
  materialsCount: number;
  description: string;
}
