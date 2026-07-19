"use client";

import React, { useState, useEffect, useTransition } from "react";
import { createPortal } from "react-dom";
import type { ProjectRecord, ProjectStatus } from "../types";
import { MOCK_PROJECTS } from "../utils/mockProjects";
import { MOCK_TASKS } from "@/features/my-tasks/utils/mockTasks";
import { MOCK_REPORTS } from "@/features/progress-reports/utils/mockReports";
import ProjectDetailsModal from "./ProjectDetailsModal";
import ProjectPortfolioCard from "./ProjectPortfolioCard";
import DashboardPageHero from "@/components/DashboardPageHero";
import RoleGreetingHero from "@/features/home/components/RoleGreetingHero";
import MaterialApprovalsPageClient from "@/features/material-approvals/components/MaterialApprovalsPageClient";
import PurchasingApprovalsPageClient from "@/features/purchasing-approvals/components/PurchasingApprovalsPageClient";
import {
  FolderKanban,
  BadgeDollarSign,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Building,
  Filter,
  Plus,
  X,
  LoaderCircle,
  ArrowLeft,
  ClipboardList,
  CheckSquare,
  FileText,
  MessageSquare,
  Eye,
  CloudSun,
  PenSquare,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type CeoProjectsSection =
  | "portfolio"
  | "material-approvals"
  | "purchasing-approvals";

const CEO_PROJECT_SECTIONS: {
  id: CeoProjectsSection;
  label: string;
  icon: typeof FolderKanban;
}[] = [
  { id: "portfolio", label: "Project Portfolio", icon: FolderKanban },
  { id: "material-approvals", label: "Material Approval", icon: ClipboardList },
  {
    id: "purchasing-approvals",
    label: "Purchasing Approval",
    icon: BadgeDollarSign,
  },
];

const PROJECT_IMAGES: Record<string, string> = {
  "proj-1":
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&h=900&q=92",
  "proj-2":
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&h=900&q=92",
  "proj-3":
    "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1600&h=900&q=92",
  "proj-4":
    "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1600&h=900&q=92",
  "proj-5":
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&h=900&q=92",
};

const TYPE_IMAGES: Record<string, string> = {
  condo:
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&h=900&q=92",
  villa:
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&h=900&q=92",
  commercial:
    "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1600&h=900&q=92",
  warehouse:
    "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1600&h=900&q=92",
  office:
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&h=900&q=92",
};

const INITIAL_MATERIALS = [
  {
    id: "mat-1",
    projectName: "Grand Horizon Towers",
    materialName: "Portland Cement (Type 1)",
    quantity: 350,
    unit: "bags",
    neededBy: "2026-07-25",
    priority: "high",
    requestedBy: "Engineer User",
    status: "pending",
    notes: "Crucial for structural columns concrete pouring on July 26.",
  },
  {
    id: "mat-2",
    projectName: "Vista Verde Residences",
    materialName: "Deformed Steel Bar Grade 40 (16mm x 6m)",
    quantity: 120,
    unit: "pcs",
    neededBy: "2026-07-28",
    priority: "urgent",
    requestedBy: "Engineer User",
    status: "pending",
    notes: "Required for floor slab frame reinforcment.",
  },
];

function getGreetingMessage(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afty";
  return "Good evee";
}

function getPhilippineHour() {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      hourCycle: "h23",
      timeZone: "Asia/Manila",
    }).format(new Date()),
  );
}

function getDateLabel() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Manila",
  })
    .format(new Date())
    .toUpperCase();
}

function getFirstName(fullName: string | null) {
  const source = (fullName?.trim() || "Engineer").replace(/[_-]+/g, " ");
  const [first] = source.split(/\s+/);
  return first || "Engineer";
}

interface ProjectsPageClientProps {
  role: "ceo" | "engineer";
  fullName: string | null;
  initialSection?: CeoProjectsSection;
}

