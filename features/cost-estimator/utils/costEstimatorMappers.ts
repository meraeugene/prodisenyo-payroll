import {
  EMPTY_ESTIMATE_FORM,
  EMPTY_ESTIMATE_ITEM_MODAL_FORM,
  type EstimateItemModalForm,
  type EstimateItemModalMaterialForm,
  type MaterialOptionGroup,
  type ProjectEstimateDraftForm,
  type ProjectEstimateItemRow,
  type ProjectEstimateRow,
} from "@/features/cost-estimator/types";
import {
  buildMaterialIdFromName,
  normalizeMaterialOptions,
} from "@/features/cost-estimator/utils/materialSourceAdapter";

export function buildEstimateItemsMap(items: ProjectEstimateItemRow[]) {
  return items.reduce<Record<string, ProjectEstimateItemRow[]>>((accumulator, item) => {
    const current = accumulator[item.estimate_id] ?? [];
    current.push(item);
    accumulator[item.estimate_id] = current;
    return accumulator;
  }, {});
}

export function sortEstimatesByUpdatedAt(estimates: ProjectEstimateRow[]) {
  return [...estimates].sort(
    (left, right) =>
      new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
  );
}

export function buildEstimateDraftForm(
  estimate: ProjectEstimateRow | null,
  items: ProjectEstimateItemRow[],
): ProjectEstimateDraftForm {
  if (!estimate) {
    return {
      ...EMPTY_ESTIMATE_FORM,
      draftedDate: new Date().toISOString(),
    };
  }

  return {
    id: estimate.id,
    projectId: estimate.project_id ?? "",
    projectName: estimate.project_name,
    projectType: estimate.project_type ?? "",
    location:
      estimate.location?.trim() &&
      estimate.location.trim().toLowerCase() !== "philippine peso (php)" &&
      estimate.location.trim().toLowerCase() !== "php"
        ? estimate.location
        : "",
    ownerName: estimate.owner_name ?? "",
    draftedDate: estimate.created_at,
    costEstimate: estimate.estimate_total ?? 0,
    notes: estimate.notes ?? "",
    items: items.map((item, index) => ({
      id: item.id,
      catalogItemId: item.catalog_item_id ?? "",
      materialId: buildMaterialIdFromName(item.material_name_snapshot ?? ""),
      materialName: item.material_name_snapshot ?? "",
      unitType: item.unit_label_snapshot ?? "",
      unitCost: item.unit_cost_snapshot ?? 0,
      quantity: item.quantity ?? 0,
      lineTotal: item.line_total ?? 0,
      section: item.boq_section ?? "General Works",
      itemNumber: item.boq_item_number ?? String(index + 1),
      displayName: item.item_name_snapshot ?? "",
      notes: item.notes ?? "",
      pricingBasis: item.pricing_basis ?? "catalog",
      referenceSupplier: item.reference_supplier ?? "",
      referenceQuotation: item.reference_quotation ?? "",
      sortOrder: item.sort_order ?? index,
    })),
  };
}

export function buildEstimateItemModalForm(
  item: ProjectEstimateDraftForm["items"][number] | null,
): EstimateItemModalForm {
  if (!item) {
    return EMPTY_ESTIMATE_ITEM_MODAL_FORM;
  }

  return {
    id: item.id,
    section: item.section,
    itemNumber: item.itemNumber,
    displayName: item.displayName,
    notes: item.notes,
    materials: [
      {
        id: item.id ?? crypto.randomUUID(),
        saved: true,
        searchInput: item.materialName,
        catalogItemId: item.catalogItemId,
        materialId: item.materialId,
        materialName: item.materialName,
        unitType: item.unitType,
        rawCostLabel: item.unitCost ? item.unitCost.toString() : "N/A",
        unitCostInput: item.unitCost ? item.unitCost.toString() : "",
        quantityInput: item.quantity ? item.quantity.toString() : "",
        pricingBasis: item.pricingBasis,
        referenceSupplier: item.referenceSupplier,
        referenceQuotation: item.referenceQuotation,
      },
    ],
  };
}

export function buildEstimateItemModalFormFromItems(
  items: Array<ProjectEstimateDraftForm["items"][number]>,
): EstimateItemModalForm {
  if (items.length === 0) {
    return EMPTY_ESTIMATE_ITEM_MODAL_FORM;
  }

  const baseItem = items[0];

  return {
    id: baseItem.id,
    section: baseItem.section,
    itemNumber: baseItem.itemNumber,
    displayName: baseItem.displayName,
    notes: baseItem.notes,
    materials: items.map((item) => ({
      id: item.id ?? crypto.randomUUID(),
      saved: true,
      searchInput: item.materialName,
      catalogItemId: item.catalogItemId,
      materialId: item.materialId,
      materialName: item.materialName,
      unitType: item.unitType,
      rawCostLabel: item.unitCost ? item.unitCost.toString() : "N/A",
      unitCostInput: item.unitCost ? item.unitCost.toString() : "",
      quantityInput: item.quantity ? item.quantity.toString() : "",
      pricingBasis: item.pricingBasis,
      referenceSupplier: item.referenceSupplier,
      referenceQuotation: item.referenceQuotation,
    })),
  };
}

export function ensureEstimateLineTotals(form: ProjectEstimateDraftForm) {
  return {
    ...form,
    items: form.items.map((item) => ({
      ...item,
      lineTotal: Math.round(item.unitCost * item.quantity * 100) / 100,
    })),
  };
}

export function resolveInitialItemModalMaterialState(
  materialId: string,
  catalogItemId: string,
  materials: Parameters<typeof normalizeMaterialOptions>[0],
) {
  const normalizedMaterials = normalizeMaterialOptions(materials);
  const material =
    normalizedMaterials.find((entry) => entry.materialId === materialId) ??
    normalizedMaterials[0] ??
    null;

  const unit =
    material?.units.find((entry) => entry.catalogItemId === catalogItemId) ??
    material?.units[0] ??
    null;

  return {
    material,
    unit,
  };
}

export function buildInitialModalMaterial(
  materials: MaterialOptionGroup[],
): EstimateItemModalMaterialForm {
  return {
    id: crypto.randomUUID(),
    saved: false,
    searchInput: "",
    catalogItemId: "",
    materialId: "",
    materialName: "",
    unitType: "",
    rawCostLabel: "N/A",
    unitCostInput: "",
    quantityInput: "1",
    pricingBasis: "catalog",
    referenceSupplier: "",
    referenceQuotation: "",
  };
}
