"use client";

import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatBudgetMoney,
  formatBudgetNumberForInput,
  parseBudgetNumberInput,
} from "@/features/cost-estimator/utils/costEstimatorFormatters";
import type {
  CostEstimatorItemModalProps,
  EstimateItemModalMaterialForm,
} from "@/features/cost-estimator/types";

type Props = Pick<
  CostEstimatorItemModalProps,
  | "form"
  | "errors"
  | "materials"
  | "itemNumberLabel"
  | "readOnly"
  | "pending"
  | "onFieldChange"
  | "onSelectMaterial"
  | "onSelectUnitType"
  | "onMaterialRowFieldChange"
  | "onAddMaterial"
  | "onRemoveMaterial"
>;

export default function CostEstimatorItemFields(props: Props) {
  const disabled = Boolean(props.readOnly || props.pending);
  const allUnits = Array.from(
    new Map(
      props.materials
        .flatMap((material) => material.units)
        .map((unit) => [unit.unitType.toLowerCase(), unit]),
    ).values(),
  ).sort((left, right) => left.unitType.localeCompare(right.unitType));
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_190px]">
        <label className="block text-sm font-semibold text-slate-800">
          Section / Category <span className="text-rose-500">*</span>
          <input
            list="boq-section-options"
            value={props.form.section}
            onChange={(event) =>
              props.onFieldChange("section", event.target.value)
            }
            disabled={disabled}
            placeholder="e.g. Structural Works"
            className={cn(
              "mt-2 h-11 w-full rounded-[9px] border bg-white px-3 text-sm font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100",
              props.errors.section ? "border-rose-300" : "border-slate-200",
            )}
          />
          <datalist id="boq-section-options">
            <option value="General Requirements" />
            <option value="Site Works" />
            <option value="Structural Works" />
            <option value="Architectural / Finishing" />
            <option value="Mechanical Works" />
            <option value="Electrical Works" />
            <option value="Plumbing Works" />
          </datalist>
          {props.errors.section ? (
            <span className="mt-1 block text-xs font-medium text-rose-600">
              {props.errors.section}
            </span>
          ) : null}
        </label>
        <label className="block text-sm font-semibold text-slate-800">
          Item No. <span className="text-rose-500">*</span>
          <input
            value={props.form.itemNumber}
            onChange={(event) =>
              props.onFieldChange("itemNumber", event.target.value)
            }
            disabled={disabled}
            placeholder={props.itemNumberLabel}
            className={cn(
              "mt-2 h-11 w-full rounded-[9px] border bg-white px-3 text-sm font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100",
              props.errors.itemNumber
                ? "border-rose-300"
                : "border-slate-200",
            )}
          />
          {props.errors.itemNumber ? (
            <span className="mt-1 block text-xs font-medium text-rose-600">
              {props.errors.itemNumber}
            </span>
          ) : null}
        </label>
      </div>

      <label className="block text-sm font-semibold text-slate-800">
        Description <span className="text-rose-500">*</span>
        <input
          value={props.form.displayName}
          onChange={(event) =>
            props.onFieldChange("displayName", event.target.value)
          }
          disabled={disabled}
          placeholder="Describe this BOQ item"
          className={cn(
            "mt-2 h-11 w-full rounded-[9px] border bg-white px-3 text-sm font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100",
            props.errors.displayName ? "border-rose-300" : "border-slate-200",
          )}
        />
        {props.errors.displayName ? (
          <span className="mt-1 block text-xs font-medium text-rose-600">
            {props.errors.displayName}
          </span>
        ) : null}
      </label>

      <div className="space-y-4">
        {props.form.materials.map((material, index) => (
          <MaterialFields
            key={material.id}
            material={material}
            index={index}
            canRemove={props.form.materials.length > 1}
            materials={props.materials}
            allUnits={allUnits}
            errors={props.errors.materialRows[material.id] ?? {}}
            disabled={disabled}
            onSelectMaterial={props.onSelectMaterial}
            onSelectUnitType={props.onSelectUnitType}
            onFieldChange={props.onMaterialRowFieldChange}
            onRemove={props.onRemoveMaterial}
          />
        ))}
      </div>

      {!props.readOnly ? (
        <button
          type="button"
          onClick={props.onAddMaterial}
          disabled={props.pending}
          className="inline-flex h-10 items-center gap-2 rounded-[9px] border border-emerald-700 px-4 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-60"
        >
          <Plus aria-hidden="true" size={16} /> Add another cost line
        </button>
      ) : null}

      <label className="block text-sm font-semibold text-slate-800">
        Notes <span className="font-normal text-slate-500">(optional)</span>
        <textarea
          value={props.form.notes}
          onChange={(event) => props.onFieldChange("notes", event.target.value)}
          disabled={disabled}
          maxLength={500}
          rows={3}
          placeholder="Add details for this BOQ item..."
          className="mt-2 w-full resize-y rounded-[9px] border border-slate-200 bg-white p-3 text-sm font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        />
        <span className="mt-1 block text-right text-xs font-normal text-slate-500">
          {props.form.notes.length} / 500
        </span>
      </label>
    </div>
  );
}