export default function ProjectsPageClient({
  role,
  fullName,
  initialSection = "portfolio",
}: ProjectsPageClientProps) {
  const [projectsList, setProjectsList] = useState<ProjectRecord[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Active workspace state for Engineer
  const [selectedEngineerProject, setSelectedEngineerProject] =
    useState<ProjectRecord | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<
    "overview" | "tasks" | "reports" | "materials"
  >("overview");

  // CEO Project Details Modal
  const [selectedProject, setSelectedProject] = useState<ProjectRecord | null>(
    null,
  );
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus | "all">(
    "all",
  );
  const [activeCeoSection, setActiveCeoSection] =
    useState<CeoProjectsSection>(initialSection);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Consolidated Database in Local Storage
  const [tasksList, setTasksList] = useState<any[]>([]);
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [materialsList, setMaterialsList] = useState<any[]>([]);

  // Task Editing Modal
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [modalTaskStatus, setModalTaskStatus] = useState<any>("todo");
  const [modalTaskProgress, setModalTaskProgress] = useState(0);
  const [modalTaskNotes, setModalTaskNotes] = useState("");

  // Daily Report Form State
  const [reportWeather, setReportWeather] = useState<
    "sunny" | "cloudy" | "rainy" | "stormy"
  >("sunny");
  const [reportContent, setReportContent] = useState("");
  const [reportChallenges, setReportChallenges] = useState("");

  // Material Request Form State
  const [materialName, setMaterialName] = useState("");
  const [materialQty, setMaterialQty] = useState("");
  const [materialUnit, setMaterialUnit] = useState("pcs");
  const [materialNeededBy, setMaterialNeededBy] = useState("");
  const [materialPriority, setMaterialPriority] = useState<
    "low" | "medium" | "high" | "urgent"
  >("medium");
  const [materialNotes, setMaterialNotes] = useState("");

  // Create Project Form State
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [client, setClient] = useState("");
  const [budget, setBudget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [manager, setManager] = useState("Engr. Sarah Lee");
  const [assignedEngineer, setAssignedEngineer] = useState("Engineer User");
  const [projectType, setProjectType] = useState("condo");
  const [description, setDescription] = useState("");
  const hasOpenModal = Boolean(
    selectedProject || showCreateModal || editingTask,
  );

  // Hydrate states on client mount
  useEffect(() => {
    setIsClient(true);

    // Load projects
    const savedProjects = localStorage.getItem("prodisenyo-projects-v2");
    let currentProjects = MOCK_PROJECTS;
    if (savedProjects) {
      try {
        currentProjects = JSON.parse(savedProjects);
      } catch (e) {
        console.error(e);
      }
    } else {
      localStorage.setItem(
        "prodisenyo-projects-v2",
        JSON.stringify(MOCK_PROJECTS),
      );
    }
    setProjectsList(currentProjects);

    // Load tasks
    const savedTasks = localStorage.getItem("prodisenyo-tasks-v2");
    let currentTasks = MOCK_TASKS;
    if (savedTasks) {
      try {
        currentTasks = JSON.parse(savedTasks);
      } catch (e) {
        console.error(e);
      }
    } else {
      localStorage.setItem("prodisenyo-tasks-v2", JSON.stringify(MOCK_TASKS));
    }
    setTasksList(currentTasks);

    // Load progress reports
    const savedReports = localStorage.getItem("prodisenyo-progress-reports-v2");
    let currentReports = MOCK_REPORTS;
    if (savedReports) {
      try {
        currentReports = JSON.parse(savedReports);
      } catch (e) {
        console.error(e);
      }
    } else {
      localStorage.setItem(
        "prodisenyo-progress-reports-v2",
        JSON.stringify(MOCK_REPORTS),
      );
    }
    setReportsList(currentReports);

    // Load material requests
    const savedMaterials = localStorage.getItem(
      "prodisenyo-material-requests-v2",
    );
    let currentMaterials = INITIAL_MATERIALS;
    if (savedMaterials) {
      try {
        currentMaterials = JSON.parse(savedMaterials);
      } catch (e) {
        console.error(e);
      }
    } else {
      localStorage.setItem(
        "prodisenyo-material-requests-v2",
        JSON.stringify(INITIAL_MATERIALS),
      );
    }
    setMaterialsList(currentMaterials);
  }, []);

  useEffect(() => {
    if (!hasOpenModal) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [hasOpenModal]);

  const saveProjects = (newList: ProjectRecord[]) => {
    setProjectsList(newList);
    localStorage.setItem("prodisenyo-projects-v2", JSON.stringify(newList));
  };

  // Filter projects based on role and status
  const projects = React.useMemo(() => {
    const list = isClient ? projectsList : MOCK_PROJECTS;
    const filteredByRole =
      role === "ceo"
        ? list
        : list.filter(
            (p) => p.engineer === "Engineer User" || p.engineer === fullName,
          );

    if (selectedStatus !== "all" && role === "ceo") {
      return filteredByRole.filter((p) => p.status === selectedStatus);
    }
    return filteredByRole;
  }, [projectsList, role, selectedStatus, fullName, isClient]);

  const stats = React.useMemo(() => {
    const list = isClient ? projectsList : MOCK_PROJECTS;
    const filteredByRole =
      role === "ceo"
        ? list
        : list.filter(
            (p) => p.engineer === "Engineer User" || p.engineer === fullName,
          );

    const totalBudget = filteredByRole.reduce((sum, p) => sum + p.budget, 0);
    const totalSpent = filteredByRole.reduce((sum, p) => sum + p.spent, 0);
    const active = filteredByRole.filter((p) => p.status === "active").length;
    const hold = filteredByRole.filter((p) => p.status === "on_hold").length;
    return { totalBudget, totalSpent, active, hold };
  }, [projectsList, role, fullName, isClient]);

  // Handle CEO creating project
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !name.trim() ||
      !location.trim() ||
      !client.trim() ||
      !budget ||
      !startDate ||
      !endDate ||
      !description.trim()
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const budgetVal = Number(budget);
    if (Number.isNaN(budgetVal) || budgetVal <= 0) {
      toast.error("Please enter a valid budget amount.");
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const newProjectId = `proj-${Date.now()}`;
      PROJECT_IMAGES[newProjectId] =
        TYPE_IMAGES[projectType] || TYPE_IMAGES.condo;

      const newProject: ProjectRecord = {
        id: newProjectId,
        name: name.trim(),
        location: location.trim(),
        client: client.trim(),
        status: "active",
        budget: budgetVal,
        spent: 0,
        progress: 0,
        startDate,
        endDate,
        manager,
        engineer: assignedEngineer,
        tasksCount: 0,
        completedTasksCount: 0,
        materialsCount: 0,
        description: description.trim(),
      };

      const updatedList = [newProject, ...projectsList];
      saveProjects(updatedList);

      setName("");
      setLocation("");
      setClient("");
      setBudget("");
      setStartDate("");
      setEndDate("");
      setDescription("");

      setIsSubmitting(false);
      setShowCreateModal(false);
      toast.success("Project created and site engineer assigned.");
    }, 800);
  };

  // Recalculates and updates the overall project completion % based on its tasks' progress
  const recalculateProjectProgress = (
    projName: string,
    updatedTasks: any[],
  ) => {
    const projectTasks = updatedTasks.filter((t) => t.projectName === projName);
    const newProgress =
      projectTasks.length > 0
        ? Math.round(
            projectTasks.reduce((sum, t) => sum + t.progress, 0) /
              projectTasks.length,
          )
        : 0;

    const completedCount = projectTasks.filter(
      (t) => t.status === "completed",
    ).length;

    const updatedProjects = projectsList.map((p) => {
      if (p.name === projName) {
        return {
          ...p,
          progress: newProgress,
          tasksCount: projectTasks.length,
          completedTasksCount: completedCount,
        };
      }
      return p;
    });

    saveProjects(updatedProjects);

    // Sync active workspace stats if currently viewing it
    if (selectedEngineerProject && selectedEngineerProject.name === projName) {
      setSelectedEngineerProject((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          progress: newProgress,
          tasksCount: projectTasks.length,
          completedTasksCount: completedCount,
        };
      });
    }
  };

  // Handle Task Update
  const openEditTaskModal = (task: any) => {
    setEditingTask(task);
    setModalTaskStatus(task.status);
    setModalTaskProgress(task.progress);
    setModalTaskNotes(task.notes || "");
  };

  const saveTaskUpdates = () => {
    if (!editingTask) return;

    const updatedTasks = tasksList.map((t) => {
      if (t.id === editingTask.id) {
        return {
          ...t,
          status: modalTaskStatus,
          progress: modalTaskProgress,
          notes: modalTaskNotes.trim() || undefined,
        };
      }
      return t;
    });

    setTasksList(updatedTasks);
    localStorage.setItem("prodisenyo-tasks-v2", JSON.stringify(updatedTasks));

    recalculateProjectProgress(editingTask.projectName, updatedTasks);

    setEditingTask(null);
    toast.success("Task updated successfully.");
  };

  // Handle Progress Report Submission
  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEngineerProject) return;
    if (!reportContent.trim()) {
      toast.error("Please describe work accomplishments.");
      return;
    }

    startTransition(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));

      const newReport = {
        id: `rep-${Date.now()}`,
        projectName: selectedEngineerProject.name,
        reporterName: "Engineer User",
        date: new Date().toISOString().split("T")[0],
        content: reportContent,
        challenges:
          reportChallenges.trim() || "No significant issues reported.",
        completionPercentage: selectedEngineerProject.progress,
        status: "submitted" as const,
        weatherCondition: reportWeather,
        photos: [
          "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=400&q=80",
        ],
      };

      const updatedReports = [newReport, ...reportsList];
      setReportsList(updatedReports);
      localStorage.setItem(
        "prodisenyo-progress-reports-v2",
        JSON.stringify(updatedReports),
      );

      setReportContent("");
      setReportChallenges("");
      toast.success("Progress report logged successfully!");
    });
  };

  // Handle Material Request Submission
  const handleMaterialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEngineerProject) return;
    if (!materialName.trim() || !materialQty || !materialNeededBy) {
      toast.error("Please fill in required fields.");
      return;
    }

    const qtyVal = Number(materialQty);
    if (Number.isNaN(qtyVal) || qtyVal <= 0) {
      toast.error("Please enter a valid quantity.");
      return;
    }

    startTransition(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));

      const newRequest = {
        id: `mat-${Date.now()}`,
        projectName: selectedEngineerProject.name,
        materialName: materialName.trim(),
        quantity: qtyVal,
        unit: materialUnit,
        neededBy: materialNeededBy,
        priority: materialPriority,
        requestedBy: "Engineer User",
        status: "pending" as const,
        notes: materialNotes.trim() || undefined,
      };

      const updatedMaterials = [newRequest, ...materialsList];
      setMaterialsList(updatedMaterials);
      localStorage.setItem(
        "prodisenyo-material-requests-v2",
        JSON.stringify(updatedMaterials),
      );

      // Update project materials count
      const updatedProjects = projectsList.map((p) => {
        if (p.id === selectedEngineerProject.id) {
          return { ...p, materialsCount: p.materialsCount + 1 };
        }
        return p;
      });
      saveProjects(updatedProjects);
      setSelectedEngineerProject((prev) => {
        if (!prev) return null;
        return { ...prev, materialsCount: prev.materialsCount + 1 };
      });

      setMaterialName("");
      setMaterialQty("");
      setMaterialNeededBy("");
      setMaterialNotes("");
      toast.success("Material request submitted.");
    });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getStatusColor = (status: ProjectStatus) => {
    if (status === "active")
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (status === "planning") return "bg-sky-50 text-sky-700 border-sky-100";
    if (status === "on_hold") return "bg-rose-50 text-rose-700 border-rose-100";
    return "bg-slate-50 text-slate-700 border-slate-100";
  };

  const isOverBudget = (project: ProjectRecord) => {
    return project.spent > project.budget * 0.8;
  };

  // Contextual Project Filtering for Workspace Tabs
  const currentProjectTasks = React.useMemo(() => {
    if (!selectedEngineerProject) return [];
    return tasksList.filter(
      (t) => t.projectName === selectedEngineerProject.name,
    );
  }, [tasksList, selectedEngineerProject]);

  const currentProjectReports = React.useMemo(() => {
    if (!selectedEngineerProject) return [];
    return reportsList.filter(
      (r) => r.projectName === selectedEngineerProject.name,
    );
  }, [reportsList, selectedEngineerProject]);

  const currentProjectMaterials = React.useMemo(() => {
    if (!selectedEngineerProject) return [];
    return materialsList.filter(
      (m) => m.projectName === selectedEngineerProject.name,
    );
  }, [materialsList, selectedEngineerProject]);

  return (
    <div className="space-y-4 p-0 sm:p-6">
      {/* 1. CEO VIEW OR ENGINEER MAIN SELECTOR VIEW */}
      {!selectedEngineerProject ? (
        <>
          {role === "engineer" ? (
            <RoleGreetingHero
              className="mb-6"
              dateLabel={getDateLabel()}
              title={`${getGreetingMessage(getPhilippineHour())}, ${getFirstName(fullName)}!`}
              messages={[
                "Check your active site benchmarks and checklist below.",
                "Recalculate progress by toggling task completion status.",
                "Submit material POs or log site daily progress reports in workspace tabs.",
              ]}
            />
          ) : (
            <DashboardPageHero
              eyebrow="Executive Control"
              title="Project Management"
              actions={
                activeCeoSection === "portfolio" ? (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-3 sm:mt-0 flex h-10 items-center gap-2 rounded-xl bg-[#1f6a37] px-4 text-sm font-semibold text-white hover:bg-emerald-800 transition shadow-sm"
                  >
                    <Plus size={15} />
                    Create New Project
                  </button>
                ) : null
              }
            />
          )}

          {role === "ceo" ? (
            <div className="flex gap-2 overflow-x-auto border-b border-apple-mist pb-3">
              {CEO_PROJECT_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveCeoSection(section.id)}
                  className={cn(
                    "inline-flex h-10 shrink-0 items-center gap-2 rounded-[10px] border px-4 text-sm font-semibold transition",
                    activeCeoSection === section.id
                      ? "border-[#1f6a37] bg-[#1f6a37] text-white"
                      : "border-apple-mist bg-white text-apple-charcoal hover:bg-apple-mist/50",
                  )}
                >
                  <section.icon size={15} />
                  {section.label}
                </button>
              ))}
            </div>
          ) : null}

          {role === "ceo" && activeCeoSection === "material-approvals" ? (
            <MaterialApprovalsPageClient />
          ) : null}

          {role === "ceo" && activeCeoSection === "purchasing-approvals" ? (
            <PurchasingApprovalsPageClient />
          ) : null}

          {role !== "ceo" || activeCeoSection === "portfolio" ? (
            <>
          {/* CEO-only Overview Cards */}
          {role === "ceo" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-white border border-apple-mist rounded-2xl shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Total Portfolio Budget
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-apple-charcoal mt-1">
                    {formatCurrency(stats.totalBudget)}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                  <DollarSign size={20} />
                </div>
              </div>

              <div className="p-4 bg-white border border-apple-mist rounded-2xl shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Actual Spent To Date
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-apple-charcoal mt-1">
                    {formatCurrency(stats.totalSpent)}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700">
                  <TrendingUp size={20} />
                </div>
              </div>

              <div className="p-4 bg-white border border-apple-mist rounded-2xl shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Active Projects
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-apple-charcoal mt-1">
                    {stats.active}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                  <Building size={20} />
                </div>
              </div>

              <div className="p-4 bg-white border border-apple-mist rounded-2xl shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    On Hold
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-apple-charcoal mt-1">
                    {stats.hold}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-700">
                  <AlertTriangle size={20} />
                </div>
              </div>
            </div>
          )}

          {/* CEO-only Status Filter Tabs */}
          {role === "ceo" && (
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Filter size={13} className="text-apple-smoke" />
              <span className="text-xs font-bold text-apple-charcoal uppercase tracking-wider mr-2">
                Filters
              </span>
              <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {(
                  [
                    { id: "all", label: "All Projects" },
                    { id: "active", label: "Active" },
                    { id: "planning", label: "Planning" },
                    { id: "on_hold", label: "On Hold" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedStatus(tab.id)}
                    className={cn(
                      "border px-3 py-1 rounded-lg text-xs font-semibold tracking-tight transition-all",
                      selectedStatus === tab.id
                        ? "bg-[#1f6a37] text-white border-[#1f6a37] shadow-xs"
                        : "text-apple-smoke hover:bg-apple-mist/50 hover:text-apple-charcoal border border-apple-mist bg-white",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Projects Portfolio Grid */}
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <ProjectPortfolioCard
                key={project.id}
                project={project}
                role={role}
                imageSrc={
                  PROJECT_IMAGES[project.id] ||
                  "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1600&h=900&q=92"
                }
                formatCurrency={formatCurrency}
                isOverBudget={isOverBudget}
                onOpen={() => {
                  if (role === "ceo") {
                    setSelectedProject(project);
                  } else {
                    setSelectedEngineerProject(project);
                    setWorkspaceTab("overview");
                  }
                }}
              />
            ))}
          </div>
            </>
          ) : null}
        </>
      ) : (
        /* 2. ENGINEER CONSOLIDATED ACTIVE WORKSPACE */
        <div className="space-y-7">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedEngineerProject(null)}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-apple-mist bg-white text-apple-smoke hover:bg-apple-mist hover:text-apple-charcoal transition"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Engineering Workspace
              </p>
              <h2 className="text-2xl font-bold tracking-[-0.02em] text-apple-charcoal">
                {selectedEngineerProject.name}
              </h2>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex gap-1 overflow-x-auto border-b border-slate-100">
            {(
              [
                { id: "overview", label: "Project Overview", icon: Building },
                {
                  id: "tasks",
                  label: `Tasks Checklist (${currentProjectTasks.length})`,
                  icon: CheckSquare,
                },
                {
                  id: "reports",
                  label: `Progress Reports (${currentProjectReports.length})`,
                  icon: FileText,
                },
                {
                  id: "materials",
                  label: `Material Requests (${currentProjectMaterials.length})`,
                  icon: ClipboardList,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setWorkspaceTab(tab.id)}
                className={cn(
                  "flex items-center gap-2.5 border-b-2 px-4 py-3 text-sm font-semibold transition-all whitespace-nowrap",
                  workspaceTab === tab.id
                    ? "border-[#1f6a37] text-[#1f6a37]"
                    : "border-transparent text-apple-smoke hover:text-apple-charcoal",
                )}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB CONTENTS */}

          {/* TAB 1: OVERVIEW */}
          {workspaceTab === "overview" && (
            <div className="mt-5 grid gap-6 md:grid-cols-3">
              <div className="md:col-span-2 bg-white border border-apple-mist p-6 rounded-2xl shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-apple-charcoal">
                    Specifications & Details
                  </h3>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-bold uppercase text-emerald-700">
                    {selectedEngineerProject.status}
                  </span>
                </div>
                <p className="rounded-xl border border-slate-100 bg-slate-50 p-5 text-base italic leading-7 text-slate-700">
                  &ldquo;{selectedEngineerProject.description}&rdquo;
                </p>

                <div className="grid gap-5 pt-2 text-sm sm:grid-cols-2">
                  <div>
                    <span className="font-semibold uppercase tracking-wide text-slate-500">
                      Client
                    </span>
                    <p className="mt-1 text-base font-bold text-apple-charcoal">
                      {selectedEngineerProject.client}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold uppercase tracking-wide text-slate-500">
                      Project Timeline
                    </span>
                    <p className="mt-1 text-base font-bold text-apple-charcoal">
                      {selectedEngineerProject.startDate} to{" "}
                      {selectedEngineerProject.endDate}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold uppercase tracking-wide text-slate-500">
                      Location Address
                    </span>
                    <p className="mt-1 text-base font-bold text-apple-charcoal">
                      {selectedEngineerProject.location}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold uppercase tracking-wide text-slate-500">
                      Project Manager
                    </span>
                    <p className="mt-1 text-base font-bold text-apple-charcoal">
                      {selectedEngineerProject.manager}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-apple-mist p-6 rounded-2xl shadow-sm space-y-6">
                <h3 className="text-lg font-bold text-apple-charcoal">
                  Completion Metrics
                </h3>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-600">
                    <span>Physical Progress</span>
                    <span className="text-base font-bold text-emerald-700">
                      {selectedEngineerProject.progress}%
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full"
                      style={{ width: `${selectedEngineerProject.progress}%` }}
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5 space-y-4 text-sm text-slate-700">
                  <div className="flex justify-between">
                    <span>Assigned Site Tasks:</span>
                    <span className="font-bold text-slate-950">
                      {selectedEngineerProject.completedTasksCount} /{" "}
                      {selectedEngineerProject.tasksCount} done
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Material Invoices Sent:</span>
                    <span className="font-bold text-slate-950">
                      {selectedEngineerProject.materialsCount} total requests
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Progress Logs Logged:</span>
                    <span className="font-bold text-slate-950">
                      {currentProjectReports.length} reports
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TASKS */}
          {workspaceTab === "tasks" && (
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {currentProjectTasks.length > 0 ? (
                currentProjectTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-white border border-apple-mist p-6 rounded-2xl shadow-[0_4px_20px_rgba(24,83,43,0.03)] hover:border-slate-300 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase">
                          Task ID: {task.id}
                        </span>
                        <span
                          className={cn(
                            "text-xs font-bold uppercase border px-2.5 py-1 rounded-full",
                            task.priority === "high"
                              ? "border-rose-200 bg-rose-50 text-rose-700"
                              : task.priority === "medium"
                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700",
                          )}
                        >
                          {task.priority} priority
                        </span>
                      </div>

                      <h4 className="font-bold text-apple-charcoal mt-4 text-lg">
                        {task.title}
                      </h4>
                      <p className="text-sm text-slate-700 mt-2 leading-6">
                        {task.description}
                      </p>

                      <div className="mt-4 space-y-1">
                        <div className="flex items-center justify-between text-sm text-slate-600">
                          <span>Progress</span>
                          <span className="font-bold text-apple-charcoal">
                            {task.progress}%
                          </span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-300",
                              task.status === "completed"
                                ? "bg-emerald-600"
                                : task.status === "delayed"
                                  ? "bg-rose-500"
                                  : "bg-sky-500",
                            )}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>

                      {task.notes && (
                        <p className="text-sm text-slate-700 mt-4 p-3 bg-slate-50 border border-slate-100 rounded-lg italic">
                          Notes: {task.notes}
                        </p>
                      )}
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Calendar size={15} />
                        <span>Due: {task.dueDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider",
                            task.status === "completed"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : task.status === "in_progress"
                                ? "bg-sky-50 text-sky-700 border border-sky-200"
                                : task.status === "delayed"
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : "bg-slate-100 text-slate-600",
                          )}
                        >
                          {task.status}
                        </span>
                        <button
                          onClick={() => openEditTaskModal(task)}
                          className="h-9 w-9 rounded-lg border border-apple-mist bg-white text-apple-smoke hover:bg-apple-mist/50 hover:text-apple-charcoal flex items-center justify-center"
                        >
                          <PenSquare size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-12 bg-white border border-dashed border-slate-200 rounded-2xl">
                  <CheckSquare size={32} className="mx-auto text-slate-300" />
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    No tasks assigned
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    This project has no active site benchmarks.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PROGRESS REPORTS */}
          {workspaceTab === "reports" && (
            <div className="mt-5 grid gap-6 md:grid-cols-3">
              <div className="bg-white border border-apple-mist p-6 rounded-2xl shadow-sm h-fit">
                <h4 className="mb-5 text-lg font-bold text-apple-charcoal">
                  Log Daily Site Report
                </h4>
                <form onSubmit={handleReportSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Weather Condition
                    </label>
                    <select
                      value={reportWeather}
                      onChange={(e: any) => setReportWeather(e.target.value)}
                      className="h-11 rounded-lg border border-apple-mist bg-white px-3 w-full text-sm text-apple-charcoal outline-none focus:border-[#1f6a37]"
                    >
                      <option value="sunny">Sunny / Clear</option>
                      <option value="cloudy">Cloudy</option>
                      <option value="rainy">Light Rainfall</option>
                      <option value="stormy">Heavy Storm</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Accomplishments <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      placeholder="Specify columns poured, grid layout alignments check, or inspections completed today..."
                      rows={4}
                      value={reportContent}
                      onChange={(e) => setReportContent(e.target.value)}
                      className="w-full text-sm leading-6 p-3 rounded-lg border border-apple-mist outline-none focus:border-[#1f6a37] resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Site Challenges / Bottlenecks
                    </label>
                    <textarea
                      placeholder="Weather delays, trucking delays, missing materials..."
                      rows={2}
                      value={reportChallenges}
                      onChange={(e) => setReportChallenges(e.target.value)}
                      className="w-full text-sm leading-6 p-3 rounded-lg border border-apple-mist outline-none focus:border-[#1f6a37] resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full h-11 rounded-lg bg-[#1f6a37] text-sm font-bold text-white hover:bg-emerald-800 transition flex items-center justify-center gap-2"
                  >
                    {isPending && (
                      <LoaderCircle size={16} className="animate-spin" />
                    )}
                    Submit Report Log
                  </button>
                </form>
              </div>

              <div className="md:col-span-2 space-y-4">
                <h4 className="text-lg font-bold text-apple-charcoal">
                  Report History
                </h4>
                {currentProjectReports.length > 0 ? (
                  currentProjectReports.map((rep) => (
                    <div
                      key={rep.id}
                      className="bg-white border border-apple-mist p-5 rounded-xl shadow-xs space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-bold text-apple-charcoal">
                            {rep.reporterName}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500">{rep.date}</span>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded uppercase">
                          Weather: {rep.weatherCondition}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 leading-6">
                        {rep.content}
                      </p>
                      {rep.challenges && (
                        <div className="text-sm text-rose-700 bg-rose-50/50 p-3 rounded-lg border border-rose-100 flex gap-2 leading-6">
                          <AlertCircle size={15} className="shrink-0 mt-0.5" />
                          <span>
                            <strong>Challenges:</strong> {rep.challenges}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 bg-white border border-dashed border-slate-200 rounded-xl">
                    <FileText size={24} className="mx-auto text-slate-300" />
                    <p className="text-sm font-semibold text-slate-500 mt-2">
                      No reports submitted yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: MATERIALS */}
          {workspaceTab === "materials" && (
            <div className="mt-5 grid gap-6 md:grid-cols-3">
              <div className="bg-white border border-apple-mist p-6 rounded-2xl shadow-sm h-fit">
                <h4 className="mb-5 text-lg font-bold text-apple-charcoal">
                  Request Project Materials
                </h4>
                <form onSubmit={handleMaterialSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Material Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Portland Cement"
                      value={materialName}
                      onChange={(e) => setMaterialName(e.target.value)}
                      className="h-11 rounded-lg border border-apple-mist px-3 w-full text-sm text-apple-charcoal outline-none focus:border-[#1f6a37]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">
                        Quantity <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 50"
                        value={materialQty}
                        onChange={(e) => setMaterialQty(e.target.value)}
                        className="h-11 rounded-lg border border-apple-mist px-3 w-full text-sm text-apple-charcoal outline-none focus:border-[#1f6a37]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">
                        Unit
                      </label>
                      <select
                        value={materialUnit}
                        onChange={(e) => setMaterialUnit(e.target.value)}
                        className="h-11 rounded-lg border border-apple-mist bg-white px-3 w-full text-sm text-apple-charcoal outline-none focus:border-[#1f6a37]"
                      >
                        <option value="pcs">Pieces (pcs)</option>
                        <option value="bags">Bags</option>
                        <option value="cu.m">Cubic Meters (cu.m)</option>
                        <option value="kg">Kilograms (kg)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">
                        Needed By <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={materialNeededBy}
                        onChange={(e) => setMaterialNeededBy(e.target.value)}
                        className="h-11 rounded-lg border border-apple-mist px-3 w-full text-sm text-apple-charcoal outline-none focus:border-[#1f6a37]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">
                        Urgency Level
                      </label>
                      <select
                        value={materialPriority}
                        onChange={(e: any) =>
                          setMaterialPriority(e.target.value)
                        }
                        className="h-11 rounded-lg border border-apple-mist bg-white px-3 w-full text-sm text-apple-charcoal outline-none focus:border-[#1f6a37]"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Special Notes
                    </label>
                    <textarea
                      placeholder="Vendor details, structural specifications..."
                      rows={2}
                      value={materialNotes}
                      onChange={(e) => setMaterialNotes(e.target.value)}
                      className="w-full text-sm leading-6 p-3 rounded-lg border border-apple-mist outline-none focus:border-[#1f6a37] resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full h-11 rounded-lg bg-[#1f6a37] text-sm font-bold text-white hover:bg-emerald-800 transition flex items-center justify-center gap-2"
                  >
                    {isPending && (
                      <LoaderCircle size={16} className="animate-spin" />
                    )}
                    Submit Material PO
                  </button>
                </form>
              </div>

              <div className="md:col-span-2 space-y-4">
                <h4 className="text-lg font-bold text-apple-charcoal">
                  Material Request Ledger
                </h4>
                {currentProjectMaterials.length > 0 ? (
                  currentProjectMaterials.map((mat) => (
                    <div
                      key={mat.id}
                      className="bg-white border border-apple-mist p-5 rounded-xl shadow-xs flex items-center justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-apple-charcoal text-base">
                            {mat.materialName}
                          </span>
                          <span
                            className={cn(
                              "px-2 py-1 rounded text-xs font-bold uppercase",
                              mat.priority === "urgent"
                                ? "bg-rose-50 text-rose-700 border border-rose-100"
                                : mat.priority === "high"
                                  ? "bg-amber-50 text-amber-700 border border-amber-100"
                                  : "bg-slate-100 text-slate-600",
                            )}
                          >
                            {mat.priority}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 font-semibold">
                          Quantity: {mat.quantity} {mat.unit}
                        </p>
                        <div className="text-sm text-slate-500">
                          <span>Requested by {mat.requestedBy}</span>
                          <span className="mx-1.5">•</span>
                          <span>Required date: {mat.neededBy}</span>
                        </div>
                        {mat.notes && (
                          <p className="text-sm leading-6 text-slate-600 italic mt-1">
                            &ldquo;{mat.notes}&rdquo;
                          </p>
                        )}
                        {mat.approvalNotes && (
                          <div className="text-sm leading-6 text-emerald-800 bg-emerald-50/50 p-3 rounded-lg mt-1 border border-emerald-100 flex gap-2">
                            <MessageSquare
                              size={12}
                              className="shrink-0 mt-0.5 text-emerald-600"
                            />
                            <span>
                              <strong>Review Comments:</strong>{" "}
                              {mat.approvalNotes}
                            </span>
                          </div>
                        )}
                      </div>

                      <span
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider",
                          mat.status === "approved"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : mat.status === "rejected"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200",
                        )}
                      >
                        {mat.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 bg-white border border-dashed border-slate-200 rounded-xl">
                    <ClipboardList
                      size={24}
                      className="mx-auto text-slate-300"
                    />
                    <p className="text-sm font-semibold text-slate-500 mt-2">
                      No material requests filed.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CEO-Only Details Modal */}
      {selectedProject && (
        <ProjectDetailsModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}

      {/* CEO-Only Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[9999] flex h-screen min-h-screen w-screen items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white border border-apple-mist rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-apple-charcoal">
                Create New Construction Project
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-apple-mist text-apple-smoke hover:bg-apple-mist/50 hover:text-apple-charcoal transition"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Project Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grand Horizon Towers Phase 2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 rounded-xl w-full border border-apple-mist bg-white px-3 text-sm text-apple-charcoal outline-none focus:border-[#1f6a37] transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">
                    Location <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Quezon City"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="h-11 rounded-xl w-full border border-apple-mist bg-white px-3 text-sm text-apple-charcoal outline-none focus:border-[#1f6a37] transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">
                    Client <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Horizon Land Dev"
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    className="h-11 rounded-xl w-full border border-apple-mist bg-white px-3 text-sm text-apple-charcoal outline-none focus:border-[#1f6a37] transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">
                    Total Budget (PHP) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 50000000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="h-11 rounded-xl w-full border border-apple-mist bg-white px-3 text-sm text-apple-charcoal outline-none focus:border-[#1f6a37] transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">
                    Project Theme / Layout
                  </label>
                  <select
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                    className="h-11 rounded-xl w-full border border-apple-mist bg-white px-3 text-sm text-apple-charcoal outline-none focus:border-[#1f6a37] transition"
                  >
                    <option value="condo">Residential Condominium</option>
                    <option value="villa">Luxury Garden Villa</option>
                    <option value="commercial">Glass Facade Commercial</option>
                    <option value="warehouse">Industrial Warehouse</option>
                    <option value="office">Corporate Office Tower</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-11 rounded-xl w-full border border-apple-mist bg-white px-3 text-sm text-apple-charcoal outline-none focus:border-[#1f6a37] transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">
                    End Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-11 rounded-xl w-full border border-apple-mist bg-white px-3 text-sm text-apple-charcoal outline-none focus:border-[#1f6a37] transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">
                    Project Manager
                  </label>
                  <input
                    type="text"
                    value={manager}
                    onChange={(e) => setManager(e.target.value)}
                    className="h-11 rounded-xl w-full border border-apple-mist bg-white px-3 text-sm text-apple-charcoal outline-none focus:border-[#1f6a37] transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">
                    Assign Site Engineer{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={assignedEngineer}
                    onChange={(e) => setAssignedEngineer(e.target.value)}
                    className="h-11 rounded-xl w-full border border-apple-mist bg-white px-3 text-sm text-apple-charcoal outline-none focus:border-[#1f6a37] transition"
                  >
                    <option value="Engineer User">
                      Engineer User (Assigned to Me)
                    </option>
                    <option value="Engr. Mark Santos">Engr. Mark Santos</option>
                    <option value="Engr. Jane Doe">Engr. Jane Doe</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Project Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  placeholder="Describe building specifications, amenities, structural layouts..."
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-apple-mist p-3 text-sm leading-6 text-apple-charcoal outline-none focus:border-[#1f6a37] resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="h-11 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 px-5 rounded-xl bg-[#1f6a37] text-sm font-semibold text-white hover:bg-emerald-800 transition shadow-sm flex items-center gap-2 disabled:opacity-70"
                >
                  {isSubmitting && (
                    <LoaderCircle size={14} className="animate-spin" />
                  )}
                  Create & Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Task Edit Modal for Site Engineer */}
      {editingTask
        ? createPortal(
        <div className="fixed inset-0 z-[9999] flex h-screen min-h-screen w-screen items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-apple-mist rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-apple-charcoal">
              Update Site Task
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {editingTask.title}
            </p>

            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: "todo", label: "To Do" },
                      { id: "in_progress", label: "In Progress" },
                      { id: "completed", label: "Completed" },
                      { id: "delayed", label: "Delayed" },
                    ] as const
                  ).map((stat) => (
                    <button
                      key={stat.id}
                      type="button"
                      onClick={() => {
                        setModalTaskStatus(stat.id);
                        if (stat.id === "completed") {
                          setModalTaskProgress(100);
                        } else if (stat.id === "todo") {
                          setModalTaskProgress(0);
                        }
                      }}
                      className={cn(
                        "h-11 px-3 border rounded-xl text-sm font-medium transition-all text-left flex items-center justify-between",
                        modalTaskStatus === stat.id
                          ? "border-[#1f6a37] bg-emerald-50/30 text-emerald-800 ring-1 ring-emerald-600/20"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                      )}
                    >
                      <span>{stat.label}</span>
                      {modalTaskStatus === stat.id && (
                        <div className="h-2 w-2 rounded-full bg-emerald-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">
                    Completion Progress
                  </span>
                  <span className="font-bold text-[#1f6a37]">
                    {modalTaskProgress}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={modalTaskProgress}
                  disabled={
                    modalTaskStatus === "completed" ||
                    modalTaskStatus === "todo"
                  }
                  onChange={(e) => setModalTaskProgress(Number(e.target.value))}
                  className="w-full accent-[#1f6a37] h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Inspection Comments
                </label>
                <textarea
                  value={modalTaskNotes}
                  onChange={(e) => setModalTaskNotes(e.target.value)}
                  placeholder="Notes about spacing checks, concrete curing, or layout alignment..."
                  rows={3}
                  className="w-full rounded-xl border border-apple-mist p-3 text-sm leading-6 text-apple-charcoal outline-none placeholder:text-apple-silver transition focus:border-[#1f6a37] resize-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="h-11 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveTaskUpdates}
                className="h-11 px-5 rounded-xl bg-[#1f6a37] text-sm font-semibold text-white hover:bg-emerald-800 transition shadow-sm"
              >
                Save Updates
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )
        : null}
    </div>
  );
}
