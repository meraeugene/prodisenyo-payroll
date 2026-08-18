import type {
  LandingModule,
  LandingRole,
  LandingTourSlide,
  LandingWorkflowStep,
} from "@/features/landing-page/types";

export const landingModules: LandingModule[] = [
  {
    title: "Project Management",
    description:
      "Keep assignments, project details, budgets, schedules, and delivery status in one workspace.",
    icon: "projects",
  },
  {
    title: "BOQ & Cost Estimation",
    description:
      "Prepare structured estimates, submit them for review, and establish an approved project baseline.",
    icon: "estimate",
  },
  {
    title: "Materials & Procurement",
    description:
      "Connect planned materials, CEO authorization, quotations, purchase orders, and receipts.",
    icon: "procurement",
  },
  {
    title: "Attendance & Payroll",
    description:
      "Import attendance, compute payroll, review overtime, and submit payroll reports for approval.",
    icon: "payroll",
  },
  {
    title: "Progress Tracking",
    description:
      "Capture overall project progress and weighted activities with clear review and approval states.",
    icon: "progress",
  },
  {
    title: "Cost Tracking",
    description:
      "Follow upcoming, ongoing, and completed project costs against the approved budget.",
    icon: "cost",
  },
];

export const landingWorkflow: LandingWorkflowStep[] = [
  {
    label: "Assign",
    description: "CEO creates and assigns the project.",
    icon: "assign",
  },
  {
    label: "Estimate",
    description: "Engineer prepares the BOQ and cost plan.",
    icon: "estimate",
  },
  {
    label: "Approve",
    description: "CEO reviews the estimate and authorizes work.",
    icon: "approve",
  },
  {
    label: "Procure",
    description: "Purchaser sources approved materials.",
    icon: "procurement",
  },
  {
    label: "Build",
    description: "Teams track progress, costs, and payroll.",
    icon: "build",
  },
  {
    label: "Close",
    description: "Management reviews and closes the project.",
    icon: "close",
  },
];

export const landingRoles: LandingRole[] = [
  {
    title: "CEO",
    description:
      "Review the portfolio, approve estimates and requests, and monitor budget and progress.",
    icon: "ceo",
  },
  {
    title: "Engineer / Project Manager",
    description:
      "Prepare estimates, request materials, update progress, and track project health.",
    icon: "engineer",
  },
  {
    title: "Purchaser",
    description:
      "Record quotations, manage purchase orders, update deliveries, and upload receipts.",
    icon: "purchaser",
  },
  {
    title: "Payroll Manager",
    description:
      "Process attendance, overtime, payroll computations, and CEO-ready submissions.",
    icon: "admin",
  },
];

export const landingTourSlides: LandingTourSlide[] = [
  {
    label: "Executive view",
    title: "See project performance from one decision-ready dashboard.",
    description:
      "The CEO view brings active projects, approvals, budgets, material requests, and progress into one place.",
    image: "/landing/ceo-dashboard.png",
    imageAlt: "Prodisenyo ProBuild CEO dashboard",
    imageWidth: 1672,
    imageHeight: 941,
    bullets: [
      "Live project and budget summaries",
      "Centralized approval queue",
      "Recent progress and workflow activity",
    ],
  },
  {
    label: "Planning",
    title: "Turn assigned projects into structured, reviewable BOQs.",
    description:
      "Engineers organize sections, item numbers, quantities, and cost sources before sending estimates to the CEO.",
    image: "/landing/cost-estimator.png",
    imageAlt: "Prodisenyo ProBuild cost estimator",
    imageWidth: 1672,
    imageHeight: 941,
    bullets: [
      "Section-based BOQ preparation",
      "Budget-ceiling visibility",
      "Controlled CEO review workflow",
    ],
  },
  {
    label: "Project delivery",
    title: "Give engineers a focused view of projects and requests.",
    description:
      "Assigned teams can follow project health, pending work, material requests, and workflow alerts without seeing other projects.",
    image: "/landing/engineer-dashboard.png",
    imageAlt: "Prodisenyo ProBuild engineer dashboard",
    imageWidth: 1672,
    imageHeight: 941,
    bullets: [
      "Assigned-project visibility",
      "Material request tracking",
      "Progress and estimate alerts",
    ],
  },
  {
    label: "Procurement",
    title: "Carry approved materials through purchasing and delivery.",
    description:
      "Purchasers work from authorized requests, record supplier quotations, and keep order and receipt details traceable.",
    image: "/landing/purchaser-dashboard.png",
    imageAlt: "Prodisenyo ProBuild purchaser dashboard",
    imageWidth: 1672,
    imageHeight: 941,
    bullets: [
      "Approved-request queue",
      "Supplier and quotation records",
      "Purchase and delivery status",
    ],
  },
  {
    label: "Payroll",
    title: "Connect attendance records to payroll approval.",
    description:
      "Payroll managers can review imported attendance, generate payroll, and track submissions returned or approved by the CEO.",
    image: "/landing/payroll-dashboard.png",
    imageAlt: "Prodisenyo ProBuild payroll dashboard",
    imageWidth: 1536,
    imageHeight: 1024,
    bullets: [
      "Attendance batch readiness",
      "Approved payroll totals",
      "CEO submission tracking",
    ],
  },
];