function MaterialFields({
  material,
  index,
  canRemove,
  materials,
  allUnits,
  errors,
  disabled,
  onSelectMaterial,
  onSelectUnitType,
  onFieldChange,
  onRemove,
}: {
  material: EstimateItemModalMaterialForm;
  index: number;
  canRemove: boolean;
  materials: CostEstimatorItemModalProps["materials"];
  allUnits: CostEstimatorItemModalProps["materials"][number]["units"];
  errors: Partial<Record<"searchInput" | "unitType" | "quantityInput", string>>;
  disabled: boolean;
  onSelectMaterial: CostEstimatorItemModalProps["onSelectMaterial"];
  onSelectUnitType: CostEstimatorItemModalProps["onSelectUnitType"];
  onFieldChange: CostEstimatorItemModalProps["onMaterialRowFieldChange"];
  onRemove: CostEstimatorItemModalProps["onRemoveMaterial"];
}) {
  const selected = materials.find(
    (entry) => entry.materialId === material.materialId,
  );
  const units = selected?.units.length ? selected.units : allUnits;
  const lineTotal =
    parseBudgetNumberInput(material.unitCostInput) *
    parseBudgetNumberInput(material.quantityInput);

  function handleMaterialName(value: string) {
    onFieldChange(material.id, "searchInput", value);
    const match = materials.find(
      (entry) =>
        entry.materialName.toLowerCase() === value.trim().toLowerCase(),
    );
    if (match) onSelectMaterial(material.id, match.materialId);
  }

  return (
    <section className="rounded-[12px] border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-950">
          Cost line {index + 1}
        </h3>
        {canRemove && !disabled ? (
          <button
            type="button"
            onClick={() => onRemove(material.id)}
            aria-label={"Remove cost line " + (index + 1)}
            className="rounded-md p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <Trash2 aria-hidden="true" size={16} />
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-800 sm:col-span-2">
          Catalog Item <span className="text-rose-500">*</span>
          <input
            list={"catalog-" + material.id}
            value={material.searchInput}
            onChange={(event) => handleMaterialName(event.target.value)}
            disabled={disabled}
            placeholder="Search or enter a cost item"
            className={cn(
              "mt-2 h-11 w-full rounded-[9px] border bg-white px-3 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100",
              errors.searchInput ? "border-rose-300" : "border-slate-200",
            )}
          />
          <datalist id={"catalog-" + material.id}>
            {materials.map((entry) => (
              <option key={entry.materialId} value={entry.materialName} />
            ))}
          </datalist>
          {errors.searchInput ? (
            <span className="mt-1 block text-xs font-medium text-rose-600">
              {errors.searchInput}
            </span>
          ) : null}
        </label>

        <label className="block text-sm font-semibold text-slate-800">
          Unit <span className="text-rose-500">*</span>
          <select
            value={material.catalogItemId}
            onChange={(event) =>
              onSelectUnitType(material.id, event.target.value)
            }
            disabled={disabled}
            className={cn(
              "mt-2 h-11 w-full rounded-[9px] border bg-white px-3 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100",
              errors.unitType ? "border-rose-300" : "border-slate-200",
            )}
          >
            <option value="">Select unit</option>
            {units.map((unit) => (
              <option key={unit.catalogItemId} value={unit.catalogItemId}>
                {unit.unitType}
              </option>
            ))}
          </select>
          {errors.unitType ? (
            <span className="mt-1 block text-xs font-medium text-rose-600">
              {errors.unitType}
            </span>
          ) : null}
        </label>

        <label className="block text-sm font-semibold text-slate-800">
          Quantity <span className="text-rose-500">*</span>
          <input
            value={material.quantityInput}
            onChange={(event) =>
              onFieldChange(material.id, "quantityInput", event.target.value)
            }
            disabled={disabled}
            inputMode="decimal"
            placeholder="0"
            className={cn(
              "mt-2 h-11 w-full rounded-[9px] border bg-white px-3 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100",
              errors.quantityInput ? "border-rose-300" : "border-slate-200",
            )}
          />
          {errors.quantityInput ? (
            <span className="mt-1 block text-xs font-medium text-rose-600">
              {errors.quantityInput}
            </span>
          ) : null}
        </label>

        <label className="block text-sm font-semibold text-slate-800">
          Unit Cost
          <input
            value={formatBudgetNumberForInput(
              parseBudgetNumberInput(material.unitCostInput),
            )}
            onChange={(event) =>
              onFieldChange(material.id, "unitCostInput", event.target.value)
            }
            disabled={disabled}
            inputMode="decimal"
            placeholder="0"
            className="mt-2 h-11 w-full rounded-[9px] border border-slate-200 bg-white px-3 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <div>
          <p className="text-sm font-semibold text-slate-800">Line Total</p>
          <div className="mt-2 flex h-11 items-center rounded-[9px] border border-slate-200 bg-slate-100 px-3 text-sm font-semibold text-slate-950">
            {formatBudgetMoney(lineTotal)}
          </div>
        </div>

        <label className="block text-sm font-semibold text-slate-800 sm:col-span-2">
          Pricing Basis
          <select
            value={material.pricingBasis}
            onChange={(event) =>
              onFieldChange(material.id, "pricingBasis", event.target.value)
            }
            disabled={disabled}
            className="mt-2 h-11 w-full rounded-[9px] border border-slate-200 bg-white px-3 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="catalog">Catalog / reference rate</option>
            <option value="supplier_quote">Supplier quotation</option>
          </select>
        </label>

        {material.pricingBasis === "supplier_quote" ? (
          <>
            <QuoteField
              label="Supplier"
              value={material.referenceSupplier}
              disabled={disabled}
              onChange={(value) =>
                onFieldChange(material.id, "referenceSupplier", value)
              }
            />
            <QuoteField
              label="Quotation Reference"
              value={material.referenceQuotation}
              disabled={disabled}
              onChange={(value) =>
                onFieldChange(material.id, "referenceQuotation", value)
              }
            />
          </>
        ) : null}
      </div>
    </section>
  );
}

function QuoteField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-800">
      {label} <span className="text-rose-500">*</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="mt-2 h-11 w-full rounded-[9px] border border-slate-200 bg-white px-3 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
      />
    </label>
  );
}
