import type {
  BudgetItemCategory,
  BudgetProjectType,
  Database,
  EstimateStatus,
} from "@/types/database";

export type CostCatalogItemRow =
  Database["public"]["Tables"]["cost_catalog_items"]["Row"];
export type ProjectEstimateRow =
  Database["public"]["Tables"]["project_estimates"]["Row"];
export type ProjectEstimateItemRow =
  Database["public"]["Tables"]["project_estimate_items"]["Row"];
export interface ReviewProjectEstimateRow extends ProjectEstimateRow {
  requester_profile: Pick<
    Database["public"]["Tables"]["profiles"]["Row"],
    "full_name" | "username"
  > | null;
}

export interface MaterialUnitOption {
  optionId: string;
  catalogItemId: string;
  unitType: string;
  unitCost: number;
  rawCostLabel: string;
  category: BudgetItemCategory;
  notes: string | null;
}

export interface MaterialOptionGroup {
  materialId: string;
  materialName: string;
  searchText: string;
  units: MaterialUnitOption[];
}

export interface ProjectEstimateDraftLine {
  id?: string;
  catalogItemId: string;
  materialId: string;
  materialName: string;
  unitType: string;
  unitCost: number;
  quantity: number;
  lineTotal: number;
  displayName: string;
  notes: string;
  pricingBasis: "catalog" | "supplier_quote";
  referenceSupplier: string;
  referenceQuotation: string;
  sortOrder: number;
}

export interface ProjectEstimateDraftForm {
  id?: string;
  projectId: string;
  projectName: string;
  projectType: BudgetProjectType | "";
  location: string;
  ownerName: string;
  draftedDate: string;
  costEstimate: number;
  notes: string;
  items: ProjectEstimateDraftLine[];
}

export interface EstimateItemModalForm {
  id?: string;
  displayName: string;
  notes: string;
  materials: EstimateItemModalMaterialForm[];
}

export interface EstimateItemModalMaterialForm {
  id: string;
  saved: boolean;
  searchInput: string;
  catalogItemId: string;
  materialId: string;
  materialName: string;
  unitType: string;
  rawCostLabel: string;
  unitCostInput: string;
  quantityInput: string;
  pricingBasis: "catalog" | "supplier_quote";
  referenceSupplier: string;
  referenceQuotation: string;
}

export const EMPTY_ESTIMATE_FORM: ProjectEstimateDraftForm = {
  projectId: "",
  projectName: "",
  projectType: "",
  location: "",
  ownerName: "",
  draftedDate: "",
  costEstimate: 0,
  notes: "",
  items: [],
};

export interface AssignedEstimateProject {
  id: string;
  name: string;
  location: string;
  clientName: string | null;
  subject: string | null;
  lead: string | null;
  budgetCeiling: number;
}

export const EMPTY_ESTIMATE_ITEM_MODAL_FORM: EstimateItemModalForm = {
  displayName: "",
  notes: "",
  materials: [],
};

export const ESTIMATE_STATUS_OPTIONS: Array<{
  value: EstimateStatus;
  label: string;
}> = [
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Returned" },
];
