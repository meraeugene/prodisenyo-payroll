export type ProjectActivityType =
  | "progress-update"
  | "activity-submission"
  | "material-request"
  | "document-upload";

export interface ProjectActivityEvent {
  id: string;
  type: ProjectActivityType;
  actor: string;
  title: string;
  description: string;
  createdAt: string;
}

