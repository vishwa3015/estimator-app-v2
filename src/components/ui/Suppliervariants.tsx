import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { ProductSupplier, ProductSupplierVariant } from "@/services/products/product-service";
import { TrashIcon } from "../estimates-v2/EstimatesContainer";

export interface VariantDraft {
  id?: string;
  supplier_id: string;
  sku: string;
  unit_of_measure: string;
  price: number | "";
  is_preferred: boolean;
  is_active: boolean;
  _deleted?: boolean;
  _dirty?: boolean;
}

export type SupplierVariantMap = Record<string, VariantDraft[]>;

export type SupplierTabSectionsMap = Record<
  string,
  Array<{ tab_id: string; section_id: string }>
>;

export interface SupplierEntry {
  uid: string;
  supplierId: string;
  variant: VariantDraft;
  tabSectionAssignments: Array<{ tab_id: string; section_id: string }>;
}

interface ReadOnlyVariantCardProps {
  variant: ProductSupplierVariant;
  supplierName: string;
}

const VARIANT_TYPE_LABEL: Record<string, string> = {
  default: "Default",
  color: "Color",
  size: "Size",
  material: "Material",
};

const ReadOnlyVariantCard: React.FC<ReadOnlyVariantCardProps> = ({ variant, supplierName }) => {
  const [isOpen, setIsOpen] = useState(false);

  const fields: { label: string; value: string }[] = [
    { label: "Variant Type", value: VARIANT_TYPE_LABEL[variant.variant_type] ?? variant.variant_type },
    { label: "Variant Name", value: variant.variant_name?.trim() || "—" },
    { label: "SKU", value: variant.sku?.trim() || "—" },
    { label: "Unit of Measure", value: variant.unit_of_measure?.trim() || "—" },
    { label: "Price", value: `$${Number(variant.price).toFixed(2)}` },
    { label: "Color", value: variant.color_hex?.trim() || "—" },
    { label: "Material", value: variant.material?.trim() || "—" },
    { label: "Size", value: variant.size?.trim() || "—" },
    { label: "Weight", value: variant.weight != null ? String(variant.weight) : "—" },
  ];

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white opacity-80">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-2 w-full px-3 py-2.5 text-left"
      >
        <svg
          className={`h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-sm font-medium text-slate-600 truncate flex-1">{supplierName}</span>
        <span className="text-xs text-slate-400 shrink-0">${Number(variant.price).toFixed(2)}</span>
        <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 shrink-0">
          {VARIANT_TYPE_LABEL[variant.variant_type] ?? variant.variant_type}
        </span>
      </button>
      {isOpen && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
          <dl className="grid grid-cols-3 gap-x-4 gap-y-3">
            {fields.map((f) => (
              <div key={f.label}>
                <dt className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{f.label}</dt>
                <dd className={`text-sm mt-0.5 ${f.value === "—" ? "text-slate-300" : "text-slate-700"}`}>{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
};

interface MultiTabSectionProps {
  assignments: Array<{ tab_id: string; section_id: string }>;
  quoteTabs: { id: string; title: string }[];
  tabSectionsMap: Record<string, { id: string; title: string }[]>;
  onChange: (updated: Array<{ tab_id: string; section_id: string }>) => void;
}

const MultiTabSection: React.FC<MultiTabSectionProps> = ({
  assignments,
  quoteTabs,
  tabSectionsMap,
  onChange,
}) => {
  const selectedTabIds = assignments.map((a) => a.tab_id).filter(Boolean);

  const handleTabToggle = (tabId: string) => {
    if (selectedTabIds.includes(tabId)) {
      onChange(assignments.filter((a) => a.tab_id !== tabId));
    } else {
      onChange([...assignments, { tab_id: tabId, section_id: "" }]);
    }
  };

  const handleSectionChange = (tabId: string, sectionId: string) => {
    onChange(
      assignments.map((a) => (a.tab_id === tabId ? { ...a, section_id: sectionId } : a))
    );
  };

  return (
    <div className="grid grid-cols-6 gap-2">
      <div className="space-y-0.5 col-span-1">
        <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Tab</Label>
        <div className="flex flex-col gap-1">
          {quoteTabs.map((t) => {
            const checked = selectedTabIds.includes(t.id);
            return (
              <label key={t.id} className="flex items-center gap-1 cursor-pointer select-none h-6">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleTabToggle(t.id)}
                  className="h-3 w-3 rounded border-slate-300 text-red-600 cursor-pointer"
                />
                <span className="text-xs text-slate-700">{t.title}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-0.5 col-span-2">
        <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Section</Label>
        {selectedTabIds.length === 0 ? (
          <p className="text-xs text-slate-400 h-6 flex items-center">Select tab first</p>
        ) : (
          <div className="space-y-1">
            {selectedTabIds.map((tabId) => {
              const tab = quoteTabs.find((t) => t.id === tabId);
              const sections = tabSectionsMap[tabId] ?? [];
              const assignment = assignments.find((a) => a.tab_id === tabId);
              const sectionId = assignment?.section_id ?? "";
              return (
                <div key={tabId} className="flex items-center gap-1">
                  <span className="shrink-0 text-[10px] font-medium text-red-600 w-12 truncate">{tab?.title}</span>
                  <select
                    value={sectionId}
                    onChange={(e) => handleSectionChange(tabId, e.target.value)}
                    className="flex-1 h-6 rounded border border-slate-200 bg-white px-1 !text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  >
                    <option value="">{sections.length === 0 ? "No sections" : "— None —"}</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

interface SupplierBlockProps {
  entry: SupplierEntry;
  suppliers: ProductSupplier[];
  usedSupplierIds: string[];
  isOpen: boolean;
  onToggle: () => void;
  onChange: (entry: SupplierEntry) => void;
  onRemove: () => void;
  quoteTabs: { id: string; title: string }[];
  tabSectionsMap: Record<string, { id: string; title: string }[]>;
}

export const SupplierBlock: React.FC<SupplierBlockProps> = ({
  entry,
  suppliers,
  usedSupplierIds,
  isOpen,
  onToggle,
  onChange,
  onRemove,
  quoteTabs,
  tabSectionsMap,
}) => {
  const { variant } = entry;

  const supplierName =
    suppliers.find((s) => s.id === entry.supplierId)?.name ?? "No supplier";
  const summaryPrice =
    variant.price !== "" ? `$${Number(variant.price).toFixed(2)}` : "—";

  const updateVariant = (field: keyof VariantDraft, value: VariantDraft[keyof VariantDraft]) => {
    onChange({ ...entry, variant: { ...variant, [field]: value, _dirty: true } });
  };

  const updateSupplier = (supplierId: string) => {
    onChange({
      ...entry,
      supplierId,
      variant: { ...variant, supplier_id: supplierId, _dirty: true },
    });
  };

  const priceInvalid =
    variant.price === "" ||
    (typeof variant.price === "number" && isNaN(variant.price));
  const uomInvalid = variant.unit_of_measure.trim() === "";

  return (
    <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        <button type="button" onClick={onToggle} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          <svg
            className={`h-3 w-3 text-slate-400 shrink-0 transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-medium text-slate-700 truncate">{supplierName}</span>
          <span className="text-xs font-semibold text-gray-500">{summaryPrice}</span>
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="text-red-400 hover:text-red-600 shrink-0 ml-1"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-slate-100 bg-slate-50 px-3 py-3 space-y-3">
          <div className="grid grid-cols-4 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Supplier</Label>
              <select
                value={entry.supplierId}
                onChange={(e) => updateSupplier(e.target.value)}
                className="w-full h-8 rounded border border-slate-200 bg-white px-2 !text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="">Select…</option>
                {suppliers.map((s) => (
                  <option
                    key={s.id}
                    value={s.id}
                    disabled={usedSupplierIds.includes(s.id) && s.id !== entry.supplierId}
                  >
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">SKU</Label>
              <Input
                value={variant.sku}
                onChange={(e) => updateVariant("sku", e.target.value)}
                placeholder="SKU-001"
                className="h-8 !text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                Price <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number" step="0.01" min="0"
                value={variant.price}
                onChange={(e) =>
                  updateVariant("price", e.target.value === "" ? "" : parseFloat(e.target.value))
                }
                placeholder="0.00"
                className={`h-8 !text-xs ${priceInvalid ? "border-red-400" : ""}`}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                UOM <span className="text-red-500">*</span>
              </Label>
              <Input
                value={variant.unit_of_measure}
                onChange={(e) => updateVariant("unit_of_measure", e.target.value)}
                placeholder="sqm, lm…"
                className={`h-8 !text-xs ${uomInvalid ? "border-red-400" : ""}`}
              />
            </div>
          </div>

          {quoteTabs.length > 0 && (
            <div className="space-y-1.5">
              <MultiTabSection
                assignments={entry.tabSectionAssignments}
                quoteTabs={quoteTabs}
                tabSectionsMap={tabSectionsMap}
                onChange={(updated) => onChange({ ...entry, tabSectionAssignments: updated })}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface SupplierVariantsEditorProps {
  suppliers: ProductSupplier[];
  supplierVariantMap: SupplierVariantMap;
  onChange: (map: SupplierVariantMap) => void;
  readOnlyVariants?: ProductSupplierVariant[];
  quoteTabs?: { id: string; title: string }[];
  tabSectionsMap?: Record<string, { id: string; title: string }[]>;
  supplierTabSections?: SupplierTabSectionsMap;
  onTabSectionChange?: (updated: SupplierTabSectionsMap) => void;
  variantErrors?: Record<string, Record<number, string>>
}

export const SupplierVariantsEditor: React.FC<SupplierVariantsEditorProps> = ({
  suppliers,
  supplierVariantMap,
  onChange,
  readOnlyVariants = [],
  quoteTabs = [],
  tabSectionsMap = {},
  supplierTabSections = {},
  onTabSectionChange,
  variantErrors,
}) => {
  const mapToEntries = (map: SupplierVariantMap): SupplierEntry[] =>
    Object.entries(map).map(([supplierId, variants]) => ({
      uid: supplierId || crypto.randomUUID(),
      supplierId,
      variant: variants[0] ?? {
        supplier_id: supplierId,
        sku: "",
        unit_of_measure: "",
        price: "",
        is_preferred: true,
        is_active: true,
        _dirty: true,
      },
      tabSectionAssignments: (() => {
        const raw = supplierTabSections[supplierId];
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        const legacy = raw as unknown as { tab_id: string; section_id: string };
        if (legacy.tab_id) return [legacy];
        return [];
      })(),
    }));

  const [entries, setEntries] = useState<SupplierEntry[]>(() =>
    mapToEntries(supplierVariantMap)
  );
  const [openUids, setOpenUids] = useState<Set<string>>(
    () => new Set(Object.keys(supplierVariantMap))
  );
  const lastExternalKeysRef = React.useRef<string>("");

  const toggleOpen = (uid: string) => {
    setOpenUids((prev) =>
      prev.has(uid) ? new Set<string>() : new Set<string>([uid])
    );
  };

  const syncUp = (next: SupplierEntry[]) => {
    setEntries(next);

    const newMap: SupplierVariantMap = {};
    next.forEach((e) => {
      if (e.supplierId) newMap[e.supplierId] = [e.variant];
    });
    lastExternalKeysRef.current = Object.keys(newMap).sort().join(",");
    onChange(newMap);

    if (onTabSectionChange) {
      const ts: SupplierTabSectionsMap = {};
      next.forEach((e) => {
        if (e.supplierId) {
          ts[e.supplierId] = e.tabSectionAssignments.filter(
            (a) => a.tab_id
          );
        }
      });
      onTabSectionChange(ts);
    }
  };

  useEffect(() => {
    const keys = Object.keys(supplierVariantMap).sort().join(",");
    if (keys === lastExternalKeysRef.current) return;
    lastExternalKeysRef.current = keys;
    const newEntries = mapToEntries(supplierVariantMap);
    setEntries(newEntries);
    setOpenUids(new Set(newEntries.map((e) => e.uid)));
  }, [JSON.stringify(Object.keys(supplierVariantMap).sort())]);

  const addEntry = () => {
    const uid = crypto.randomUUID();
    const newEntry: SupplierEntry = {
      uid,
      supplierId: "",
      variant: {
        supplier_id: "",
        sku: "",
        unit_of_measure: "",
        price: "",
        is_preferred: true,
        is_active: true,
        _dirty: true,
      },
      tabSectionAssignments: [],
    };
    syncUp([...entries, newEntry]);
    setOpenUids(new Set<string>([uid]));
  };

  const updateEntry = (uid: string, updated: SupplierEntry) => {
    syncUp(entries.map((e) => (e.uid === uid ? updated : e)));
  };

  const removeEntry = (uid: string) => {
    syncUp(entries.filter((e) => e.uid !== uid));
  };

  const usedSupplierIds = entries.map((e) => e.supplierId).filter(Boolean);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Label>
          Product Supplier <span className="text-red-500">*</span>
        </Label>
        <Button
          type="button"
          size="sm"
          onClick={addEntry}
          className="h-8 bg-red-600 hover:bg-red-700 text-white text-xs px-3"
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Supplier Price
        </Button>
      </div>

      {/* Entries */}
      {entries.length === 0 && readOnlyVariants.length === 0 ? (
        <div className="border border-dashed border-slate-200 rounded-lg p-5 text-center">
          <p className="text-sm text-slate-400">No suppliers added yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <SupplierBlock
              key={entry.uid}
              entry={entry}
              suppliers={suppliers}
              usedSupplierIds={usedSupplierIds}
              isOpen={openUids.has(entry.uid)}
              onToggle={() => toggleOpen(entry.uid)}
              onChange={(updated) => updateEntry(entry.uid, updated)}
              onRemove={() => removeEntry(entry.uid)}
              quoteTabs={quoteTabs}
              tabSectionsMap={tabSectionsMap}
            />
          ))}

          {/* Read-only non-default variants */}
          {readOnlyVariants.length > 0 && (
            <>
              {entries.length > 0 && (
                <p className="text-[10px] text-slate-400 uppercase tracking-wide pt-1">
                  Other variants (read-only)
                </p>
              )}
              {readOnlyVariants.map((v) => {
                const supplierName =
                  v.supplier_name ??
                  suppliers.find((s) => s.id === v.supplier_id)?.name ??
                  "Unknown Supplier";
                return (
                  <ReadOnlyVariantCard key={v.id} variant={v} supplierName={supplierName} />
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
};