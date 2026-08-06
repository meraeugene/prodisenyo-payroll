import type { ProjectDocumentRecord } from "@/features/project-documents/types";
import type { ProjectProgressUpdateRecord } from "@/features/projects/progressUpdateTypes";
import type { ProjectActivityEvent, ProjectActivityType } from "../types";

type ProgressSubmission = { id: string; activity_count: number; submitted_at: string };
type MaterialRequest = { id: string; material_name: string; status: string; created_at: string };

export function buildProjectActivityLog(input: {
  engineerName: string;
  progressUpdates: ProjectProgressUpdateRecord[];
  progressSubmissions: ProgressSubmission[];
  materialRequests: MaterialRequest[];
  documents: ProjectDocumentRecord[];
}): ProjectActivityEvent[] {
  const events: ProjectActivityEvent[] = [
    ...input.progressUpdates.map((update) => ({
      id: `progress-${update.id}`,
      type: "progress-update" as const,
      actor: input.engineerName,
      title: `Progress updated to ${Number(update.overall_percent)}%`,
      description: update.completed_work_summary,
      createdAt: update.created_at,
    })),
    ...input.progressSubmissions.map((submission) => ({
      id: `activities-${submission.id}`,
      type: "activity-submission" as const,
      actor: input.engineerName,
      title: "Activities submitted",
      description: `${submission.activity_count} weighted ${submission.activity_count === 1 ? "activity was" : "activities were"} submitted to the CEO.`,
      createdAt: submission.submitted_at,
    })),
    ...input.materialRequests.map((request) => ({
      id: `material-${request.id}`,
      type: "material-request" as const,
      actor: input.engineerName,
      title: "Material request submitted",
      description: `${request.material_name} was requested for the project.`,
      createdAt: request.created_at,
    })),
    ...input.documents.map((document) => ({
      id: `document-${document.id}`,
      type: "document-upload" as const,
      actor: document.uploader_name,
      title: "Document uploaded",
      description: `${document.file_name} was added to ${document.category}.`,
      createdAt: document.created_at,
    })),
  ];

  return events
    .filter((event) => Number.isFinite(Date.parse(event.createdAt)))
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

export function countProjectActivityTypes(events: ProjectActivityEvent[]) {
  return events.reduce<Record<ProjectActivityType, number>>(
    (counts, event) => ({ ...counts, [event.type]: counts[event.type] + 1 }),
    { "progress-update": 0, "activity-submission": 0, "material-request": 0, "document-upload": 0 },
  );
}

