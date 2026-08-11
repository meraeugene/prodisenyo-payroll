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
  section: string;
  itemNumber: string;
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
  section: string;
  itemNumber: string;
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

export interface CostEstimatorItemModalProps {
  open: boolean;
  form: EstimateItemModalForm;
  errors: {
    section?: string;
    itemNumber?: string;
    displayName?: string;
    materialRows: Record<
      string,
      Partial<Record<"searchInput" | "unitType" | "quantityInput", string>>
    >;
  };
  editingMaterialSnapshots: Record<string, EstimateItemModalMaterialForm>;
  pendingMaterialRowId: string | null;
  materials: MaterialOptionGroup[];
  computedTotal: number;
  baseEstimateTotal: number;
  budgetCeiling: number | null;
  itemNumberLabel: string;
  editing: boolean;
  readOnly?: boolean;
  pending: boolean;
  onClose: () => void;
  onSelectMaterial: (materialRowId: string, materialId: string) => void;
  onSelectUnitType: (materialRowId: string, catalogItemId: string) => void;
  onFieldChange: (
    field: Exclude<keyof EstimateItemModalForm, "materials" | "id">,
    value: string,
  ) => void;
  onMaterialRowFieldChange: (
    materialRowId: string,
    field:
      | "searchInput"
      | "unitType"
      | "unitCostInput"
      | "quantityInput"
      | "pricingBasis"
      | "referenceSupplier"
      | "referenceQuotation",
    value: string,
  ) => void;
  onAddMaterial: () => void;
  onSaveMaterial: (materialRowId: string) => void;
  onEditMaterial: (materialRowId: string) => void;
  onCancelMaterial: (materialRowId: string) => void;
  onRemoveMaterial: (materialRowId: string) => void;
  onSave: () => void;
  onDelete: () => void;
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
  section: "",
  itemNumber: "",
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
