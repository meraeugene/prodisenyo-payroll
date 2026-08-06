export interface ProjectProgressUpdateRecord {
  id: string;
  project_id: string;
  submitted_by: string;
  overall_percent: number;
  completed_work_summary: string;
  remarks: string | null;
  created_at: string;
}

export interface CreateProjectProgressUpdateInput {
  projectId: string;
  overallPercent: number;
  completedWorkSummary: string;
  remarks?: string;
}
