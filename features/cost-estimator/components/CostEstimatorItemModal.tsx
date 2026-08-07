"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, LoaderCircle, X } from "lucide-react";
import {
  formatBudgetMoney,
  formatBudgetNumberForInput,
  parseBudgetNumberInput,
  sanitizeBudgetNumericInput,
} from "@/features/cost-estimator/utils/costEstimatorFormatters";
import type {
  EstimateItemModalForm,
  EstimateItemModalMaterialForm,
  MaterialOptionGroup,
} from "@/features/cost-estimator/types";

export default function CostEstimatorItemModal({
  open,
  form,
  errors,
  editingMaterialSnapshots,
  pendingMaterialRowId,
  materials,
  computedTotal,
  editing,
  readOnly,
  pending,
  onClose,
  onSelectMaterial,
  onSelectUnitType,
  onFieldChange,
  onMaterialRowFieldChange,
  onAddMaterial,
  onSaveMaterial,
  onEditMaterial,
  onCancelMaterial,
  onRemoveMaterial,
  onSave,
  onDelete,
}: {
  open: boolean;
  form: EstimateItemModalForm;
  errors: {
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
    field: "searchInput" | "unitType" | "unitCostInput" | "quantityInput" | "pricingBasis" | "referenceSupplier" | "referenceQuotation",
    value: string,
  ) => void;
  onAddMaterial: () => void;
  onSaveMaterial: (materialRowId: string) => void;
  onEditMaterial: (materialRowId: string) => void;
  onCancelMaterial: (materialRowId: string) => void;
  onRemoveMaterial: (materialRowId: string) => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const [openMaterialMenuId, setOpenMaterialMenuId] = useState<string | null>(
    null,
  );
  const [openUnitMenuId, setOpenUnitMenuId] = useState<string | null>(null);
  const [animatedMaterialIds, setAnimatedMaterialIds] = useState<string[]>([]);
  const [removingMaterialIds, setRemovingMaterialIds] = useState<string[]>([]);
  const previousReceiptMaterialIdsRef = useRef<string[]>([]);

  const materialsById = useMemo(
    () => new Map(materials.map((material) => [material.materialId, material])),
    [materials],
  );
  const allUnitOptions = useMemo(() => {
    const seen = new Set<string>();

    return materials
      .flatMap((material) => material.units)
      .filter((unit) => {
        const key = unit.unitType.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((left, right) => left.unitType.localeCompare(right.unitType));
  }, [materials]);

  const savedMaterials = form.materials.filter((material) => material.saved);
  const editingMaterials = form.materials.filter((material) => !material.saved);
  const activeEditingMaterial = editingMaterials[0] ?? null;
  const receiptMaterials = form.materials.filter((material) => {
    const snapshot = editingMaterialSnapshots[material.id];
    const previewName =
      material.materialName ||
      material.searchInput ||
      snapshot?.materialName ||
      snapshot?.searchInput ||
      "";
    const previewUnit = material.unitType || snapshot?.unitType || "";
    const previewCost = parseBudgetNumberInput(
      material.unitCostInput || snapshot?.unitCostInput || "0",
    );

    if (material.saved) {
      return true;
    }

    if (material.id !== activeEditingMaterial?.id) {
      return false;
    }

    if (!snapshot) {
      return false;
    }

    return Boolean(previewName.trim() || previewUnit.trim() || previewCost > 0);
  });
  const isReadOnly = Boolean(readOnly);

  useEffect(() => {
    const previousIds = previousReceiptMaterialIdsRef.current;
    const currentIds = receiptMaterials.map((material) => material.id);
    const addedIds = currentIds.filter((id) => !previousIds.includes(id));

    if (addedIds.length > 0) {
      setAnimatedMaterialIds((current) => [
        ...new Set([...current, ...addedIds]),
      ]);

      const timeout = window.setTimeout(() => {
        setAnimatedMaterialIds((current) =>
          current.filter((id) => !addedIds.includes(id)),
        );
      }, 260);

      previousReceiptMaterialIdsRef.current = currentIds;

      return () => window.clearTimeout(timeout);
    }

    previousReceiptMaterialIdsRef.current = currentIds;
  }, [receiptMaterials]);

  function handleAnimatedRemoveMaterial(materialRowId: string) {
    setRemovingMaterialIds((current) =>
      current.includes(materialRowId) ? current : [...current, materialRowId],
    );

    window.setTimeout(() => {
      onRemoveMaterial(materialRowId);
      setRemovingMaterialIds((current) =>
        current.filter((id) => id !== materialRowId),
      );
      setAnimatedMaterialIds((current) =>
        current.filter((id) => id !== materialRowId),
      );
    }, 180);
  }

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative flex h-[100dvh] w-full max-w-none flex-col overflow-hidden sm:rounded-t-2xl border-0 bg-[#f8fbf8] shadow-none sm:h-[min(94vh,750px)] sm:max-w-[1280px] sm:rounded-[28px] sm:border sm:border-apple-mist sm:shadow-[0_28px_90px_rgba(15,23,42,0.24)]">
        <div className="sticky top-0 z-20 flex items-start justify-between border-b border-apple-mist bg-white px-4 py-3 sm:px-6 sm:py-4 rounded-t-2xl sm:rounded-t-[28px]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-apple-steel">
              Engineer Cost
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-apple-charcoal">
              {isReadOnly
                ? "View Item Cost"
                : editing
                  ? "Edit Item Cost"
                  : "Add Item Cost"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-apple-mist text-apple-smoke transition hover:bg-apple-mist/40"
          >
            <X size={18} />
          </button>
        </div>

        <div
          className={
            isReadOnly
              ? "flex flex-col min-h-0 flex-1 overflow-y-auto"
              : "flex flex-col min-h-0 flex-1 overflow-y-auto xl:h-full xl:grid xl:grid-cols-[320px_minmax(0,1fr)_380px]"
          }
        >
          {isReadOnly ? null : (
            <section className="flex flex-col border-b border-apple-mist bg-[rgb(var(--apple-snow))] px-3 py-3 sm:px-6 sm:py-5 xl:min-h-0 xl:h-full xl:border-b-0 xl:border-r">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-apple-steel">
                Cost details
              </p>
              <label className="mt-4 mb-2 block text-sm font-semibold text-apple-charcoal">
                Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={form.displayName}
                onChange={(event) =>
                  onFieldChange("displayName", event.target.value)
                }
                placeholder="e.g. Tiles, kitchen cabinets, window glass set"
                disabled={isReadOnly}
                rows={5}
                className={`min-h-[130px] w-full resize-none rounded-[12px] border bg-[rgb(var(--apple-snow))] px-4 py-3 text-sm leading-6 outline-none focus:border-[#1f6a37] ${
                  errors.displayName ? "border-rose-300" : "border-apple-mist"
                }`}
              />
              {errors.displayName ? (
                <p className="mt-2 text-sm text-rose-600">
                  {errors.displayName}
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                  {savedMaterials.length} saved
                </span>
                <span className="inline-flex items-center rounded-full border border-apple-mist bg-white px-3 py-1 text-xs font-semibold text-apple-steel">
                  {editingMaterials.length} in progress
                </span>
              </div>
            </section>
          )}

          <section
            className={
              isReadOnly
                ? "flex flex-col bg-white px-3 py-4 sm:px-4 xl:min-h-0 xl:h-full"
                : "flex flex-col border-b border-apple-mist bg-white px-3 py-4 sm:px-4 xl:min-h-0 xl:h-full xl:border-b-0 xl:border-r"
            }
          >
            {isReadOnly ? (
              <div className="flex h-full min-h-0 flex-col rounded-[22px] border border-apple-mist bg-white p-4 shadow-[0_10px_30px_rgba(24,83,43,0.06)]">
                {(() => {
                  const totalQuantity = form.materials.reduce(
                    (sum, material) =>
                      sum +
                      parseBudgetNumberInput(material.quantityInput || "0"),
                    0,
                  );

                  return (
                    <>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-apple-steel">
                          Item materials
                        </p>
                        <div className="mt-3 rounded-[16px] border border-apple-mist bg-[rgb(var(--apple-snow))] px-4 py-4">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-apple-steel">
                              Description
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-base font-semibold leading-7 text-apple-charcoal">
                              {form.displayName || "Item description"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 min-h-0 flex-1 rounded-[16px] border border-apple-mist">
                        <div className="hidden grid-cols-[minmax(180px,1.4fr)_90px_90px_120px] gap-2 border-b border-apple-mist bg-[rgb(var(--apple-snow))] px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-apple-steel sm:grid">
                          <span>Description</span>
                          <span>Unit</span>
                          <span>Qty</span>
                          <span>Unit cost</span>
                        </div>

                        <div className="divide-y divide-apple-mist">
                          {form.materials.map((material) => {
                            const quantityValue = parseBudgetNumberInput(
                              material.quantityInput || "0",
                            );
                            const unitCostValue = parseBudgetNumberInput(
                              material.unitCostInput || "0",
                            );

                            return (
                              <div key={material.id}>
                                <div className="hidden grid-cols-[minmax(180px,1.4fr)_90px_90px_120px] gap-2 px-3 py-2.5 text-sm text-apple-charcoal sm:grid">
                                  <div className="min-w-0">
                                    <p className="truncate font-semibold">
                                      {material.materialName ||
                                        material.searchInput ||
                                        "Material"}
                                    </p>
                                  </div>
                                  <span>{material.unitType || "-"}</span>
                                  <span>{quantityValue || 0}</span>
                                  <span>
                                    {formatBudgetMoney(unitCostValue)}
                                  </span>
                                </div>

                                <div className="space-y-2 px-3 py-3 text-sm sm:hidden">
                                  <p className="break-words font-semibold text-apple-charcoal">
                                    {material.materialName ||
                                      material.searchInput ||
                                      "Material"}
                                  </p>
                                  <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div>
                                      <p className="font-semibold uppercase tracking-[0.14em] text-apple-steel">
                                        Unit
                                      </p>
                                      <p className="mt-1 text-sm text-apple-charcoal">
                                        {material.unitType || "-"}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="font-semibold uppercase tracking-[0.14em] text-apple-steel">
                                        Qty
                                      </p>
                                      <p className="mt-1 text-sm text-apple-charcoal">
                                        {quantityValue || 0}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="font-semibold uppercase tracking-[0.14em] text-apple-steel">
                                        Unit cost
                                      </p>
                                      <p className="mt-1 text-sm text-apple-charcoal">
                                        {formatBudgetMoney(unitCostValue)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 rounded-[16px] border border-emerald-100 bg-emerald-50 px-4 py-3 sm:grid-cols-2">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
                            Total quantity
                          </p>
                          <p className="mt-2 text-lg font-semibold text-emerald-900">
                            {totalQuantity.toLocaleString("en-PH", {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                        </div>
                        <div className="sm:text-right">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
                            Total estimate
                          </p>
                          <p className="mt-2 text-lg font-semibold text-emerald-900">
                            {formatBudgetMoney(computedTotal)}
                          </p>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : activeEditingMaterial ? (
              (() => {
                const materialRow = activeEditingMaterial;
                const selectedMaterial =
                  materialsById.get(materialRow.materialId) ?? null;
                const materialNumber =
                  form.materials.findIndex(
                    (entry) => entry.id === materialRow.id,
                  ) + 1;
                const filteredMaterials = materials.filter((material) => {
                  const query = materialRow.searchInput.trim().toLowerCase();
                  if (!query) return true;
                  return material.searchText.includes(query);
                });
                const materialTotal =
                  parseBudgetNumberInput(materialRow.unitCostInput || "0") *
                  parseBudgetNumberInput(materialRow.quantityInput || "0");
                const savingThisMaterial =
                  pendingMaterialRowId === materialRow.id;
                const rowErrors = errors.materialRows[materialRow.id] ?? {};

                return (
                  <div className="flex w-full flex-col bg-white  xl:h-full xl:min-h-0">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-apple-steel">
                        Material {materialNumber}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-apple-charcoal">
                        {materialRow.materialName ||
                          materialRow.searchInput ||
                          "New Material"}
                      </h3>
                    </div>

                    <div className="mt-4 flex flex-col gap-4 xl:min-h-0 xl:flex-1">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-apple-charcoal">
                          Material Name <span className="text-rose-500">*</span>
                          <span className="ml-2 text-xs font-medium text-apple-steel">
                            Editable
                          </span>
                        </label>
                        <div className="relative">
                          <input
                            value={materialRow.searchInput}
                            onFocus={() =>
                              setOpenMaterialMenuId(materialRow.id)
                            }
                            onChange={(event) => {
                              const value = event.target.value;
                              onMaterialRowFieldChange(
                                materialRow.id,
                                "searchInput",
                                value,
                              );
                              setOpenMaterialMenuId(materialRow.id);
                              const matchedMaterial = materials.find(
                                (material) =>
                                  material.materialName.toLowerCase() ===
                                  value.trim().toLowerCase(),
                              );
                              if (matchedMaterial) {
                                onSelectMaterial(
                                  materialRow.id,
                                  matchedMaterial.materialId,
                                );
                              }
                            }}
                            onBlur={() => {
                              window.setTimeout(() => {
                                setOpenMaterialMenuId((current) =>
                                  current === materialRow.id ? null : current,
                                );
                              }, 120);
                            }}
                            placeholder="Search existing material or type a new one"
                            disabled={isReadOnly}
                            className={`w-full rounded-[12px] border bg-[rgb(var(--apple-snow))] px-4 py-3 pr-10 text-sm outline-none focus:border-[#1f6a37] ${
                              rowErrors.searchInput
                                ? "border-rose-300"
                                : "border-apple-mist"
                            }`}
                          />
                          {materialRow.searchInput ? (
                            <button
                              type="button"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                onMaterialRowFieldChange(
                                  materialRow.id,
                                  "searchInput",
                                  "",
                                );
                                setOpenMaterialMenuId(null);
                              }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-apple-steel transition hover:text-apple-charcoal"
                              aria-label="Clear material name"
                            >
                              <X size={14} />
                            </button>
                          ) : null}

                          {openMaterialMenuId === materialRow.id &&
                          filteredMaterials.length > 0 ? (
                            <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 max-h-72 overflow-y-auto rounded-[14px] border border-apple-mist bg-white shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
                              {filteredMaterials.map((material, index) => {
                                const materialCost =
                                  material.units[0]?.unitCost ?? 0;
                                return (
                                  <button
                                    key={`${material.materialId}:${material.materialName}:${index}`}
                                    type="button"
                                    onMouseDown={(event) => {
                                      event.preventDefault();
                                      onSelectMaterial(
                                        materialRow.id,
                                        material.materialId,
                                      );
                                      setOpenMaterialMenuId(null);
                                    }}
                                    className="flex w-full items-center justify-between gap-4 border-b border-apple-mist px-4 py-3 text-left text-sm transition last:border-b-0 hover:bg-emerald-50"
                                  >
                                    <span className="min-w-0 flex-1 truncate font-medium text-apple-charcoal">
                                      {material.materialName}
                                    </span>
                                    <span className="shrink-0 font-semibold text-[#1f6a37]">
                                      {formatBudgetMoney(materialCost)}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                        {rowErrors.searchInput ? (
                          <p className="mt-2 text-sm text-rose-600">
                            {rowErrors.searchInput}
                          </p>
                        ) : null}
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-apple-charcoal">
                          Unit Type <span className="text-rose-500">*</span>
                          <span className="ml-2 text-xs font-medium text-apple-steel">
                            Editable
                          </span>
                        </label>
                        <div
                          className="relative"
                          onBlur={() => {
                            window.setTimeout(() => {
                              setOpenUnitMenuId((current) =>
                                current === materialRow.id ? null : current,
                              );
                            }, 120);
                          }}
                        >
                          <input
                            value={materialRow.unitType}
                            onFocus={() => setOpenUnitMenuId(materialRow.id)}
                            onChange={(event) => {
                              onMaterialRowFieldChange(
                                materialRow.id,
                                "unitType",
                                event.target.value,
                              );
                              setOpenUnitMenuId(materialRow.id);
                            }}
                            placeholder="Select or type a unit"
                            disabled={isReadOnly}
                            className={`w-full rounded-[12px] border bg-[rgb(var(--apple-snow))] px-4 py-3 pr-10 text-sm outline-none transition focus:border-[#1f6a37] ${
                              rowErrors.unitType
                                ? "border-rose-300"
                                : "border-apple-mist"
                            }`}
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            onMouseDown={(event) => {
                              event.preventDefault();
                              setOpenUnitMenuId((current) =>
                                current === materialRow.id
                                  ? null
                                  : materialRow.id,
                              );
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-apple-steel"
                          >
                            <ChevronDown size={16} />
                          </button>

                          {openUnitMenuId === materialRow.id ? (
                            <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 max-h-64 overflow-y-auto rounded-[14px] border border-apple-mist bg-white shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
                              {(selectedMaterial?.units ?? allUnitOptions)
                                .filter((unit) =>
                                  !materialRow.unitType.trim()
                                    ? true
                                    : unit.unitType
                                        .toLowerCase()
                                        .includes(
                                          materialRow.unitType.toLowerCase(),
                                        ),
                                )
                                .map((unit) => (
                                  <button
                                    key={unit.optionId}
                                    type="button"
                                    onMouseDown={(event) => {
                                      event.preventDefault();
                                      onSelectUnitType(
                                        materialRow.id,
                                        unit.catalogItemId,
                                      );
                                      setOpenUnitMenuId(null);
                                    }}
                                    className="flex w-full items-center justify-between gap-4 border-b border-apple-mist px-4 py-3 text-left text-sm transition last:border-b-0 hover:bg-emerald-50"
                                  >
                                    <span className="font-medium text-apple-charcoal">
                                      {unit.unitType}
                                    </span>
                                  </button>
                                ))}
                            </div>
                          ) : null}
                        </div>
                        {rowErrors.unitType ? (
                          <p className="mt-2 text-sm text-rose-600">
                            {rowErrors.unitType}
                          </p>
                        ) : null}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-apple-charcoal">
                            Unit Cost
                          </label>
                          <div className="relative">
                            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-apple-steel">
                              P
                            </span>
                            <input
                              value={formatBudgetNumberForInput(
                                parseBudgetNumberInput(
                                  materialRow.unitCostInput,
                                ),
                              )}
                              onChange={(event) =>
                                onMaterialRowFieldChange(
                                  materialRow.id,
                                  "unitCostInput",
                                  event.target.value,
                                )
                              }
                              placeholder="0"
                              inputMode="decimal"
                              disabled={isReadOnly}
                              className="w-full rounded-[12px] border border-apple-mist bg-[rgb(var(--apple-snow))] px-9 py-3 text-sm outline-none focus:border-[#1f6a37]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-apple-charcoal">
                            Quantity <span className="text-rose-500">*</span>
                          </label>
                          <input
                            value={materialRow.quantityInput}
                            onChange={(event) =>
                              onMaterialRowFieldChange(
                                materialRow.id,
                                "quantityInput",
                                event.target.value,
                              )
                            }
                            placeholder="1"
                            inputMode="decimal"
                            disabled={isReadOnly}
                            className={`w-full rounded-[12px] border bg-[rgb(var(--apple-snow))] px-4 py-3 text-sm outline-none focus:border-[#1f6a37] ${
                              rowErrors.quantityInput
                                ? "border-rose-300"
                                : "border-apple-mist"
                            }`}
                          />
                          {rowErrors.quantityInput ? (
                            <p className="mt-2 text-sm text-rose-600">
                              {rowErrors.quantityInput}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="rounded-[16px] border border-slate-200 bg-slate-50 p-4">
                        <label className="block text-sm font-semibold text-apple-charcoal">
                          Pricing basis
                          <select
                            value={materialRow.pricingBasis}
                            onChange={(event) =>
                              onMaterialRowFieldChange(
                                materialRow.id,
                                "pricingBasis",
                                event.target.value,
                              )
                            }
                            className="mt-2 h-11 w-full rounded-xl border border-apple-mist bg-white px-3 text-sm outline-none focus:border-[#1f6a37]"
                          >
                            <option value="catalog">Catalog / reference rate</option>
                            <option value="supplier_quote">Supplier quotation</option>
                          </select>
                        </label>
                        {materialRow.pricingBasis === "supplier_quote" ? (
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <label className="text-sm font-semibold text-apple-charcoal">
                              Reference supplier <span className="text-rose-500">*</span>
                              <input
                                value={materialRow.referenceSupplier}
                                onChange={(event) =>
                                  onMaterialRowFieldChange(
                                    materialRow.id,
                                    "referenceSupplier",
                                    event.target.value,
                                  )
                                }
                                className="mt-2 h-11 w-full rounded-xl border border-apple-mist bg-white px-3 text-sm outline-none focus:border-[#1f6a37]"
                              />
                            </label>
                            <label className="text-sm font-semibold text-apple-charcoal">
                              Quotation reference <span className="text-rose-500">*</span>
                              <input
                                value={materialRow.referenceQuotation}
                                onChange={(event) =>
                                  onMaterialRowFieldChange(
                                    materialRow.id,
                                    "referenceQuotation",
                                    event.target.value,
                                  )
                                }
                                placeholder="Quote number or document reference"
                                className="mt-2 h-11 w-full rounded-xl border border-apple-mist bg-white px-3 text-sm outline-none focus:border-[#1f6a37]"
                              />
                            </label>
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-slate-500">
                            This rate is a planning reference. The purchaser records the final supplier quotation later.
                          </p>
                        )}
                      </div>

                      <div className="mt-1 flex items-center justify-between gap-3 rounded-[16px] border border-emerald-100 bg-emerald-50 px-4 py-3 xl:mt-auto">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
                            Material total
                          </p>
                          <p className="mt-2 text-xl font-semibold text-emerald-900">
                            {formatBudgetMoney(materialTotal)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {editingMaterialSnapshots[materialRow.id] ? (
                            <button
                              type="button"
                              onClick={() => onCancelMaterial(materialRow.id)}
                              disabled={isReadOnly || savingThisMaterial}
                              className="inline-flex items-center gap-2 rounded-[12px] border border-apple-mist bg-white px-4 py-3 text-sm font-semibold text-apple-charcoal transition hover:bg-apple-mist/40 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Cancel
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => onSaveMaterial(materialRow.id)}
                            disabled={isReadOnly || savingThisMaterial}
                            className="inline-flex items-center gap-2 rounded-[12px] bg-[#1f6a37] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#18552d]"
                          >
                            {savingThisMaterial ? (
                              <>
                                <LoaderCircle
                                  size={15}
                                  className="animate-spin"
                                />
                                Saving...
                              </>
                            ) : editingMaterialSnapshots[materialRow.id] ? (
                              "Save"
                            ) : (
                              "Add Material"
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="flex min-h-[280px] flex-1 items-center justify-center rounded-[20px] border border-dashed border-apple-mist bg-white px-4 text-center">
                <p className="text-base font-semibold text-apple-charcoal">
                  Add a material to begin
                </p>
              </div>
            )}
          </section>

          {isReadOnly ? null : (
            <aside className="flex flex-col bg-emerald-50 xl:min-h-0 xl:h-full">
              <div className="flex flex-1 flex-col px-4 py-4 xl:min-h-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
                  Total estimate
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-emerald-900">
                  {formatBudgetMoney(computedTotal)}
                </p>
                <p className="mt-2 text-sm font-medium text-emerald-900/75">
                  Total materials: {receiptMaterials.length}
                </p>

                <div className="mt-4 border-t border-emerald-200/70 pt-4 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-4">
                  {receiptMaterials.length === 0 ? (
                    <p className="text-sm text-emerald-900/75">
                      No saved materials yet.
                    </p>
                  ) : (
                    <div className="space-y-3 pb-4">
                      {receiptMaterials.map((material) => {
                        const snapshot = editingMaterialSnapshots[material.id];
                        const materialTotal =
                          parseBudgetNumberInput(
                            material.unitCostInput ||
                              snapshot?.unitCostInput ||
                              "0",
                          ) *
                          parseBudgetNumberInput(
                            material.quantityInput ||
                              snapshot?.quantityInput ||
                              "0",
                          );
                        const materialName =
                          material.materialName ||
                          material.searchInput ||
                          snapshot?.materialName ||
                          snapshot?.searchInput ||
                          "Material";
                        const unitLabel =
                          material.unitType || snapshot?.unitType || "No unit";
                        const quantityLabel =
                          material.quantityInput ||
                          snapshot?.quantityInput ||
                          "0";
                        const isEditingMaterial =
                          activeEditingMaterial?.id === material.id;
                        const isAnimatingIn = animatedMaterialIds.includes(
                          material.id,
                        );
                        const isRemoving = removingMaterialIds.includes(
                          material.id,
                        );

                        return (
                          <div
                            key={material.id}
                            className={`w-full rounded-[12px] border-b border-emerald-200/70 bg-white px-2 py-2 pb-4 text-left transition-[transform,opacity] duration-200 last:border-b-0 last:pb-2 ${
                              isAnimatingIn
                                ? "animate-[materialRowIn_220ms_ease-out]"
                                : ""
                            } ${
                              isRemoving
                                ? "translate-y-1 opacity-0"
                                : "translate-y-0 opacity-100"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-apple-charcoal">
                                  {materialName}
                                </p>
                                <p className="mt-1 text-xs text-apple-steel">
                                  {unitLabel} | {quantityLabel}
                                </p>
                              </div>
                              <p className="shrink-0 text-sm font-semibold text-[#1f6a37]">
                                {formatBudgetMoney(materialTotal)}
                              </p>
                            </div>

                            <div className="mt-3 flex items-center justify-end gap-2 pb-1">
                              {isEditingMaterial ? (
                                <>
                                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                    Editing
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onRemoveMaterial(material.id)
                                    }
                                    className="inline-flex items-center rounded-full border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-50"
                                  >
                                    Remove
                                  </button>
                                </>
                              ) : material.saved ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => onEditMaterial(material.id)}
                                    className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-800 transition hover:bg-emerald-50"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleAnimatedRemoveMaterial(material.id)
                                    }
                                    className="inline-flex items-center rounded-full border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-50"
                                  >
                                    Remove
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </aside>
          )}
        </div>

        <div
          className="z-20 shrink-0 border-t border-apple-mist bg-white px-4 pt-3 sm:py-3"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)",
          }}
        >
          <div className="flex flex-col justify-end gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="inline-flex items-center justify-center rounded-[12px] border border-apple-mist px-4 py-3 text-sm font-semibold text-apple-charcoal transition hover:bg-apple-mist/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            {!isReadOnly ? (
              <>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={pending}
                  className="inline-flex items-center justify-center rounded-[12px] bg-[#1f6a37] px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pending
                    ? editing
                      ? "Saving changes..."
                      : "Adding item..."
                    : editing
                      ? "Save"
                      : "Save"}
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes materialRowIn {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>,
    document.body,
  );
}
