export type ReportStatus = "submitted" | "reviewed";
export type WeatherCondition = "sunny" | "rainy" | "cloudy" | "stormy";

export interface ProgressReportRecord {
  id: string;
  projectName: string;
  reporterName: string;
  date: string;
  content: string;
  challenges: string;
  completionPercentage: number;
  status: ReportStatus;
  weatherCondition: WeatherCondition;
  photos: string[];
}
