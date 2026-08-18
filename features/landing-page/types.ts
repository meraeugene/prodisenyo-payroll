export type LandingIconName =
  | "projects"
  | "estimate"
  | "procurement"
  | "payroll"
  | "progress"
  | "cost"
  | "ceo"
  | "engineer"
  | "purchaser"
  | "admin"
  | "assign"
  | "approve"
  | "build"
  | "close";

export interface LandingModule {
  title: string;
  description: string;
  icon: LandingIconName;
}

export interface LandingWorkflowStep {
  label: string;
  description: string;
  icon: LandingIconName;
}

export interface LandingRole {
  title: string;
  description: string;
  icon: LandingIconName;
}

export interface LandingTourSlide {
  label: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  imageWidth: number;
  imageHeight: number;
  bullets: string[];
}
