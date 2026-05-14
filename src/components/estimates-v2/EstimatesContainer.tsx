import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { DatePicker } from "../ui/date-picker";
import FileDropzone from "../ui/file-dropzone";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import RichTextEditor from "../ui/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Slider } from "../ui/slider";
import { Textarea } from "../ui/textarea";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { v4 as uuidv4 } from "uuid";
import { Switch } from "../ui/switch";
import { fileUploadService } from "@/services/estimates/file-upload-service";
import { useToast } from "@/hooks/use-toast";
import { TemplateControls } from "@/components/estimates/TemplateControls";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Check, Pencil, FileText, ChevronDown, ChevronsUpDown, Loader2, XCircle, CheckCircle2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { useEstimateData } from "@/hooks/use-estimate-data";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import QuotationTemplate from "../pdf/QuoteTemplate";
import { useParams } from "react-router-dom";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { ghlService } from "@/services/ghl";
import { updateMeasurementReport, formatGoogleViewerUrl } from "@/services/ghl/ghlMeasurementReportService";
import { measurementOrdersService } from "@/services/eagleview";
import { EagleViewProduct, ReportStatus, getReportStatusText, MeasurementInstructionType, PrimaryProductId, DeliveryProductId, TypeOfStructure } from "@/types/eagleview";
import { useLocalGHLCredentials } from "@/services/ghl/getghlCredentials";
import { customTemplates } from "@/configs/estimatesEditorConfig";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { eagleViewOAuthService } from "@/services/eagleview/oauth-service";
import { Product, ProductCategory, productService, ProductSupplier } from "@/services/products/product-service";
import { AddItemDialog, SelectedCatalogItem } from "../estimates/AddItemDialog";
import { FieldConfig, FieldPath, FormValues, LocationDetails, QuoteItem, SectionConfig, TabConfig } from "@/types/estimate-items";
import { calculateTabTotals, QuoteSectionUpdate } from "@/utils/quoteCalculations";
import { ProductCard } from "../ui/ProductCard";
import { PartnerDetailsResponse, QuickMeasureAccountCheckResponse, QuickMeasureCoverageCheckResponse, QuickMeasureOrderDetail, QuickMeasureOrderResponse, QuickMeasureSiteStatusResponse } from "@/types/quickmeasure-types";
import { quickMeasureMeasurementOrdersService } from "@/services/quickmeasure/quickmeasure-orders-service";
import { quickMeasureOAuthService } from "@/services/quickmeasure";
import { API_BASE_URL, getHeaders } from "@/services/ghl/config";
import { updateQuickMeasureReport } from "@/services/ghl/ghlQuickmeasureReportService ";
import { googleMapsService } from "@/services/maps/google-maps-service";
import { measurementTypes } from "@/data/measurement-types";
import { templateService } from "@/services/estimates";
import { isRendererKeyRegistered } from "@/Templateregistry";
import { LOCATION_SPECIFIC_MEASUREMENT_LOCATIONS } from "@/constants/location-constants";
import { formatPrice } from "@/utils/currency";

interface CalcRule {
  matcher?: string;
  modifier?: string;
}

type FlexibleQuickMeasureOrder = QuickMeasureOrderResponse & { gafOrderNumber?: number; GAFOrderNumber?: number };
interface TabUpdate {
  arrays: {
    sections: Record<string, {
      items?: Record<string, Partial<QuoteItem> & {
        text: string;
        price: number;
        description: string;
        wastage_percentage: number;
        is_catalog_item: boolean;
        catalog_product_id: string;
        catalog_supplier_id: string | null;
        catalog_variant_id: string | null;
        unit_of_measure: string | null;
        sku: string | null;
      }>;
      [key: string]: unknown;
    }>;
  } & Record<string, unknown>;
  [key: string]: unknown;
}

interface TemplateSection {
  sortOrder?: number;
  title?: string;
  description?: string;
  fields?: FieldConfig[];
}

interface PrimarySigner {
  first_name?: string;
  last_name?: string;
  email?: string;
}

// Helper function to get badge variant based on status
const getStatusBadgeVariant = (status: string | undefined): "default" | "secondary" | "destructive" | "outline" => {
  if (!status) return "secondary";

  const statusLower = status.toLowerCase();

  if (statusLower.includes("completed") || statusLower.includes("success")) return "default";
  if (statusLower.includes("process") || statusLower.includes("in process")) return "secondary"; // Yellow
  if (statusLower.includes("pending")) return "outline"; // Blue
  if (statusLower.includes("created")) return "secondary";
  if (statusLower.includes("closed")) return "destructive"; // Red

  return "secondary";
};

const getStatusBadgeClassName = (status: string | undefined): string => {
  if (!status) return "";

  const statusLower = status.toLowerCase();

  if (statusLower.includes("completed") || statusLower.includes("success"))
    return "bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400";
  if (statusLower.includes("process") || statusLower.includes("in process"))
    return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-400";
  if (statusLower.includes("pending")) return "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400";
  if (statusLower.includes("created")) return "bg-gray-500/10 text-gray-700 border-gray-500/20 dark:text-gray-400";
  if (statusLower.includes("closed")) return "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400";

  return "";
};

export const TrashIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
    />
  </svg>
);

// NOTE: Assumed ID for quote section will be 6 alws.
// NOTE: assumes Good tab will alws be first, then better and then best. MAKE SURE TO NOT CHANGE THE ORDER.
// NOTE: assuming quote sections title to be "Good". (make sure to not change this to auto populate qty based on configuration)
const QuoteID = 6;
const AuthPageId = 7;
const titlePageId = 1;
const MeasurementsPageId = 4;
const WASTE_PERCENTAGE_KEY = "waste_percentage";

type TabSectionAssignment = { tab_id: string; section_id: string };
type SupplierTabSectionsMap = Record<string, TabSectionAssignment[]>;

function normaliseSupplierTabSections(raw: unknown): SupplierTabSectionsMap {
  if (!raw || typeof raw !== "object") return {};
  const result: SupplierTabSectionsMap = {};

  for (const [supplierId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      result[supplierId] = value.filter(
        (a: unknown) => a !== null && typeof a === "object" && "tab_id" in a
      );
    } else if (value && typeof value === "object" && "tab_id" in value) {
      const legacy = value as { tab_id: string; section_id: string };
      result[supplierId] = legacy.tab_id ? [legacy] : [];
    }
  }

  return result;
}

const TabTotalInput = ({
  tabId,
  currentTotal,
  taxRate,
  profitMargin,
  isLocked,
  onTotalChange,
  onError,
}: {
  tabId: string;
  currentTotal: number;
  taxRate: number;
  profitMargin: number;
  isLocked: boolean;
  onTotalChange: (newTotal: number) => void;
  onError?: (message: string) => void;
}) => {
  const [inputValue, setInputValue] = React.useState(currentTotal.toFixed(2));
  const [hasError, setHasError] = React.useState(false);
  const [hasTouched, setHasTouched] = React.useState(false);

  React.useEffect(() => {
    setInputValue(currentTotal.toFixed(2));
    setHasError(false);
  }, [currentTotal]);

  const taxMult = 1 + taxRate / 100;
  const currentMarginMult = 1 + profitMargin / 100;
  const rawSubtotal = currentTotal / (currentMarginMult * taxMult);
  const minTotal = rawSubtotal * taxMult;
  const maxTotal = rawSubtotal * 2 * taxMult;

  return (
    <div className="border rounded-md p-4 mt-3 bg-muted/50 mb-10">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold text-lg">Tab Total</h4>
        <div className="text-right">
          <div className="flex items-center justify-end gap-2">
            <span className="text-2xl font-bold">$</span>
            <input
              type="number"
              min={minTotal.toFixed(2)}
              max={maxTotal.toFixed(2)}
              step="0.01"
              disabled={isLocked}
              className={`text-2xl font-bold text-start text-foreground bg-background border rounded-md px-3 py-1 max-w-[200px] w-full focus:outline-none focus:ring-1 disabled:opacity-50 disabled:cursor-not-allowed ${hasError
                ? "border-red-500 focus:ring-red-500"
                : "border-input focus:ring-red-500"
                }`}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setHasError(false);
              }}
              onFocus={() => setHasTouched(true)}
              onBlur={(e) => {
                const newTotal = parseFloat(e.target.value);
                if (isNaN(newTotal) || newTotal < 0) {
                  setInputValue(currentTotal.toFixed(2));
                  setHasError(false);
                  return;
                }
                if (newTotal < minTotal || newTotal > maxTotal) {
                  setHasError(true);
                  onError?.(`Enter a value between $${minTotal.toFixed(2)} and $${maxTotal.toFixed(2)}`);
                  return; // Value stays as typed — user can fix it
                }
                setHasError(false);
                onTotalChange(newTotal);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Tax Rate: {taxRate}% | Profit Margin: {profitMargin}%
          </p>
          {hasTouched && (
            <p className={`text-xs mt-0.5 ${hasError ? "text-red-500" : "text-muted-foreground"}`}>
              {hasError
                ? `Value out of range: $${minTotal.toFixed(2)} – $${maxTotal.toFixed(2)}`
                : `Valid range: $${minTotal.toFixed(2)} – $${maxTotal.toFixed(2)}`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const DataEntrySection = ({
  activeSection,
  formValues,
  handleFieldChange,
  setFormValues,
  sectionUpdates,
  products,
  onResetAutoSaveTimer,
}: {
  activeSection: number;
  formValues: FormValues;
  handleFieldChange: (fieldName: string, value: unknown, path: FieldPath, tabIndex: number | null) => void;
  setFormValues: React.Dispatch<React.SetStateAction<FormValues>>;
  sectionUpdates: SectionConfig[];
  products: Product[];
  onResetAutoSaveTimer?: () => void;
}) => {
  const [expandedSection, setExpandedSection] = useState<Record<string, boolean>>({
    sec1: true,
  });

  const initialData = {
    sec1: [
      { item: "SHINGLES", quantity: 0 },
      { item: "HIPS", quantity: 0 },
      { item: "RIDGE", quantity: 0 },
      { item: "RIDGE VENT", quantity: 0 },
      { item: "PERIMETER", quantity: 0 },
      { item: "VALLEYS", quantity: 0 },
      { item: "PIPE FLASHING", quantity: 0 },
      { item: "OSB", quantity: 0 },
    ],
    sec2: [
      { item: "135 STATIC VENT", quantity: 0 },
      { item: "750 STATIC VENT", quantity: 0 },
      { item: '14" TURBINE VENT', quantity: 0 },
      { item: "Vented Drip Edge", quantity: 0 },
      { item: "MOD. CAP SHEET", quantity: 0 },
      { item: "MOD. BASE SHEET", quantity: 0 },
      { item: "29GA. FLAT SHEET", quantity: 0 },
      { item: '29GA. VALLEY SHEET', quantity: 0 },
      { item: "STEP FLASHING", quantity: 0 },
      { item: "SKYLIGHT (FULL)", quantity: 0 },
      { item: "SKYLIGHT FLASH KIT", quantity: 0 },
      { item: "ZIPPER BOOT", quantity: 0 },
      { item: "2x6x10", quantity: 0 },
      { item: "2x4x10", quantity: 0 },
      { item: "L-METAL", quantity: 0 },
      { item: "TRIM COIL", quantity: 0 },
      { item: "APRON FLASHING", quantity: 0 },
      { item: "Z-BAR", quantity: 0 },
    ],
    sec3: [
      { item: "2 STORY", quantity: 0 },
      { item: "2 LAYER TEAR OFF", quantity: 0 },
      { item: "DRIP EDGE", quantity: 0 },
      { item: "CHIMNEY CRICKET", quantity: 0 },
      { item: "CHIMNEY FLASHING", quantity: 0 },
      { item: "OSB INSTALL", quantity: 0 },
      { item: "STEP FLASHING", quantity: 0 },
      { item: "SKYLIGHT (FULL)", quantity: 0 },
      { item: "SKYLIGHT (KIT)", quantity: 0 },
      { item: "MODIFIED ROOFING", quantity: 0 },
      { item: "PITCH =<6/12", quantity: 0 },
      { item: "PITCH 8/12", quantity: 0 },
      { item: "PITCH 9/12", quantity: 0 },
      { item: "PITCH 10/12", quantity: 0 },
      { item: "PITCH 11/12", quantity: 0 },
      { item: "PITCH 12/12", quantity: 0 },
      { item: "PITCH >14/12", quantity: 0 },
      { item: "VENTS/PIPE BOOTS", quantity: 0 },
      { item: "CUT INTO RIDGE/DECKING", quantity: 0 },
      { item: "APRON FLASHING", quantity: 0 },
      { item: "R&R RIDGE VENT", quantity: 0 },
    ],
    sec4: [
      { item: "METAL WORK", quantity: 0 },
      { item: "ICE & WATER", quantity: 0 },
      { item: "OSB INSTALL", quantity: 0 },
      { item: "SHED STYLE", quantity: 0 },
      { item: "BAY WINDOW", quantity: 0 },
      { item: "BARREL DORMER", quantity: 0 },
      { item: "EYEBROW (14-24)", quantity: 0 },
      { item: "STEP FLASHING", quantity: 0 },
      { item: "THRU-WALL", quantity: 0 },
      { item: "COUNTER-FLASHING", quantity: 0 },
      { item: "DRIP EDGES", quantity: 0 },
      { item: "CORNER RETURNS", quantity: 0 },
      { item: "CHIMNEY CAP", quantity: 0 },
    ],
  };

  const sections = [
    { id: "sec1", title: "TAKE OFF MATERIAL", matcher: "MATERIALS" },
    { id: "sec2", title: "TAKE OFF MATERIAL (ADDITIONAL COSTS)", matcher: "ADDITIONAL COSTS" },
    { id: "sec3", title: "LABOR", matcher: "LABOR" },
    { id: "sec4", title: "METAL WORK", matcher: "METAL WORK" },
  ];

  const [data, setData] = useState(initialData);
  const QuoteID = 6;

  const applyCalculationsByItemType = (
    oldFormValues: FormValues,
    itemType: string,
    inputValue: number
  ) => {
    const quoteSection = sectionUpdates.find((sec: SectionConfig) => sec.id === QuoteID);
    if (!quoteSection?.tabs || products.length === 0) {
      return oldFormValues;
    }

    const sortedTabs = [...quoteSection.tabs].sort(
      (a: TabConfig, b: TabConfig) => (a.sortOrder || 0) - (b.sortOrder || 0)
    );

    const updated = JSON.parse(JSON.stringify(oldFormValues));

    // Find all catalog products that depend on this item_type
    const relevantProducts = products.filter((p) =>
      p.item_type?.some(type =>
        type.trim().toLowerCase() === itemType.trim().toLowerCase()
      )
    );

    if (relevantProducts.length === 0) return oldFormValues;

    const shouldRemoveItems = inputValue === 0;

    sortedTabs.forEach((tab: TabConfig, tabIndex: number) => {
      const tabId = String(tab.id);
      const sectionsPath = updated[QuoteID]?.tabs?.[tabId]?.arrays?.sections;
      if (!sectionsPath) return;

      // Get the deleted catalog items for this tab
      let deletedCatalogItems = updated[QuoteID]?.tabs?.[tabId]?.deleted_catalog_items || [];

      // If quantity > 0, remove relevant products from deleted list and re-add them
      if (inputValue > 0) {
        const relevantProductIds = relevantProducts.map(p => p.id);
        deletedCatalogItems = deletedCatalogItems.filter(
          (deletedId: string) => !relevantProductIds.includes(deletedId)
        );

        // Update the deleted_catalog_items array
        if (!updated[QuoteID].tabs[tabId]) {
          updated[QuoteID].tabs[tabId] = {};
        }
        updated[QuoteID].tabs[tabId].deleted_catalog_items = deletedCatalogItems;

        // RE-ADD THE PRODUCTS THAT WERE DELETED
        relevantProducts.forEach((product) => {
          if (!product.sections) return;

          const tabIndexInProduct = product.tab?.indexOf(tabId);
          if (tabIndexInProduct === -1 || tabIndexInProduct === undefined) return;

          const targetSectionId = product.sections[tabIndexInProduct];
          if (!targetSectionId) return;

          // Ensure section exists
          if (!sectionsPath[targetSectionId]) {
            return;
          }

          // Check if product already exists in this section
          const existingItems = sectionsPath[targetSectionId]?.items || {};
          const productExists = Object.values(existingItems).some(
            (item: QuoteItem) => item.catalog_product_id === product.id
          );

          if (productExists) {
            return; // Skip, it already exists
          }

          // RE-ADD THE PRODUCT
          const consistentItemId = product.id;

          if (!sectionsPath[targetSectionId].items) {
            sectionsPath[targetSectionId].items = {};
          }

          sectionsPath[targetSectionId].items[consistentItemId] = {
            text: product.name,
            price: product.price,
            quantity: product.quantity || 0,
            description: product.description || '',
            wastage_percentage: product.wastage_percentage || 0,
            is_catalog_item: true,
            catalog_product_id: product.id,
          };
        });
      }

      Object.keys(sectionsPath).forEach((sectionId) => {
        const sectionData = sectionsPath[sectionId];
        if (!sectionData?.items) return;

        const currentItems = { ...sectionData.items };

        relevantProducts.forEach((product) => {
          // Find all items in this section that belong to this product
          const matchingItemIds = Object.keys(currentItems).filter((itemId) => {
            const item = currentItems[itemId];

            // Primary: exact catalog_product_id match (most reliable)
            if (item.catalog_product_id === product.id) return true;

            // Secondary: exact name match (case + trim insensitive)
            const itemText = (item.text || "").trim().toLowerCase();
            const productName = (product.name || "").trim().toLowerCase();
            if (itemText === productName) return true;

            // Tertiary: loose contains (safe fallback)
            if (itemText.includes(productName) || productName.includes(itemText)) return true;

            return false;
          });

          if (shouldRemoveItems) {
            matchingItemIds.forEach((itemId) => {
              const itemToRemove = currentItems[itemId];

              if (itemToRemove.is_catalog_item && itemToRemove.catalog_product_id) {
                if (!deletedCatalogItems.includes(itemToRemove.catalog_product_id)) {
                  deletedCatalogItems.push(itemToRemove.catalog_product_id);
                }
              }

              delete currentItems[itemId];
            });

            if (!updated[QuoteID].tabs[tabId]) {
              updated[QuoteID].tabs[tabId] = {};
            }
            updated[QuoteID].tabs[tabId].deleted_catalog_items = deletedCatalogItems;

          } else {
            // UPDATE quantity for existing matching items
            matchingItemIds.forEach((itemId) => {
              let newQuantity = inputValue;

              let calcRules: CalcRule[] = [];
              if (product.calculation && typeof product.calculation === 'object') {
                // Convert tabIndex to string key to match JSONB structure
                const tabKey = tabIndex.toString();

                // Try to get rules for this specific tab
                const calc = product.calculation as Record<string, unknown>;
                if (calc[tabKey] && Array.isArray(calc[tabKey])) {
                  calcRules = calc[tabKey] as CalcRule[];
                } else {
                  const firstKey = Object.keys(calc)[0];
                  if (firstKey && Array.isArray(calc[firstKey])) {
                    calcRules = calc[firstKey] as CalcRule[];
                  }
                }
              }

              if (Array.isArray(calcRules) && calcRules.length > 0) {

                for (const rule of calcRules) {

                  const hasNoMatcher = !rule.matcher || rule.matcher.trim() === "";
                  const itemTextMatch = currentItems[itemId].text?.toLowerCase().includes(rule.matcher?.toLowerCase() || "");
                  const sectionTitleMatch = sectionData.section_title?.toLowerCase().includes(rule.matcher?.toLowerCase() || "");

                  const matcherSatisfied = hasNoMatcher || itemTextMatch || sectionTitleMatch;


                  if (matcherSatisfied && rule.modifier) {
                    try {
                      const calculationFunc = new Function("v", `return ${rule.modifier}`);
                      newQuantity = calculationFunc(inputValue);
                      break;
                    } catch (e) {
                      console.error(`Calculation failed:`, e);
                    }
                  }
                }
              }

              const finalQuantity = Math.max(0, Math.ceil(newQuantity || 0));

              currentItems[itemId] = {
                ...currentItems[itemId],
                quantity: finalQuantity,
                // Ensure price is from catalog (in case it was manually changed)
                price: product.price || currentItems[itemId].price || 0,
              };
            });
          }
        });

        // Update items back
        updated[QuoteID].tabs[tabId].arrays.sections[sectionId].items = currentItems;
      });
    });

    return updated;
  };

  // ALSO UPDATE: handleQuantityChange in DataEntrySection component
  const handleQuantityChange = (sectionId: string, index: number, value: string) => {
    if (onResetAutoSaveTimer) onResetAutoSaveTimer();

    const numValue = value === "" ? 0 : Number(value);
    if (isNaN(numValue) || numValue < 0) return;

    const itemType = data[sectionId][index].item;

    setFormValues((oldFormValues: FormValues) => {
      // Apply dynamic calculations
      const updated = applyCalculationsByItemType(oldFormValues, itemType, numValue);

      // Save input in dataEntry for persistence & UI
      if (!updated.dataEntry) updated.dataEntry = {};
      if (!updated.dataEntry[sectionId]) updated.dataEntry[sectionId] = {};
      updated.dataEntry[sectionId][index] = numValue;
      return updated;
    });

    // Update local UI state
    setData((prev) => ({
      ...prev,
      [sectionId]: prev[sectionId].map((row, i) =>
        i === index ? { ...row, quantity: numValue } : row
      ),
    }));
  };
  return (
    <div className="border rounded-md p-3 mt-3">
      <h3 className="font-semibold tracking-tight text-lg mb-4">Material Takeoff Entry</h3>

      {sections.map((sec) => {
        const isExpanded = expandedSection[sec.id];
        return (
          <div key={sec.id} className="border border-gray-200 rounded-lg mb-4">
            <div
              className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 border-b"
              onClick={() =>
                setExpandedSection((prev: Record<string, boolean>) => ({
                  ...prev,
                  [sec.id]: !prev[sec.id],
                }))
              }
            >
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
                <span className="font-medium">{sec.title}</span>
              </div>
            </div>

            {isExpanded && (
              <div className="p-4">
                <div className="grid grid-cols-12 gap-3 font-semibold mb-3 text-sm">
                  <div className="col-span-6">Item</div>
                  <div className="col-span-6">Quantity</div>
                </div>

                {data[sec.id].map((row, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-3 mb-2 items-center">
                    <div className="col-span-6 text-sm font-medium bg-gray-50 px-3 py-2 rounded border">
                      {row.item}
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="col-span-6 border rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
                      value={formValues?.dataEntry?.[sec.id]?.[idx] ?? 0}
                      onChange={(e) => handleQuantityChange(sec.id, idx, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};


interface EstimatesContainerProps {
  activeSection: number | string;
  setSectionUpdates: React.Dispatch<React.SetStateAction<SectionConfig[]>>;
  sectionUpdates: SectionConfig[];
  locationId: string | null;
  setActiveSection: (id: number | string) => void;
  formValues: FormValues;
  setFormValues: React.Dispatch<React.SetStateAction<FormValues>>;
  onResetAutoSaveTimer?: () => void;
  /** Called after template update to persist form data. Receives current formValues and sectionUpdates. */
  onSaveRequested?: (formValues?: FormValues, sectionUpdates?: SectionConfig[]) => void;
  isLocked?: boolean;
}

export default function EstimatesContainer({
  activeSection,
  setSectionUpdates,
  sectionUpdates,
  locationId,
  setActiveSection,
  formValues: externalFormValues,
  setFormValues: setExternalFormValues,
  onResetAutoSaveTimer,
  onSaveRequested,
  isLocked = false,
}: EstimatesContainerProps) {
  const { contactId } = useParams();
  const { estimate, contact } = useEstimateData();
  const opportunityId = estimate?.selected_opportunity_id ?? null;
  const { credentials: ghlCredentials } = useLocalGHLCredentials();
  const [formValues, setFormValues] = useState<FormValues>(externalFormValues || {});
  const [uuids, setUuids] = useState<{ [key: string]: string[] }>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [sectionPropagation, setSectionPropagation] = useState<Record<string, boolean>>({}); // Track propagation per subsection
  // Track item keys whose quantity was manually edited in Quote Details so the formula sync effect doesn't overwrite them
  const manuallyEditedQuantityKeys = useRef<Set<string>>(new Set());
  const section = sectionUpdates?.find((sec) => sec.id === activeSection);
  const isLeadDetailsSection = activeSection === "lead-details-entry";
  type TextTemplate = Pick<
    Database["public"]["Tables"]["estimate_text_templates"]["Row"],
    "id" | "name" | "html"
  >;

  const [textTemplates, setTextTemplates] = useState<TextTemplate[]>([]);
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [pendingTemplateHtml, setPendingTemplateHtml] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedTemplateIdx, setSelectedTemplateIdx] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [locDetails, setLocDetails] = useState<LocationDetails | null>(null);

  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(section?.title || "");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [suppliers, setSuppliers] = useState<ProductSupplier[]>([]);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<FieldConfig | null>(null);
  const [currentPath, setCurrentPath] = useState<FieldPath | null>(null);
  const [currentTabIndex, setCurrentTabIndex] = useState<number | null>(null);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(true);
  // EagleView order configuration (not persisted)
  const [propertyType, setPropertyType] = useState<string>("residential");
  const [roofProduct, setRoofProduct] = useState<number>(PrimaryProductId.PremiumResidential);
  const [deliveryInstruction, setDeliveryInstruction] = useState<number>(DeliveryProductId.RegularDelivery);
  const [measurementInstruction, setMeasurementInstruction] = useState<number>(MeasurementInstructionType.PrimaryStructureOnly);
  const [promoCode, setPromoCode] = useState<string>("");
  const [isDeleteTabDialogOpen, setIsDeleteTabDialogOpen] = useState(false);
  const [tabToDelete, setTabToDelete] = useState<{ sectionId: number; tabId: string } | null>(null);
  const [isEagleViewAuthorized, setIsEagleViewAuthorized] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<EagleViewProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isQuickMeasureAuthorized, setIsQuickMeasureAuthorized] = useState(false);
  const [isCheckingSiteStatus, setIsCheckingSiteStatus] = useState(false);
  const [siteStatusData, setSiteStatusData] = useState<QuickMeasureSiteStatusResponse | null>(null);
  const [coverageData, setCoverageData] = useState<QuickMeasureCoverageCheckResponse | null>(null);
  const [isCheckingCoverage, setIsCheckingCoverage] = useState(false)
  const [partnerDetails, setPartnerDetails] = useState<PartnerDetailsResponse | null>(null);
  const [isLoadingPartnerDetails, setIsLoadingPartnerDetails] = useState(false);
  const [quickMeasureOrderData, setQuickMeasureOrderData] = useState<QuickMeasureOrderResponse | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [quickMeasureOrderDetail, setQuickMeasureOrderDetail] = useState<QuickMeasureOrderDetail | null>(null);
  const quickMeasureStatusRef = useRef<string>("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [reportBlobUrl, setReportBlobUrl] = useState<string | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [isFetchingOrderDetail, setIsFetchingOrderDetail] = useState(false);
  const [rendererKey, setRendererKey] = useState<string | null | undefined>(undefined);
  const formDataLoadedRef = useRef(false);

  const getSectionValues = (sectionId: number | string) =>
    formValues[sectionId] as Record<string, unknown> | undefined;

  const activeSectionValues = getSectionValues(activeSection) ?? {};
  const sv = formValues[activeSection] as Record<string, unknown>;
  const reportData = sv?.eagleview_report_data as Record<string, unknown> | undefined;
  const orderDetail = sv?.quickmeasure_order_detail as Record<string, unknown> | undefined;

  const eagleviewReportData = (formValues[activeSection] as Record<string, unknown>)
    ?.eagleview_report_data as {
      displayStatus?: string;
      status?: string;
      reportDownloadLink?: string;
    } | undefined;

  const eagleviewReportStatus = (formValues[activeSection] as Record<string, unknown>)
    ?.eagleview_report_status as number | undefined;

    const asString = (val: unknown): string => 
  typeof val === 'string' ? val : String(val ?? '');
  const loadQuickMeasureReport = async (reportUrl: string) => {
    setIsLoadingReport(true);
    try {
      const blob = await quickMeasureMeasurementOrdersService.downloadReport(reportUrl);
      const blobUrl = URL.createObjectURL(blob);
      setReportBlobUrl(blobUrl);
    } catch (error) {
      console.error("Error loading report:", error);
      toast({ title: "Report Load Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoadingReport(false);
    }
  };

  useEffect(() => {
    const reportUrl = quickMeasureOrderDetail?.reportUrl || formValues[activeSection]?.quickmeasure_report_url;
    const isCompleted = ["success", "completed"].includes(
      asString(formValues[activeSection]?.quickmeasure_order_status).toLowerCase()
    );

    if (reportUrl && isCompleted && !reportBlobUrl) {
      loadQuickMeasureReport(reportUrl);
    }
  }, [
    quickMeasureOrderDetail?.reportUrl,
    formValues[activeSection]?.quickmeasure_report_url,
    formValues[activeSection]?.quickmeasure_order_status,
  ]);


  useEffect(() => {
    quickMeasureStatusRef.current =
      asString(formValues[activeSection]?.quickmeasure_order_status).toLowerCase();
  }, [formValues, activeSection]);

  const getContactAddress = (): string => {
    if (contact?.location?.address) {
      const parts = [
        contact.location.address,
        contact.location.city,
        contact.location.state,
        contact.location.postalCode,
      ].filter(Boolean);
      return parts.join(", ");
    } else if (contact?.address1 || contact?.city) {
      const parts = [
        contact.address1,
        contact.city,
        contact.state,
        contact.postalCode,
      ].filter(Boolean);
      return parts.join(", ");
    }
    return contact?.address || "";
  };

  // Helper functions for EagleView products
  const getSelectedProduct = () => availableProducts.find(p => p.productID === roofProduct);

  const matchesPropertyType = (product: EagleViewProduct, type: string) => {
    const productName = product.name?.toLowerCase() || "";
    const isCommercial = type === "commercial" || type === "multi-family";

    if (isCommercial) {
      return product.TypeOfStructure === 2 || productName.includes("commercial");
    }
    return product.TypeOfStructure === 1 && !productName.includes("commercial");
  };

  const getAvailableDeliveryOptions = (product: EagleViewProduct) => {
    const deliveryOptions = product?.deliveryProducts || [];
    return deliveryOptions.filter(d => !d.isTemporarilyUnavailable);
  };

  const getMeasurementInstructionLabel = (type: number): string => {
    switch (type) {
      case MeasurementInstructionType.PrimaryPlusDetachedGarage:
        return "Primary Structure + Detached Garage";
      case MeasurementInstructionType.PrimaryStructureOnly:
        return "Primary Structure Only";
      case MeasurementInstructionType.AllStructuresOnParcel:
        return "All Structures on Parcel";
      case MeasurementInstructionType.CommercialComplex:
        return "Commercial Complex";
      case MeasurementInstructionType.Other:
        return "Other";
      default:
        return "Unknown";
    }
  };

  const getFilteredProducts = () => {
    return availableProducts.filter(product => matchesPropertyType(product, propertyType));
  };

  async function fetchLocationDetails() {
    const storedCredentials = localStorage.getItem("smartroofing_credentials");
    if (storedCredentials) {
      try {
        const credentials = JSON.parse(storedCredentials);
        const locationDetails = await ghlService.getLocationDetails(credentials);

        setLocDetails(locationDetails || null);
      } catch (error) {
        console.error("Error parsing stored credentials:", error);
        localStorage.removeItem("smartroofing_credentials");
      }
    }
  }

  useEffect(() => {
    fetchLocationDetails();
  }, []);

  const { toast } = useToast();

  // Check EagleView OAuth authorization
  useEffect(() => {
    const checkAuthorization = async () => {
      if (activeSection === MeasurementsPageId) {
        const authorized = await eagleViewOAuthService.isAuthorized();
        setIsEagleViewAuthorized(authorized);
      }
    };
    checkAuthorization();
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== MeasurementsPageId) return;
    if (!estimate?.id) return;

    const sv = formValues[activeSection] as Record<string, unknown>;

    const isQuickMeasure =
      sv?.measurement_provider === "quickmeasure" ||
      sv?.measurementsReportMode === "quickmeasure";

    if (!isQuickMeasure) return;

    const isAlreadyDone = ["success", "completed"].includes(
      (sv?.quickmeasure_order_status as string | undefined)?.toLowerCase() ?? ""
    );

    const sectionVals = formValues[activeSection] as Record<string, unknown>;
    const existingMeasurements = (sectionVals?.manualMeasurements as Record<string, unknown>) || {};
    const requiredKeys = ["step_flashing_ft", "wall_flashing_ft"];
    const hasMeasurements =
      Object.keys(existingMeasurements).length > 0 &&
      Object.values(existingMeasurements).some(v => Number(v) !== 0) &&
      requiredKeys.every(k => k in existingMeasurements);

    if (isAlreadyDone && !hasMeasurements) {

      const orderDetail = (sv?.quickmeasure_order_detail as Record<string, unknown> | undefined);
      const reportMeta = orderDetail?.reportMetaData as Record<string, unknown> | undefined;
      if (reportMeta) {
        const derivedMeasurements: Record<string, string> = {};

        if (reportMeta.Area != null)
          derivedMeasurements.roof_area_sqft = String(reportMeta.Area);
        if (reportMeta.Facets != null)
          derivedMeasurements.roof_facets = String(reportMeta.Facets);
        if (reportMeta.Pitch != null) {
          const pitchStr = String(reportMeta.Pitch);
          derivedMeasurements.pitch = pitchStr.includes("/")
            ? pitchStr.split("/")[0]
            : pitchStr;
          derivedMeasurements.pitch_display = pitchStr;
        }
        if (reportMeta.Ridges != null)
          derivedMeasurements.ridges_ft = String(reportMeta.Ridges);
        if (reportMeta.Hips != null)
          derivedMeasurements.hips_ft = String(reportMeta.Hips);
        if (reportMeta.Valleys != null)
          derivedMeasurements.valleys_ft = String(reportMeta.Valleys);
        if (reportMeta.Rakes != null)
          derivedMeasurements.rakes_ft = String(reportMeta.Rakes);
        if (reportMeta.Eaves != null)
          derivedMeasurements.eaves_ft = String(reportMeta.Eaves);
        if (reportMeta.Bends != null)
          derivedMeasurements.bends_ft = String(reportMeta.Bends);
        if (reportMeta.Step != null)
          derivedMeasurements.step_flashing_ft = String(reportMeta.Step);
        if (reportMeta.Flash != null)
          derivedMeasurements.wall_flashing_ft = String(reportMeta.Flash);
        if (reportMeta.LeakBarrier != null)
          derivedMeasurements.attic_sqft = String(reportMeta.LeakBarrier);

        const ridges = Number(derivedMeasurements.ridges_ft || 0);
        const hips = Number(derivedMeasurements.hips_ft || 0);
        if (ridges > 0 || hips > 0) {
          derivedMeasurements.ridges_hips_ft = String(ridges + hips);
        }

        if (Object.keys(derivedMeasurements).length > 0) {
          setFormValues(prev => ({
            ...prev,
            [MeasurementsPageId]: {
              ...prev[MeasurementsPageId],
              manualMeasurements: derivedMeasurements,
            },
          }));
          return;
        }
      }

      const fetchFreshMeasurements = async () => {
        try {
          const { data: freshEstimate } = await supabase
            .from("estimate_documents_v2")
            .select("form_data")
            .eq("id", estimate.id)
            .single();

          if (freshEstimate?.form_data) {
            const freshFormData = freshEstimate.form_data as FormValues;
            const freshMeasurements = freshFormData?.[MeasurementsPageId]?.manualMeasurements;

            if (freshMeasurements && Object.keys(freshMeasurements).length > 0) {
              setFormValues(prev => ({
                ...prev,
                [MeasurementsPageId]: {
                  ...prev[MeasurementsPageId],
                  manualMeasurements: freshMeasurements,
                },
              }));
            }
          }
        } catch (err) {
          console.error("Failed to fetch fresh measurements:", err);
        }
      };

      fetchFreshMeasurements();
    }
  }, [activeSection, estimate?.id, formValues[MeasurementsPageId]?.quickmeasure_order_detail]);

  // Fetch available EagleView products
  useEffect(() => {
    const fetchProducts = async () => {
      if (activeSection === MeasurementsPageId && isEagleViewAuthorized) {
        setIsLoadingProducts(true);
        try {
          const products = await measurementOrdersService.getAvailableProducts();
          setAvailableProducts(products);
        } catch (error) {
          console.error("Error fetching available products:", error);
        } finally {
          setIsLoadingProducts(false);
        }
      }
    };
    fetchProducts();
  }, [activeSection, isEagleViewAuthorized]);

  // Auto-select appropriate roof product based on property type
  useEffect(() => {
    if (availableProducts.length > 0) {
      const matchingProduct = availableProducts.find(product => matchesPropertyType(product, propertyType));
      if (matchingProduct) {
        setRoofProduct(matchingProduct.productID);
      }
    } else {
      // Fallback to hardcoded values if products not loaded
      const isCommercial = propertyType === "commercial" || propertyType === "multi-family";
      setRoofProduct(isCommercial ? PrimaryProductId.PremiumCommercial : PrimaryProductId.PremiumResidential);
    }
  }, [propertyType, availableProducts]);

  // Auto-select default delivery and measurement options when roof product changes
  useEffect(() => {
    if (availableProducts.length > 0) {
      const selectedProduct = getSelectedProduct();

      if (selectedProduct) {
        // Select first available delivery option
        const availableDeliveries = getAvailableDeliveryOptions(selectedProduct);
        if (availableDeliveries.length > 0) {
          setDeliveryInstruction(availableDeliveries[0].productID);
        }

        // Select first available measurement instruction
        const measurementOptions = selectedProduct.measurementInstructionTypes || [];
        if (measurementOptions.length > 0) {
          setMeasurementInstruction(measurementOptions[0]);
        }
      }
    } else {
      // Fallback to hardcoded defaults
      setMeasurementInstruction(MeasurementInstructionType.PrimaryStructureOnly);
      setDeliveryInstruction(DeliveryProductId.RegularDelivery);
    }
  }, [roofProduct, availableProducts]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((expandedSections) => {
      const old_expandedSections = { ...expandedSections };
      old_expandedSections[sectionId] = !old_expandedSections[sectionId];
      return old_expandedSections;
    });
    // const newExpanded = new Set();
    // if (expandedSections[sectionId]) {
    //   setExpandedSections(newExpanded);
    // } else {
    //   newExpanded.add(sectionId);
    //   setExpandedSections(newExpanded);
    // }
  }; //add new

  // useEffect(() => {
  //   if (estimate && estimate.id) {
  //     setSectionUpdates([]);
  //     setFormValues((estimate as any)?.form_data || {});
  //   }
  // }, [estimate]);

  useEffect(() => {
    let cancelled = false;

    const resolveRendererKey = async () => {
      try {
        let key: string = "standard";

        if (estimate?.id) {
          const resolved = await templateService.getRendererKeyForDocument(estimate.id);
          // null/undefined means "no override" → use default
          key = resolved ?? "standard";
        } else if (locationId) {
          const tmpl = await templateService.getDefaultTemplateForLocation(locationId);
          key = tmpl?.renderer_key ?? "standard";
        }

        if (!isRendererKeyRegistered(key) && key !== "standard") {
          console.warn(
            `[EstimatesContainer] renderer_key "${key}" is not in TEMPLATE_REGISTRY. ` +
            `Falling back to "standard".`
          );
          key = "standard";
        }

        if (!cancelled) setRendererKey(key);
      } catch (err) {
        // Always log so the failure is observable, then degrade gracefully
        console.error(
          "[EstimatesContainer] Failed to resolve renderer key:",
          err instanceof Error ? err.message : err
        );
        if (!cancelled) setRendererKey("standard");
      }
    };

    resolveRendererKey();
    return () => { cancelled = true; };
  }, [estimate?.id, locationId]);

  useEffect(() => {
    if (estimate && estimate.id) {
      setSectionUpdates(estimate?.config_data?.sections || []);

      const existingFormData = estimate?.form_data || {};

    if (contact?.firstName || contact?.lastName || contact?.email) {
      let contactAddress = "";
      if (contact?.location?.address) {
        const parts = [
          contact.location.address,
          contact.location.city,
          contact.location.state,
          contact.location.postalCode,
        ].filter(Boolean);
        contactAddress = parts.join(", ");
      } else if (contact?.address1 || contact?.city) {
        const parts = [contact.address1, contact.city, contact.state, contact.postalCode].filter(Boolean);
        contactAddress = parts.join(", ");
      } else {
        contactAddress = contact?.address || "";
      }

      const mergedTitlePage = {
        ...existingFormData?.[titlePageId],
        first_name: existingFormData?.[titlePageId]?.first_name || contact?.firstName || "",
        last_name: existingFormData?.[titlePageId]?.last_name || contact?.lastName || "",
        address: existingFormData?.[titlePageId]?.address || contact?.location?.address || contact?.address1 || contact?.address || "",
        city: existingFormData?.[titlePageId]?.city || contact?.location?.city || contact?.city || "",
        state: existingFormData?.[titlePageId]?.state || contact?.location?.state || contact?.state || "",
        zip_code: existingFormData?.[titlePageId]?.zip_code || contact?.location?.postalCode || contact?.postalCode || "",
        company_name: existingFormData?.[titlePageId]?.company_name || "",
      };

      const mergedMeasurementsPage = {
        ...existingFormData?.[4],
        home_address: existingFormData?.[4]?.home_address || contactAddress,
        eagleview_report_id: existingFormData?.[4]?.eagleview_report_id || contact?.customField?.find((f) => f.key === "contact.eagleview_report_id")?.value || "",
        eagleview_order_id: existingFormData?.[4]?.eagleview_order_id || contact?.customField?.find((f) => f.key === "contact.eagleview_order_id")?.value || "",
        eagleview_report_status: existingFormData?.[4]?.eagleview_report_status || contact?.customField?.find((f) => f.key === "contact.eagleview_report_status")?.value || "",
        eagleview_report_url: existingFormData?.[4]?.eagleview_report_url || contact?.customField?.find((f) => f.key === "contact.eagleview_report_url")?.value || "",
        quickmeasure_gaf_order_number: existingFormData?.[4]?.quickmeasure_gaf_order_number || contact?.customField?.find((f) => f.key === "contact.quickmeasure_gaf_order_number")?.value,
        quickmeasure_subscriber_order_number: existingFormData?.[4]?.quickmeasure_subscriber_order_number || contact?.customField?.find((f) => f.key === "contact.quickmeasure_subscriber_order_number")?.value,
        quickmeasure_order_status: existingFormData?.[4]?.quickmeasure_order_status || contact?.customField?.find((f) => f.key === "contact.quickmeasure_order_status")?.value,
        quickmeasure_report_url: existingFormData?.[4]?.quickmeasure_report_url || contact?.customField?.find((f) => f.key === "contact.quickmeasure_report_url")?.value,
      };

      const authSection = existingFormData?.[AuthPageId] as Record<string, unknown> | undefined;
      const authArrays = authSection?.arrays as Record<string, unknown> | undefined;
      const primarySigners = (authArrays?.primary_signers as Record<string, PrimarySigner>) || {};
      const foundKey = Object.keys(primarySigners).find(
        (key) =>
          primarySigners[key]?.first_name === contact?.firstName &&
          primarySigners[key]?.last_name === contact?.lastName &&
          primarySigners[key]?.email === contact?.email,
      );

      const updatedFormData = {
        ...existingFormData,
        [titlePageId]: mergedTitlePage,
        4: mergedMeasurementsPage,
      };

      if (!foundKey && contact?.email) {
        updatedFormData[AuthPageId] = {
          ...(existingFormData?.[AuthPageId] || {}),
          arrays: {
            ...(existingFormData?.[AuthPageId]?.arrays || {}),
            primary_signers: {
              ...primarySigners,
              [`ac613f9c-8465-4ce2-9c21-cd50ca867c6a`]: {
                email: contact?.email,
                last_name: contact?.lastName,
                first_name: contact?.firstName,
              },
            },
          },
        };
      }

      setFormValues(updatedFormData);
    } else {
      setFormValues(existingFormData);
    }
    } else {
      const formValuesTemp = estimate?.form_data || externalFormValues || {};

      if (contact?.firstName && contact?.lastName && contact?.email) {
        const authSectionTemp = formValuesTemp?.[AuthPageId] as Record<string, unknown> | undefined;
        const authArraysTemp = authSectionTemp?.arrays as Record<string, unknown> | undefined;
        const primarySigners = (authArraysTemp?.primary_signers as Record<string, PrimarySigner>) || {};
        const foundKey = Object.keys(primarySigners).find(
          (key) =>
            primarySigners[key]?.first_name === contact?.firstName &&
            primarySigners[key]?.last_name === contact?.lastName &&
            primarySigners[key]?.email === contact?.email,
        );

        // Extract address from contact
        let contactAddress = "";
        if (contact?.location?.address) {
          const parts = [
            contact.location.address,
            contact.location.city,
            contact.location.state,
            contact.location.postalCode,
          ].filter(Boolean);
          contactAddress = parts.join(", ");
        } else if (contact?.address1 || contact?.city) {
          const parts = [contact.address1, contact.city, contact.state, contact.postalCode].filter(Boolean);
          contactAddress = parts.join(", ");
        } else {
          contactAddress = contact?.address || "";
        }

        // Prepare updated form values
        const updatedFormValues = {
          ...formValuesTemp,
          [titlePageId]: {
            ...(formValuesTemp?.[titlePageId] || {}),
            first_name: contact?.firstName,
            last_name: contact?.lastName,
            address: contact?.location?.address || contact?.address1 || contact?.address || "",
            city: contact?.location?.city || contact?.city || "",
            state: contact?.location?.state || contact?.state || "",
            zip_code: contact?.location?.postalCode || contact?.postalCode || "",
            company_name: "",
          },
          // Pre-fill Measurements Report section (section 4) with address and EagleView data from GHL
          4: {
            ...(formValuesTemp?.[4] || {}),
            home_address: formValuesTemp?.[4]?.home_address || contactAddress,
            // Retrieve EagleView data from contact custom fields if available
            eagleview_report_id:
              formValuesTemp?.[4]?.eagleview_report_id ||
              contact?.customField?.find((f) => f.key === "contact.eagleview_report_id")?.value ||
              "",
            eagleview_order_id:
              formValuesTemp?.[4]?.eagleview_order_id ||
              contact?.customField?.find((f) => f.key === "contact.eagleview_order_id")?.value ||
              "",
            eagleview_report_status:
              formValuesTemp?.[4]?.eagleview_report_status ||
              contact?.customField?.find((f) => f.key === "contact.eagleview_report_status")?.value ||
              "",
            eagleview_report_url:
              formValuesTemp?.[4]?.eagleview_report_url ||
              contact?.customField?.find((f) => f.key === "contact.eagleview_report_url")?.value ||
              "",

            quickmeasure_gaf_order_number:
              formValuesTemp?.[4]?.quickmeasure_gaf_order_number ||
              contact?.customField?.find((f) => f.key === "contact.quickmeasure_gaf_order_number")?.value,

            quickmeasure_subscriber_order_number:
              formValuesTemp?.[4]?.quickmeasure_subscriber_order_number ||
              contact?.customField?.find((f) => f.key === "contact.quickmeasure_subscriber_order_number")?.value,

            quickmeasure_order_status:
              formValuesTemp?.[4]?.quickmeasure_order_status ||
              contact?.customField?.find((f) => f.key === "contact.quickmeasure_order_status")?.value,

            quickmeasure_report_url:
              formValuesTemp?.[4]?.quickmeasure_report_url ||
              contact?.customField?.find((f) => f.key === "contact.quickmeasure_report_url")?.value,
          },
        };

        // Conditionally add new primary signer if not found
        if (!foundKey) {
          const primarySignersUpdated = {
            ...primarySigners,
            [`ac613f9c-8465-4ce2-9c21-cd50ca867c6a`]: {
              email: contact?.email,
              last_name: contact?.lastName,
              first_name: contact?.firstName,
            },
          };

          updatedFormValues[AuthPageId] = {
            ...(formValuesTemp?.[AuthPageId] || {}),
            arrays: {
              ...(formValuesTemp?.[AuthPageId]?.arrays || {}),
              primary_signers: primarySignersUpdated,
            },
          };
        }

        // Finally, perform a single state update
        setFormValues(updatedFormValues);
      }
    }
  }, [contact, estimate]);

  useEffect(() => {
    const section = sectionUpdates?.find((sec) => sec.id === activeSection);
    setTitle(section?.title);
  }, [sectionUpdates, activeSection]);

  // Auto-fetch report status when navigating to Measurements Report section
  useEffect(() => {
    // Check if we're on the Measurements Report section
    if (activeSection !== MeasurementsPageId) return;

    // Check formValues for report data
    const reportId = formValues[activeSection]?.eagleview_report_id;
    const reportStatus = formValues[activeSection]?.eagleview_report_status;
    const reportUrl = formValues[activeSection]?.eagleview_report_url;

    // Also check contact's custom fields for EagleView data
    const contactReportId = contact?.customField?.find((f) => f.key === "contact.eagleview_report_id")?.value;
    const contactReportStatus = contact?.customField?.find((f) => f.key === "contact.eagleview_report_status")?.value;
    const contactReportUrl = contact?.customField?.find((f) => f.key === "contact.eagleview_report_url")?.value;

    // Use contact data as fallback if formValues not yet populated
    const effectiveReportId = reportId || contactReportId;
    const effectiveReportStatus = reportStatus || contactReportStatus;
    const effectiveReportUrl = reportUrl || contactReportUrl;

    // Only auto-fetch if:
    // 1. We're on the Measurements Report section (activeSection === MeasurementsPageId)
    // 2. A report ID exists (from either formValues or contact)
    // 3. Status is not Completed (5); OR No report URL exists
    if (effectiveReportId && (effectiveReportStatus !== ReportStatus.Completed || !effectiveReportUrl)) {
      handleGetEagleViewOrder();
    }
  }, [activeSection]); // Run when activeSection changes

  // Initialize form values and UUIDs when section changes
  // React.useEffect(() => {
  //   if (activeSection && !formValues[activeSection]) {
  //     setFormValues((prev) => ({
  //       ...prev,
  //       [activeSection]: {},
  //     }));
  //   }
  // }, [activeSection]);

  // Sync external form values with internal state
  // React.useEffect(() => {
  //   if (externalFormValues && Object.keys(externalFormValues).length) {
  //     setFormValues(externalFormValues);
  //   }
  // }, [externalFormValues]);

  // Sync internal form values with external state
  React.useEffect(() => {
    if (setExternalFormValues) {
      setExternalFormValues(() => {
        return formValues
      });
    }

  }, [formValues, setExternalFormValues]);

  // Commented to reduce infinite rendering, but this was solving issue of blank pdf generation.
  // useEffect(() => {
  //   if (activeSection === 6) {
  //     // TODO: This is to rerender fields so that PDF gets updated
  //     handleFieldChange("description", "", {}, 0);
  //   }
  // }, [formValues, activeSection]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const [productsList, categoriesList, suppliersList] = await Promise.all([
          productService.getProducts(),
          productService.getCategories(),
          productService.getSuppliers(),
        ]);

        setProducts(productsList);
        setCategories(categoriesList);
        setSuppliers(suppliersList);
      } catch (error) {
        console.error("Error fetching catalog data:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load products catalog",
          variant: "destructive",
        });
      }
    };

    fetchProducts();
  }, [toast]);
  
  useEffect(() => {
    if (products.length === 0) return;

    const measurementContext = getMeasurementContext(formValues);
    const formulasByKey = new Map<string, string>();
    products.forEach((p) => {
      const meta = getProductFormulaMeta(p);
      if (meta?.key && meta.expression) formulasByKey.set(meta.key, meta.expression);
    });

    const quoteSection = sectionUpdates?.find((sec) => sec.id === QuoteID);
    if (!quoteSection?.tabs) return;

    setFormValues((prev) => {
      const updated = JSON.parse(JSON.stringify(prev));
      let hasChanges = false;

      quoteSection.tabs.forEach((tab: TabConfig) => {
        const tabId = String(tab.id);
        const sections = updated[QuoteID]?.tabs?.[tabId]?.arrays?.sections;
        if (!sections) return;

        Object.keys(sections).forEach((sectionId) => {
          const items = sections[sectionId]?.items;
          if (!items) return;

          Object.keys(items).forEach((itemId) => {
            const item = items[itemId];
            if (!item?.is_catalog_item || !item?.catalog_product_id) return;

            // Skip if manually edited
            const quantityKey = `${tabId}-${sectionId}-${itemId}`;
            if (manuallyEditedQuantityKeys.current.has(quantityKey)) return;

            const product = products.find((p) => p.id === item.catalog_product_id);
            if (!product) return;

            const evalResult = evaluateFormulaForProduct(
              product,
              formulasByKey,
              measurementContext,
              product.wastage_percentage
            );

            if (evalResult.value !== null) {
              const newQty = Math.max(0, Math.ceil(evalResult.value));
              if (items[itemId].quantity !== newQty) {
                updated[QuoteID].tabs[tabId].arrays.sections[sectionId].items[itemId].quantity = newQty;
                hasChanges = true;
              }
            }
          });
        });
      });

      return hasChanges ? updated : prev;
    });
  }, [
    formValues[MeasurementsPageId]?.manualMeasurements,
    formValues[MeasurementsPageId]?.eagleview_report_data,
    formValues[MeasurementsPageId]?.measurementsReportMode,
    products,
    sectionUpdates,
  ]);

  useEffect(() => {
    const checkAuthorization = async () => {
      if (activeSection === MeasurementsPageId) {
        const authorized = await quickMeasureOAuthService.isAuthorized();
        setIsQuickMeasureAuthorized(authorized);
      }
    };
    checkAuthorization();
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== MeasurementsPageId) return;

    if (!estimate?.id) return;
    if (!formDataLoadedRef.current) return;

    const isQuickMeasure =
      formValues[activeSection]?.measurement_provider === "quickmeasure" ||
      formValues[activeSection]?.measurementsReportMode === "quickmeasure";

    if (!isQuickMeasure) return;
    if (!ghlCredentials || !contactId) return;

    const hasOrder = !!formValues[activeSection]?.quickmeasure_gaf_order_number;
    const isAlreadyDone = ["success", "completed"].includes(
      formValues[activeSection]?.quickmeasure_order_status?.toLowerCase() ?? ""
    );

    if (isAlreadyDone) return;
    const syncFromGHL = async () => {
  try {
    if (!opportunityId) return;

      const response = await fetch(`${API_BASE_URL}/opportunities/${opportunityId}`, {
      method: "GET",
          headers: getHeaders(ghlCredentials),
        });

        if (!response.ok) return;

        const data = await response.json();
        const customFields: Array<{ key?: string; value?: string }> = data?.opportunity?.customFields || [];

        const ghlStatus = customFields.find(
          (f) => f.key === "quickmeasure_order_status"
        )?.value;

        const ghlGafOrderNumber = customFields.find(
          (f) => f.key === "quickmeasure_gaf_order_number"
        )?.value;

        const ghlSubscriberOrderNumber = customFields.find(
          (f) => f.key === "quickmeasure_subscriber_order_number"
        )?.value;

        const ghlReportUrl = customFields.find(
          (f) => f.key === "quickmeasure_report_url"
        )?.value;

        const hasGHLOrder = !!(
          formValues[activeSection]?.quickmeasure_gaf_order_number || ghlGafOrderNumber
        );
        if (!hasGHLOrder) return;

        setFormValues((prev) => {
          const prevStatus = prev[activeSection]?.quickmeasure_order_status;
          const prevUrl = prev[activeSection]?.quickmeasure_report_url;

          if (
            ghlStatus === prevStatus &&
            ghlReportUrl === prevUrl &&
            ghlGafOrderNumber === prev[activeSection]?.quickmeasure_gaf_order_number &&
            ghlSubscriberOrderNumber === prev[activeSection]?.quickmeasure_subscriber_order_number
          ) {
            return prev;
          }

          return {
            ...prev,
            [activeSection]: {
              ...prev[activeSection],
              quickmeasure_gaf_order_number:
                ghlGafOrderNumber || prev[activeSection]?.quickmeasure_gaf_order_number,
              quickmeasure_subscriber_order_number:
                ghlSubscriberOrderNumber || prev[activeSection]?.quickmeasure_subscriber_order_number,
              quickmeasure_order_status:
                ghlStatus !== undefined && ghlStatus !== null ? ghlStatus : prev[activeSection]?.quickmeasure_order_status,

              quickmeasure_report_url:
                ghlReportUrl !== undefined && ghlReportUrl !== null ? ghlReportUrl : prev[activeSection]?.quickmeasure_report_url,
            },
          }
        });

        if (["success", "completed"].includes(ghlStatus?.toLowerCase() ?? "")) {
          clearInterval(intervalRef.current);

          if (estimate?.id) {
            const { data: freshEstimate } = await supabase
              .from("estimate_documents_v2")
              .select("form_data")
              .eq("id", estimate.id)
              .single();

            if (freshEstimate?.form_data) {
              const freshFormData = freshEstimate.form_data as FormValues;
              const freshMeasurements = freshFormData?.[MeasurementsPageId]?.manualMeasurements;

              if (freshMeasurements) {
                setFormValues(prev => ({
                  ...prev,
                  [MeasurementsPageId]: {
                    ...prev[MeasurementsPageId],
                    manualMeasurements: freshMeasurements,
                  },
                }));
              }
            }
          }
          if (onSaveRequested) {
            onSaveRequested(undefined, sectionUpdates);
          }
        }
      } catch (error) {
        console.error("Error syncing QuickMeasure status from GHL:", error);
      }
    };

    syncFromGHL();

    if (hasOrder && !isAlreadyDone) {
      intervalRef.current = setInterval(syncFromGHL, 30_000);
      return () => clearInterval(intervalRef.current);
    }
  }, [activeSection, ghlCredentials, contactId, estimate?.id, formValues[MeasurementsPageId]?.quickmeasure_order_status]);

  // useEffect(() => {
  //   if (activeSection !== MeasurementsPageId) return;
  //   if (formValues[activeSection]?.measurement_provider !== "quickmeasure") return;

  //   if (formValues[activeSection]?.quickmeasure_home_address?.trim()) return;

  //   const contactAddress = getContactAddress();
  //   if (contactAddress) {
  //     handleFieldChange("quickmeasure_home_address", contactAddress, {}, null);
  //   }
  // }, [activeSection, formValues[activeSection]?.measurement_provider]);
  const getMeasurementContext = React.useCallback((sourceFormValues: FormValues): Record<string, number> => {
    const context: Record<string, number> = {};
    measurementTypes.forEach((mt) => {
      context[mt.key] = 0;
    });

    const measurementSection = sourceFormValues?.[MeasurementsPageId] || {};
    const mode = measurementSection?.measurementsReportMode ?? "manual";
    const manualMeasurements = measurementSection?.manualMeasurements || {};

    Object.entries(manualMeasurements).forEach(([key, raw]) => {
      const num = Number(raw);
      if (Number.isFinite(num)) context[key] = num;
    });

    const ridges = Number(manualMeasurements["ridges_ft"]) || 0;
    const hips = Number(manualMeasurements["hips_ft"]) || 0;
    if ((ridges > 0 || hips > 0) && !manualMeasurements["ridges_hips_ft"]) {
      context["ridges_hips_ft"] = ridges + hips;
    }

    if (mode === "eagleview") {
      const report = (measurementSection?.eagleview_report_data || {}) as Partial<{
        lengthRidge: string | number;
        lengthHip: string | number;
        area: string | number;
        totalRoofFacets: string | number;
        pitch: string | number;
        lengthValley: string | number;
        lengthRake: string | number;
        lengthEave: string | number;
      }>;
      const ridge = Number(report.lengthRidge) || 0;
      const hip = Number(report.lengthHip) || 0;
      const eagleMap: Record<string, number> = {
        roof_area_sqft: Number(report.area) || 0,
        roof_facets: Number(report.totalRoofFacets) || 0,
        pitch: Number(report.pitch) || 0,
        ridges_hips_ft: ridge + hip,
        ridges_ft: ridge,
        hips_ft: hip,
        valleys_ft: Number(report.lengthValley) || 0,
        rakes_ft: Number(report.lengthRake) || 0,
        eaves_ft: Number(report.lengthEave) || 0,
      };

      Object.entries(eagleMap).forEach(([key, val]) => {
        if (Number.isFinite(val)) context[key] = val;
      });
    }

    return context;
  }, []);

  /** Formula from formulas_v2 only (attached to product by getProducts()). */
  const getProductFormulaMeta = React.useCallback((product: Product): { key: string; expression: string } | null => {
    const f = product.formula_v2;
    if (!f || typeof f.expression !== "string" || !f.expression.trim()) return null;
    return {
      key: f.key || (product.name || "formula").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "formula",
      expression: f.expression.trim(),
    };
  }, []);

  const evaluateFormulaForProduct = React.useCallback(
    (
      product: Product,
      formulasByKey: Map<string, string>,
      measurementContext: Record<string, number>,
      wastePercentage: number | null | undefined
    ): { value: number | null; error?: string } => {
      const productFormula = getProductFormulaMeta(product);
      if (!productFormula) return { value: null };

      const evalCache = new Map<string, number>();

      const tokenize = (expr: string): string[] => {
        return expr
          .replace(/([+\-*/()])/g, " $1 ")
          .trim()
          .split(/\s+/)
          .filter(Boolean);
      };

      const evalByExpression = (
        expression: string,
        stack: Set<string>
      ): { value: number | null; error?: string } => {
        const cacheKey = expression + Array.from(stack).sort().join(",");
        if (evalCache.has(cacheKey)) {
          return { value: evalCache.get(cacheKey)! };
        }

        const tokens = tokenize(expression);
        if (tokens.length === 0) {
          return { value: null, error: "Empty expression" };
        }

        const resolved: string[] = [];

        for (const token of tokens) {
          if (["+", "-", "*", "/", "(", ")"].includes(token)) {
            resolved.push(token);
            continue;
          }

          if (token === WASTE_PERCENTAGE_KEY) {
            resolved.push(String(Number(wastePercentage) || 0));
            continue;
          }

          if (token in measurementContext) {
            resolved.push(String(Number(measurementContext[token]) || 0));
            continue;
          }

          if (formulasByKey.has(token)) {
            if (stack.has(token)) {
              return {
                value: null,
                error: `Circular dependency: ${[...stack, token].join(" → ")}`,
              };
            }
            const nestedExpr = formulasByKey.get(token)!;
            const nextStack = new Set(stack);
            nextStack.add(token);
            const nested = evalByExpression(nestedExpr, nextStack);
            if (nested.error != null || nested.value === null) {
              return nested;
            }
            resolved.push(String(nested.value));
            continue;
          }

          const num = Number(token);
          if (Number.isFinite(num)) {
            resolved.push(String(num));
            continue;
          }

          return {
            value: null,
            error: `Unknown variable or formula: "${token}"`,
          };
        }

        const safeExpression = resolved.join(" ");
        if (!/^[0-9+\-*/().\s]+$/.test(safeExpression)) {
          return {
            value: null,
            error: `Invalid characters in expression: "${safeExpression}"`,
          };
        }

        try {
          const value = Function(`"use strict"; return (${safeExpression});`)();
          if (!Number.isFinite(value)) {
            return {
              value: null,
              error: `Expression resulted in non-finite number: ${value}`,
            };
          }
          const numValue = Number(value);
          evalCache.set(cacheKey, numValue);
          return { value: numValue };
        } catch (err) {
          return {
            value: null,
            error: `Evaluation error: ${err instanceof Error ? err.message : String(err)}`,
          };
        }
      };

      return evalByExpression(productFormula.expression, new Set([productFormula.key]));
    },
    [getProductFormulaMeta]
  );

  const generateDefaultFormValues = (sectionUpdates: SectionConfig[]) => {
    const defaultFormValues: FormValues = {};

    sectionUpdates.forEach((section, sectionIndex) => {
      const sectionId = sectionIndex + 1; // Assuming sections are 1-indexed
      defaultFormValues[sectionId] = {};

      // Process regular fields in the section
      if (section.sections && section.sections.length > 0) {
        section.sections
          .flatMap((sec) => sec.fields)
          .forEach((field) => {
            const defaultValue = getFieldDefaultValue(field);
            defaultFormValues[sectionId][field.name] = defaultValue || null;
          });
      }

      // Process arrays in the section
      const arrayFields =
        section.sections?.flatMap((sec) => sec.fields)?.filter((field) => field.type === "array") || [];
      if (arrayFields.length > 0) {
        defaultFormValues[sectionId].arrays = {};
        arrayFields.forEach((arrayField) => {
          defaultFormValues[sectionId].arrays[arrayField.name] = {};
        });
      }

      // Process tabs in the section
      if (section.tabs && section.tabs.length > 0) {
        defaultFormValues[sectionId].tabs = {};

        section.tabs.forEach((tab) => {
          defaultFormValues[sectionId].tabs[tab.id] = {};

          // Process regular fields in the tab
          if (section.template && section.template.length > 0) {
            (section.template ?? [])
              .flatMap((sec: TemplateSection) => sec.fields ?? [])
              .forEach((field) => {
                const defaultValue = getFieldDefaultValue(field);
                defaultFormValues[sectionId].tabs[tab.id][field.name] = defaultValue || null;
              });
          }

          // Process arrays in the tab
          const tabArrayFields = tab.fields?.filter((field) => field.type === "array") || [];
          if (tabArrayFields.length > 0) {
            defaultFormValues[sectionId].tabs[tab.id].arrays = {};
            tabArrayFields.forEach((arrayField) => {
              defaultFormValues[sectionId].tabs[tab.id].arrays[arrayField.name] = {};
            });
          }
        });
      }
    });

    return defaultFormValues;
  };

  const getFieldDefaultValue = (field: FieldConfig): unknown => {
    // Return the field's default value if it exists
    if (field.default !== undefined) {
      return field.default;
    }

    // Return appropriate default values based on field type
    switch (field.type) {
      case "text":
      case "email":
      case "textarea":
      case "richtext":
        return "";

      case "number":
      case "slider":
        return field.min || 0;

      case "date":
        return new Date().toISOString();

      case "dropdown":
      case "radio":
        return field.options?.[0]?.value || "";

      case "switch":
        return false;

      case "upload":
        return field.multiple ? [] : "";

      case "array":
        return {}; // Arrays start empty, items are added dynamically

      default:
        return undefined;
    }
  };

  const getFieldValue = (config: FieldConfig, path: FieldPath, tabIndex: number | null) => {
    if (!formValues[activeSection]) {
      return config.default;
    }
    const tabId = sectionUpdates.find((sec) => sec.id === activeSection)?.tabs?.[tabIndex]?.id; // sectionUpdates?.[activeSection - 1]?.tabs?.[tabIndex]?.id;
    if (tabIndex !== null && !formValues[activeSection]?.tabs?.[tabId]) {
      return config.default;
    }
    // Handle nested array fields
    if (path.parentFieldName) {
      if (tabIndex !== null) {
        return path.grandParentFieldName
          ? formValues[activeSection]?.tabs?.[tabId]?.arrays?.[path.grandParentFieldName]?.[path.parentItemId]?.[
          path.parentFieldName
          ]?.[path.itemId]?.[config.name]
          : formValues[activeSection]?.tabs?.[tabId]?.arrays?.[path.parentFieldName]?.[path.itemId]?.[config.name];
      }
      return !path.grandParentFieldName
        ? formValues[activeSection]?.arrays?.[path.parentFieldName]?.[path.itemId]?.[config.name]
        : formValues[activeSection]?.arrays?.[path.grandParentFieldName]?.[path.parentItemId]?.[path.parentFieldName]?.[
        path.itemId
        ]?.[config.name];
    }

    // Handle regular fields
    return tabIndex !== null
      ? formValues[activeSection]?.tabs?.[tabId]?.[config.name]
      : formValues[activeSection]?.[config.name];
  };

  const getFieldValueForAccordion = (fieldName: string, path: FieldPath, tabIndex: number | null) => {
    if (!formValues[activeSection]) {
      return "";
    }

    const tabId =
      tabIndex !== null ? sectionUpdates.find((sec) => sec.id === activeSection)?.tabs?.[tabIndex]?.id : null;

    // sectionUpdates?.[activeSection - 1]?.tabs?.[tabIndex]?.id

    if (tabIndex !== null && tabId) {
      if (path.grandParentFieldName) {
        return (
          formValues[activeSection]?.tabs?.[tabId]?.arrays?.[path.grandParentFieldName]?.[path.parentItemId]?.[
          path.parentFieldName
          ]?.[path.itemId]?.[fieldName] || ""
        );
      } else if (path.parentFieldName) {
        return (
          formValues[activeSection]?.tabs?.[tabId]?.arrays?.[path.parentFieldName]?.[path.itemId]?.[fieldName] || ""
        );
      }
    } else {
      if (path.grandParentFieldName) {
        return (
          formValues[activeSection]?.arrays?.[path.grandParentFieldName]?.[path.parentItemId]?.[path.parentFieldName]?.[
          path.itemId
          ]?.[fieldName] || ""
        );
      } else if (path.parentFieldName) {
        return formValues[activeSection]?.arrays?.[path.parentFieldName]?.[path.itemId]?.[fieldName] || "";
      }
    }

    return "";
  }; //add new

  const handleUpdateContactAddress = async (address: string): Promise<boolean> => {
    if (!ghlCredentials || !contactId) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/contacts/${contactId}`, {
        method: "PUT",
        headers: getHeaders(ghlCredentials),
        body: JSON.stringify({ address1: address }),
      });

      if (!response.ok) {
        throw new Error("Failed to update contact address");
      }

      toast({
        title: "Contact Updated",
        description: "Address saved to GHL contact successfully.",
      });
      return true;
    } catch (error) {
      console.error("Error updating contact address in GHL:", error);
      toast({
        title: "Address Update Failed",
        description: "Could not save address to GHL contact. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleGetSiteStatus = async () => {
    setIsCheckingSiteStatus(true);
    setSiteStatusData(null);

    try {
      const statusResponse = await quickMeasureMeasurementOrdersService.getSiteStatus();
      setSiteStatusData(statusResponse);

      const updatedFormValues = {
        ...formValues,
        [activeSection]: {
          ...formValues[activeSection],
          quickmeasure_site_status: statusResponse,
        },
      };

      if (onResetAutoSaveTimer) {
        onResetAutoSaveTimer();
      }

      setFormValues(updatedFormValues);

      if (setExternalFormValues) {
        setExternalFormValues(updatedFormValues);
      }

      toast({
        title: "Site Status Retrieved",
        description: `Service is ${statusResponse.siteStatus}. Average response time: ${statusResponse.siteAverageResponseTime} minutes`,
      });
    } catch (error) {
      console.error("Error checking site status:", error);
      toast({
        title: "Status Check Failed",
        description: error.message || "Failed to check site status",
        variant: "destructive",
      });
    } finally {
      setIsCheckingSiteStatus(false);
    }
  };

  const handleCheckCoverage = async () => {
    setIsCheckingCoverage(true);
    setCoverageData(null);

    try {
      const address = formValues[activeSection]?.quickmeasure_home_address?.trim();
      if (!address) throw new Error("Please enter an address first");

      toast({ title: "Geocoding Address", description: "Looking up coordinates…" });
      const { latitude, longitude, formattedAddress } = await googleMapsService.geocodeAddress(address);

      const productCode = (formValues[activeSection]?.quickmeasure_product_code as "SF" | "MF" | "CM") || "SF";
      const coverageRequest = quickMeasureMeasurementOrdersService.createCoverageCheckRequest(
        productCode,
        address,
        latitude,
        longitude,
      );

      const coverageResponse = await quickMeasureMeasurementOrdersService.checkCoverage(coverageRequest);
      setCoverageData(coverageResponse);

      const updatedFormValues = {
        ...formValues,
        [activeSection]: {
          ...formValues[activeSection],
          quickmeasure_coverage_check: coverageResponse,
          quickmeasure_latitude: latitude,
          quickmeasure_longitude: longitude,
        },
      };

      if (onResetAutoSaveTimer) onResetAutoSaveTimer();
      setFormValues(updatedFormValues);
      if (setExternalFormValues) setExternalFormValues(updatedFormValues);

      if (coverageResponse.success) {
        toast({
          title: "Coverage Available",
          description: "This address is covered by QuickMeasure.",
        });
      } else {
        toast({
          title: "Not Covered",
          description: coverageResponse.message || "This address is not under QuickMeasure coverage.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error checking coverage:", error);
      toast({
        title: "Coverage Check Failed",
        description: error.message || "Failed to check coverage",
        variant: "destructive",
      });
    } finally {
      setIsCheckingCoverage(false);
    }
  };

  const handleGetPartnerDetails = async () => {
    setIsLoadingPartnerDetails(true);
    setPartnerDetails(null);

    try {
      const details = await quickMeasureMeasurementOrdersService.getPartnerDetails();
      setPartnerDetails(details);

      if (onResetAutoSaveTimer) {
        onResetAutoSaveTimer();
      }

      toast({
        title: "Partner Details Retrieved",
        description: `Found ${details.subscribers.length} subscriber configuration(s)`,
      });
    } catch (error) {
      console.error("Error fetching partner details:", error);
      toast({
        title: "Failed to Get Partner Details",
        description: error.message || "Failed to retrieve partner configuration",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPartnerDetails(false);
    }
  };

  const handleCheckAccount = async (): Promise<string | null> => {
    try {
      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("quickmeasure_account_email")
        .eq("location_id", locationId)
        .single();

      if (error) {
        console.error("Supabase error:", error);
        toast({ title: "Database Error", description: error.message, variant: "destructive" });
        return null;
      }

      if (!profile) {
        toast({
          title: "Profile Not Found",
          description: `No user profile found for location ${locationId}`,
          variant: "destructive",
        });
        return null;
      }

      const email = profile.quickmeasure_account_email?.trim();
      if (!email) {
        toast({
          title: "Email Missing",
          description: "QuickMeasure account email is not set in your profile.",
          variant: "destructive",
        });
        return null;
      }

      console.log("Using QuickMeasure email:", email);
      return email;
    } catch (err) {
      console.error("Unexpected error in handleCheckAccount:", err);
      toast({ title: "Error", description: "Failed to load QuickMeasure settings", variant: "destructive" });
      return null;
    }
  };
  const handlePlaceQuickMeasureOrder = async () => {
    setIsPlacingOrder(true);
    setQuickMeasureOrderData(null);

    try {
      const sectionVals = formValues[activeSection] as Record<string, unknown>; // ADD THIS
      const sv = sectionVals;
      const address = (sectionVals?.quickmeasure_home_address as string | undefined)?.trim();
      const productCode = sectionVals?.quickmeasure_selected_product_code as string | undefined;

      if (!address) throw new Error("Please enter a property address");
      if (!productCode) throw new Error("Please select a product from the Partner Details panel before placing an order");

      // Fetch roofer's QM email from user_profiles instead of form input
      const customerEmail = await handleCheckAccount();
      if (!customerEmail) {
        setIsPlacingOrder(false);
        return;
      }

      const contactAddress = getContactAddress();
      if (!contactAddress) {
        toast({
          title: "Saving Address",
          description: "No address found on contact. Saving address to GHL first...",
        });

        const saved = await handleUpdateContactAddress(address);
        if (!saved) {
          setIsPlacingOrder(false);
          return;
        }
      }

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
      const timePart = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const suffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      const subscriberOrderNumber = `SMT-${datePart}-${timePart}-${suffix}`;

      const orderRequest = quickMeasureMeasurementOrdersService.createBasicOrderRequest(
        address,
        customerEmail,
        productCode,
        sv.quickmeasure_latitude as number | undefined,
        sv.quickmeasure_longitude as number | undefined,
        {
          subscriberOrderNumber,
          subscriberCustomField1: `${locationId}:${contactId}`,
          instructions: sv.quickmeasure_instructions as string | undefined,
          recipientEmailAddresses: customerEmail,
          checkForDuplicate: false,
        },
      );

      const orderResponse = await quickMeasureMeasurementOrdersService.placeOrder(orderRequest);

      setQuickMeasureOrderData(orderResponse);

      type FlexibleOrderResponse = QuickMeasureOrderResponse & { gafOrderNumber?: number; SubscriberOrderNumber?: string };
      const orderResp = orderResponse as FlexibleOrderResponse;
      const resolvedGAFOrderNumber =
        orderResp.gafOrderNumber ??
        orderResp.GAFOrderNumber ??
        null;

      const resolvedSubscriberOrderNumber =
        orderResp.subscriberOrderNumber ??
        orderResp.SubscriberOrderNumber ??
        subscriberOrderNumber;

      const updatedFormValues = {
        ...formValues,
        [activeSection]: {
          ...formValues[activeSection],
          quickmeasure_order: orderResponse,
          quickmeasure_gaf_order_number: resolvedGAFOrderNumber ? String(resolvedGAFOrderNumber) : null,
          quickmeasure_subscriber_order_number: resolvedSubscriberOrderNumber,
          quickmeasure_order_status: "Placed",
        },
      };

      if (onResetAutoSaveTimer) onResetAutoSaveTimer();
      setFormValues(updatedFormValues);
      if (setExternalFormValues) setExternalFormValues(updatedFormValues);

      if (onSaveRequested) {
        onSaveRequested(updatedFormValues, sectionUpdates);
      }


      if (ghlCredentials && contactId) {
        try {
          await updateQuickMeasureReport(
            ghlCredentials,
            contactId,
            resolvedGAFOrderNumber,
            resolvedSubscriberOrderNumber,
            "Placed",
            null,
            opportunityId,
          );
        } catch (ghlError) {
          console.error("Error saving QuickMeasure order to GHL:", ghlError);
        }
      }

      toast({
        title: "Order Placed",
        description: "Order status will be updated automatically."
      });

    } catch (error) {
      console.error("Error placing QuickMeasure order:", error);
      toast({
        title: "Order Failed",
        description: error.message || "Failed to place measurement order",
        variant: "destructive",
      });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleGetQuickMeasureOrderDetail = async () => {
    const gafOrderNumber =
      formValues[activeSection]?.quickmeasure_order?.GAFOrderNumber?.toString() ||
      formValues[activeSection]?.quickmeasure_gaf_order_number?.toString() ||
      contact?.customField?.find((f) => f.key === "contact.quickmeasure_gaf_order_number")?.value;

    if (!gafOrderNumber) {
      toast({
        title: "Error",
        description: "No GAF order number found. Place an order first.",
        variant: "destructive",
      });
      return;
    }

    setIsFetchingOrderDetail(true);

    try {
      toast({ title: "Fetching Report", description: "Retrieving QuickMeasure report…" });

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("quickmeasure_account_email")
        .eq("location_id", locationId)
        .single();

      const accountEmail = profile?.quickmeasure_account_email?.trim() || "";

      const detail = await quickMeasureMeasurementOrdersService.getOrderDetail(
        gafOrderNumber,
        accountEmail
      );

      if (!detail) {
        throw new Error("No order found for GAF order number " + gafOrderNumber);
      }

      setQuickMeasureOrderDetail(detail);

      const updatedFormValues = {
        ...formValues,
        [activeSection]: {
          ...formValues[activeSection],
          quickmeasure_gaf_order_number: detail.orderId,
          quickmeasure_order_status: detail.orderStatus,
          quickmeasure_report_url: detail.reportUrl || null,
          quickmeasure_order_detail: detail,
        },
      };

      if (onResetAutoSaveTimer) onResetAutoSaveTimer();
      setFormValues(updatedFormValues);
      if (setExternalFormValues) setExternalFormValues(updatedFormValues);

      if (ghlCredentials && contactId) {
        try {
          await updateQuickMeasureReport(
            ghlCredentials,
            contactId,
            detail.orderId,
            detail.subscriberOrderNumber,
            detail.orderStatus,
            detail.reportUrl || null,
             opportunityId,
          );
        } catch (ghlError) {
          console.error("Error saving QuickMeasure detail to GHL:", ghlError);
        }
      }

      toast({
        title: "Report Updated",
        description: `Status: ${detail.orderStatus}${detail.isCompleted ? " ✓" : ""}`,
      });
    } catch (error) {
      console.error("Error fetching QuickMeasure order detail:", error);
      toast({
        title: "Fetch Failed",
        description: error.message || "Failed to retrieve QuickMeasure report",
        variant: "destructive",
      });
    } finally {
      setIsFetchingOrderDetail(false);
    }
  };

  const handleFieldChange = (fieldName: string, value: unknown, path: FieldPath = {}, tabIndex: number | null) => {
    if (isLocked) return;
    // Reset auto-save timer on any field change
    if (onResetAutoSaveTimer) {
      onResetAutoSaveTimer();
    }

    setFormValues((prev) => {
      const sectionValues = prev[activeSection] || {};

      if (path.parentFieldName) {
        if (tabIndex !== null) {
          const tabId = sectionUpdates.find((sec) => sec.id === activeSection)?.tabs?.[tabIndex]?.id;
          // sectionUpdates?.[activeSection - 1]?.tabs?.[tabIndex]?.id;
          const tab = sectionValues?.tabs?.[tabId] || {};

          // ✅ Handle nested array fields inside a specific tab
          if (path.grandParentFieldName && path.parentItemId) {
            // When user manually edits quantity in Quote Details, mark so the formula sync effect won't overwrite it
            if (
              activeSection === QuoteID &&
              fieldName === "quantity" &&
              path.grandParentFieldName === "sections" &&
              path.parentFieldName === "items" &&
              path.itemId
            ) {
              const currentSectionConfig = sectionUpdates.find((sec) => sec.id === activeSection);

              // Get the catalog_product_id of the item being edited
              const currentTabId = currentSectionConfig?.tabs?.[tabIndex]?.id;
              const catalogProductId = currentTabId
                ? prev[activeSection]?.tabs?.[currentTabId]?.arrays?.sections?.[path.parentItemId]?.items?.[path.itemId]?.catalog_product_id
                : null;

              currentSectionConfig?.tabs?.forEach((tabConfig) => {
                const tId = tabConfig.id;
                const tabSections = prev[activeSection]?.tabs?.[tId]?.arrays?.sections || {};

                Object.keys(tabSections).forEach((secId) => {
                  const items = tabSections[secId]?.items || {};
                  Object.keys(items).forEach((iId) => {
                    const item = items[iId];
                    // Mark by catalog_product_id match OR exact item id match
                    const itemText = (item.text || "").trim().toLowerCase();
                    const editedItemText = (
                      prev[activeSection]?.tabs?.[currentTabId]?.arrays?.sections?.[path.parentItemId]?.items?.[path.itemId]?.text || ""
                    ).trim().toLowerCase();

                    if (
                      (catalogProductId && item.catalog_product_id === catalogProductId) ||
                      (!catalogProductId && editedItemText && itemText === editedItemText)
                    ) {
                      const key = `${tId}-${secId}-${iId}`;
                      manuallyEditedQuantityKeys.current.add(key);
                    }
                  });
                });
              });
            }
            // Check if this is a quantity/price change in Quote Details section that should propagate
            const shouldPropagate =
              activeSection === QuoteID &&
              (fieldName === "quantity" || fieldName === "price") &&
              path.grandParentFieldName === "sections" &&
              path.parentFieldName === "items" &&
              sectionPropagation[path.parentItemId] !== false; // Default to true if not set

            // First, update the current tab
            const updatedTabs = { ...sectionValues.tabs };

            updatedTabs[tabId] = {
              ...tab,
              arrays: {
                ...tab.arrays,
                [path.grandParentFieldName]: {
                  ...tab.arrays?.[path.grandParentFieldName],
                  [path.parentItemId]: {
                    ...tab.arrays?.[path.grandParentFieldName]?.[path.parentItemId],
                    [path.parentFieldName]: {
                      ...tab.arrays?.[path.grandParentFieldName]?.[path.parentItemId]?.[path.parentFieldName],
                      [path.itemId]: {
                        ...tab.arrays?.[path.grandParentFieldName]?.[path.parentItemId]?.[path.parentFieldName]?.[
                        path.itemId
                        ],
                        [fieldName]: value,
                      },
                    },
                  },
                },
              },
            };

            // Propagate to other tabs in Quote Details section if needed
            if (shouldPropagate) {
              const currentSectionConfig = sectionUpdates.find((sec) => sec.id === activeSection);
              if (currentSectionConfig?.tabs) {
                // FIX: Read from the ALREADY UPDATED tab first, then fallback to prev state
                const currentTabSections =
                  updatedTabs[tabId]?.arrays?.sections ||
                  prev[activeSection]?.tabs?.[tabId]?.arrays?.sections;

                const currentSectionTitle = currentTabSections?.[path.parentItemId]?.section_title;

                // FIX: Read current item from updatedTabs first (just updated above)
                const currentItem =
                  updatedTabs[tabId]?.arrays?.sections?.[path.parentItemId]?.items?.[path.itemId] ||
                  prev[activeSection]?.tabs?.[tabId]?.arrays?.sections?.[path.parentItemId]?.items?.[path.itemId];

                const catalogProductId = currentItem?.catalog_product_id;
                const currentItemText = (currentItem?.text || "").trim().toLowerCase();

                currentSectionConfig.tabs.forEach((tabConfig, idx) => {
                  if (idx !== tabIndex) {
                    const otherTabId = tabConfig.id;
                    const otherTabData = updatedTabs[otherTabId] || sectionValues?.tabs?.[otherTabId];
                    const otherSections =
                      updatedTabs[otherTabId]?.arrays?.sections ||
                      otherTabData?.arrays?.sections;

                    if (!otherSections) return;

                    const matchingSectionId = Object.keys(otherSections).find((secId) => {
                      if (currentSectionTitle) {
                        return otherSections[secId]?.section_title === currentSectionTitle;
                      }
                      return secId === path.parentItemId;
                    }) || path.parentItemId;

                    if (!otherSections[matchingSectionId]) return;

                    const otherSectionItems = otherSections[matchingSectionId]?.items || {};

                    const matchingItemId = Object.keys(otherSectionItems).find((iid) => {
                      const otherItem = otherSectionItems[iid];
                      if (catalogProductId && otherItem?.catalog_product_id === catalogProductId) return true;
                      if (currentItemText && (otherItem?.text || "").trim().toLowerCase() === currentItemText) return true;
                      return false;
                    });

                    if (!matchingItemId) return;

                    updatedTabs[otherTabId] = {
                      ...(updatedTabs[otherTabId] || otherTabData),
                      arrays: {
                        ...(updatedTabs[otherTabId]?.arrays || otherTabData?.arrays),
                        sections: {
                          ...(updatedTabs[otherTabId]?.arrays?.sections || otherSections),
                          [matchingSectionId]: {
                            ...(updatedTabs[otherTabId]?.arrays?.sections?.[matchingSectionId] || otherSections[matchingSectionId]),
                            items: {
                              ...(updatedTabs[otherTabId]?.arrays?.sections?.[matchingSectionId]?.items || otherSectionItems),
                              [matchingItemId]: {
                                ...otherSectionItems[matchingItemId],
                                [fieldName]: value,
                              },
                            },
                          },
                        },
                      },
                    };
                  }
                });
              }
            }

            return {
              ...prev,
              [activeSection]: {
                ...sectionValues,
                tabs: updatedTabs,
              },
            };
          }

          // ✅ Handle single-level array fields inside a specific tab
          return {
            ...prev,
            [activeSection]: {
              ...sectionValues,
              tabs: {
                ...sectionValues.tabs,
                [tabId]: {
                  ...tab,
                  arrays: {
                    ...tab.arrays,
                    [path.parentFieldName]: {
                      ...tab.arrays?.[path.parentFieldName],
                      [path.itemId]: {
                        ...tab.arrays?.[path.parentFieldName]?.[path.itemId],
                        [fieldName]: value,
                      },
                    },
                  },
                },
              },
            },
          };
        }

        // ✅ Handle nested array fields directly under section
        if (path.grandParentFieldName && path.parentItemId) {
          return {
            ...prev,
            [activeSection]: {
              ...sectionValues,
              arrays: {
                ...sectionValues.arrays,
                [path.grandParentFieldName]: {
                  ...sectionValues.arrays?.[path.grandParentFieldName],
                  [path.parentItemId]: {
                    ...sectionValues.arrays?.[path.grandParentFieldName]?.[path.parentItemId],
                    [path.parentFieldName]: {
                      ...sectionValues.arrays?.[path.grandParentFieldName]?.[path.parentItemId]?.[path.parentFieldName],
                      [path.itemId]: {
                        ...sectionValues.arrays?.[path.grandParentFieldName]?.[path.parentItemId]?.[
                        path.parentFieldName
                        ]?.[path.itemId],
                        [fieldName]: value,
                      },
                    },
                  },
                },
              },
            },
          };
        }

        // ✅ Handle single-level array fields directly under section
        return {
          ...prev,
          [activeSection]: {
            ...sectionValues,
            arrays: {
              ...sectionValues.arrays,
              [path.parentFieldName]: {
                ...sectionValues.arrays?.[path.parentFieldName],
                [path.itemId]: {
                  ...sectionValues.arrays?.[path.parentFieldName]?.[path.itemId],
                  [fieldName]: value,
                },
              },
            },
          },
        };
      }

      // ✅ Handle regular fields
      const tabId = sectionUpdates.find((sec) => sec.id === activeSection)?.tabs?.[tabIndex]?.id; // sectionUpdates?.[activeSection - 1]?.tabs?.[tabIndex]?.id;
      const tab = sectionValues?.tabs?.[tabId] || {};
      return tabIndex !== null
        ? {
          ...prev,
          [activeSection]: {
            ...prev[activeSection],
            tabs: {
              ...prev[activeSection]?.tabs,
              [tabId]: {
                ...tab,
                [fieldName]: value,
              },
            },
          },
        }
        : {
          ...prev,
          [activeSection]: {
            ...sectionValues,
            [fieldName]: value,
          },
        };
    });
  };

  const getArrayItems = (fieldName: string, parentPath?: FieldPath, tabIndex?: number | null) => {
    const uuid = uuidv4();

    // Helper function to sort items by sortOrder
    const sortItemsByOrder = (itemsObj: Record<string, { sortOrder?: number }>, itemKeys: string[]) => {
      return itemKeys.sort((a, b) => {
        const orderA = itemsObj[a]?.sortOrder ?? Number.MAX_SAFE_INTEGER;
        const orderB = itemsObj[b]?.sortOrder ?? Number.MAX_SAFE_INTEGER;
        return orderA - orderB;
      });
    };

    if (tabIndex !== null) {
      const tabId = sectionUpdates.find((sec) => sec.id === activeSection)?.tabs?.[tabIndex]?.id; // sectionUpdates?.[activeSection - 1]?.tabs?.[tabIndex]?.id;
      if (parentPath.parentFieldName) {
        const itemsObj = formValues[activeSection]?.tabs?.[tabId]?.arrays?.[parentPath.parentFieldName]?.[parentPath.itemId]?.[
          fieldName
        ] || {};
        const items = Object.keys(itemsObj);
        return items.length > 0 ? sortItemsByOrder(itemsObj, items) : [uuid];
      } else {
        const itemsObj = formValues[activeSection]?.tabs?.[tabId]?.arrays?.[fieldName] || {};
        const items = Object.keys(itemsObj);
        return items.length > 0 ? sortItemsByOrder(itemsObj, items) : [uuid];
      }
    } else {
      if (parentPath.parentFieldName) {
        const itemsObj = formValues[activeSection]?.arrays?.[parentPath.parentFieldName]?.[parentPath.itemId]?.[fieldName] || {};
        const items = Object.keys(itemsObj);
        return items.length > 0 ? sortItemsByOrder(itemsObj, items) : [uuid];
      } else {
        const itemsObj = formValues[activeSection]?.arrays?.[fieldName] || {};
        const items = Object.keys(itemsObj);
        return items.length > 0 ? sortItemsByOrder(itemsObj, items) : [uuid];
      }
    }
  };

  const handleArrayAdd = (field: FieldConfig, parentPath?: FieldPath, tabIndex?: number | null, initialValues: Record<string, unknown> = {}) => {
    if (isLocked) return;
    // Reset auto-save timer on array add
    if (onResetAutoSaveTimer) {
      onResetAutoSaveTimer();
    }

    const newItemId = uuidv4();
    const arrayPath = parentPath?.parentFieldName
      ? `${parentPath.parentFieldName}.${parentPath.itemId}.${field.name}`
      : field.name;

    // Update UUIDs
    setUuids((prev) => ({
      ...prev,
      [`${activeSection}${tabIndex !== null ? `.${tabIndex}` : ""}.${arrayPath}`]: [
        ...(prev[`${activeSection}${tabIndex !== null ? `.${tabIndex}` : ""}.${arrayPath}`] || []),
        newItemId,
      ],
    }));

    // Update configuration in sectionUpdates (only structure)
    setSectionUpdates((prev) => {
      const newSections = prev ? JSON.parse(JSON.stringify(prev)) : JSON.parse(JSON.stringify(sectionUpdates));
      const sectionIndex = newSections.findIndex((s) => s.id === activeSection);

      if (sectionIndex === -1) return prev || sectionUpdates;

      let targetField;
      if (parentPath?.parentFieldName) {
        // Nested array
        let parentField;
        if (tabIndex !== null) {
          parentField = newSections[sectionIndex].template
            .flatMap((sec) => sec.fields)
            .find((f) => f.name === parentPath.parentFieldName);
        } else {
          parentField = newSections[sectionIndex].sections
            .flatMap((sec) => sec.fields)
            .find((f) => f.name === parentPath.parentFieldName);
        }

        if (parentField?.value) {
          const parentItem = parentField.value.find((item) => item.id === parentPath.itemId);

          if (parentItem) {
            targetField = parentField.fields?.find((f) => f.name === field.name);
          }
        }
      } else {
        // Top-level array
        if (tabIndex !== null) {
          targetField = newSections[sectionIndex].template //.sections
            .flatMap((sec) => sec.fields)
            .find((f) => f.name === field.name);
        } else {
          targetField = newSections[sectionIndex].sections
            .flatMap((sec) => sec.fields)
            .find((f) => f.name === field.name);
        }
      }

      if (targetField) {
        if (!targetField.value) {
          targetField.value = [];
        }
      }

      return newSections;
    });

    const uuid = newItemId;
    const fieldName = field.name;

    // Helper function to get the next sortOrder value
    const getNextSortOrder = (itemsObj: Record<string, { sortOrder?: number }> | undefined) => {
      const sortOrders = Object.values(itemsObj || {})
        .map((item) => item?.sortOrder)
        .filter((order): order is number => typeof order === 'number');
      return sortOrders.length > 0 ? Math.max(...sortOrders) + 1 : 1;
    };

    if (tabIndex !== null) {
      const tabId = sectionUpdates.find((sec) => sec.id === activeSection)?.tabs[tabIndex]?.id; // sectionUpdates?.[activeSection - 1]?.tabs[tabIndex]?.id;
      if (parentPath.parentFieldName) {
        setFormValues((prev) => {
          const existingItems = prev?.[activeSection]?.tabs?.[tabId]?.arrays?.[parentPath.parentFieldName]?.[parentPath.itemId]?.[fieldName];
          const nextSortOrder = getNextSortOrder(existingItems);

          return {
            ...prev,
            [activeSection]: {
              ...prev?.[activeSection],
              tabs: {
                ...prev?.[activeSection].tabs,
                [tabId]: {
                  ...prev?.[activeSection]?.tabs?.[tabId],
                  arrays: {
                    ...prev?.[activeSection]?.tabs?.[tabId]?.arrays,
                    [parentPath.parentFieldName]: {
                      ...prev?.[activeSection]?.tabs?.[tabId]?.arrays?.[parentPath.parentFieldName],
                      [parentPath.itemId]: {
                        ...prev?.[activeSection]?.tabs?.[tabId]?.arrays?.[parentPath.parentFieldName]?.[
                        parentPath.itemId
                        ],
                        [fieldName]: {
                          ...prev?.[activeSection]?.tabs?.[tabId]?.arrays?.[parentPath.parentFieldName]?.[
                          parentPath.itemId
                          ]?.[fieldName],
                          [uuid]: { ...initialValues, sortOrder: nextSortOrder },
                        },
                      },
                    },
                  },
                },
              },
            },
          };
        });
      } else {
        setFormValues((prev) => {
          const existingItems = prev?.[activeSection]?.tabs?.[tabId]?.arrays?.[fieldName];
          const nextSortOrder = getNextSortOrder(existingItems);

          return {
            ...prev,
            [activeSection]: {
              ...prev?.[activeSection],
              tabs: {
                ...prev?.[activeSection].tabs,
                [tabId]: {
                  ...prev?.[activeSection]?.tabs?.[tabId],
                  arrays: {
                    ...prev?.[activeSection]?.tabs?.[tabId]?.arrays,
                    [fieldName]: {
                      ...prev?.[activeSection]?.tabs?.[tabId]?.arrays?.[fieldName],
                      [uuid]: { ...initialValues, sortOrder: nextSortOrder },
                    },
                  },
                },
              },
            },
          };
        });
      }
    } else {
      if (parentPath.parentFieldName) {
        setFormValues((prev) => {
          const existingItems = prev?.[activeSection]?.arrays?.[parentPath.parentFieldName]?.[parentPath.itemId]?.[fieldName];
          const nextSortOrder = getNextSortOrder(existingItems);

          return {
            ...prev,
            [activeSection]: {
              ...prev?.[activeSection],

              arrays: {
                ...prev?.[activeSection]?.arrays,
                [parentPath.parentFieldName]: {
                  ...prev?.[activeSection]?.arrays?.[parentPath.parentFieldName],
                  [parentPath.itemId]: {
                    ...prev?.[activeSection]?.arrays?.[parentPath.parentFieldName]?.[parentPath.itemId],
                    [fieldName]: {
                      ...prev?.[activeSection]?.arrays?.[parentPath.parentFieldName]?.[parentPath.itemId]?.[fieldName],
                      [uuid]: { ...initialValues, sortOrder: nextSortOrder },
                    },
                  },
                },
              },
            },
          };
        });
      } else {
        setFormValues((prev) => {
          const existingItems = prev?.[activeSection]?.arrays?.[fieldName];
          const nextSortOrder = getNextSortOrder(existingItems);

          return {
            ...prev,
            [activeSection]: {
              ...prev?.[activeSection],
              arrays: {
                ...prev?.[activeSection]?.arrays,
                [fieldName]: {
                  ...prev?.[activeSection]?.arrays?.[fieldName],
                  [uuid]: { ...initialValues, sortOrder: nextSortOrder },
                },
              },
            },
          };
        });
      }
    }
  };
  // Update handleArrayRemove to store deleted catalog items in formValues
  const handleArrayRemove = (field: FieldConfig, itemId: string, parentPath?: FieldPath, tabIndex?: number | null) => {
    if (isLocked) return;
    // Reset auto-save timer on array remove
    if (onResetAutoSaveTimer) {
      onResetAutoSaveTimer();
    }

    const fieldName = field.name;

       const isQuoteSection =
      activeSection === QuoteID &&
      field.name === "sections" &&
      tabIndex !== null;

    if (isQuoteSection) {
      setFormValues((prev) => ({
        ...prev,
        [activeSection]: {
          ...prev[activeSection],
          permanently_deleted_sections: [
            ...(prev[activeSection]?.permanently_deleted_sections || []),
            itemId,
          ],
        },
      }));
    }

    if (tabIndex !== null) {
      const tabId = sectionUpdates.find((sec) => sec.id === activeSection)?.tabs[tabIndex]?.id;

      if (parentPath?.parentFieldName) {
        // Nested inside another array field within a tab
        setFormValues((prev) => {
          const itemToRemove = prev?.[activeSection]?.tabs?.[tabId]?.arrays?.[parentPath.parentFieldName]?.[parentPath.itemId]?.[fieldName]?.[itemId];

          const updatedArray = {
            ...prev?.[activeSection]?.tabs?.[tabId]?.arrays?.[parentPath.parentFieldName]?.[parentPath.itemId]?.[
            fieldName
            ],
          };
          delete updatedArray[itemId];

          // Track deleted catalog items
          const deletedCatalogItems = prev?.[activeSection]?.tabs?.[tabId]?.deleted_catalog_items || [];
          const updatedDeletedItems = itemToRemove?.is_catalog_item && itemToRemove?.catalog_product_id
            ? [...deletedCatalogItems, itemToRemove.catalog_product_id]
            : deletedCatalogItems;

          return {
            ...prev,
            [activeSection]: {
              ...prev?.[activeSection],
              tabs: {
                ...prev?.[activeSection].tabs,
                [tabId]: {
                  ...prev?.[activeSection]?.tabs?.[tabId],
                  deleted_catalog_items: updatedDeletedItems,
                  arrays: {
                    ...prev?.[activeSection]?.tabs?.[tabId]?.arrays,
                    [parentPath.parentFieldName]: {
                      ...prev?.[activeSection]?.tabs?.[tabId]?.arrays?.[parentPath.parentFieldName],
                      [parentPath.itemId]: {
                        ...prev?.[activeSection]?.tabs?.[tabId]?.arrays?.[parentPath.parentFieldName]?.[
                        parentPath.itemId
                        ],
                        [fieldName]: updatedArray,
                      },
                    },
                  },
                },
              },
            },
          };
        });
      } else {
        // Direct array field inside a tab
        setFormValues((prev) => {
          const itemToRemove = prev?.[activeSection]?.tabs?.[tabId]?.arrays?.[fieldName]?.[itemId] as (QuoteItem & { is_catalog_item?: boolean }) | undefined;

          const updatedArray = {
            ...prev?.[activeSection]?.tabs?.[tabId]?.arrays?.[fieldName],
          };
          delete updatedArray[itemId];

          // Track deleted catalog items
          const deletedCatalogItems = prev?.[activeSection]?.tabs?.[tabId]?.deleted_catalog_items || [];
          const updatedDeletedItems = itemToRemove?.is_catalog_item && itemToRemove?.catalog_product_id
            ? [...deletedCatalogItems, itemToRemove.catalog_product_id]
            : deletedCatalogItems;

          return {
            ...prev,
            [activeSection]: {
              ...prev?.[activeSection],
              tabs: {
                ...prev?.[activeSection].tabs,
                [tabId]: {
                  ...prev?.[activeSection]?.tabs?.[tabId],
                  deleted_catalog_items: updatedDeletedItems,
                  arrays: {
                    ...prev?.[activeSection]?.tabs?.[tabId]?.arrays,
                    [fieldName]: updatedArray,
                  },
                },
              },
            },
          };
        });
      }
    } else {
      if (parentPath?.parentFieldName) {
        // Nested inside another array field outside tab
        setFormValues((prev) => {
          const itemToRemove = prev?.[activeSection]?.arrays?.[parentPath.parentFieldName]?.[parentPath.itemId]?.[fieldName]?.[itemId];

          const updatedArray = {
            ...prev?.[activeSection]?.arrays?.[parentPath.parentFieldName]?.[parentPath.itemId]?.[fieldName],
          };
          delete updatedArray[itemId];

          // Track deleted catalog items
          const deletedCatalogItems = prev?.[activeSection]?.deleted_catalog_items || [];
          const updatedDeletedItems = itemToRemove?.is_catalog_item && itemToRemove?.catalog_product_id
            ? [...deletedCatalogItems, itemToRemove.catalog_product_id]
            : deletedCatalogItems;

          return {
            ...prev,
            [activeSection]: {
              ...prev?.[activeSection],
              deleted_catalog_items: updatedDeletedItems,
              arrays: {
                ...prev?.[activeSection]?.arrays,
                [parentPath.parentFieldName]: {
                  ...prev?.[activeSection]?.arrays?.[parentPath.parentFieldName],
                  [parentPath.itemId]: {
                    ...prev?.[activeSection]?.arrays?.[parentPath.parentFieldName]?.[parentPath.itemId],
                    [fieldName]: updatedArray,
                  },
                },
              },
            },
          };
        });
      } else {
        // Direct array field outside tab
        setFormValues((prev) => {
          const itemToRemove = prev?.[activeSection]?.arrays?.[fieldName]?.[itemId];

          const updatedArray = {
            ...prev?.[activeSection]?.arrays?.[fieldName],
          };
          delete updatedArray[itemId];

          // Track deleted catalog items
          const deletedCatalogItems = prev?.[activeSection]?.deleted_catalog_items || [];
          const updatedDeletedItems = itemToRemove?.is_catalog_item && itemToRemove?.catalog_product_id
            ? [...deletedCatalogItems, itemToRemove.catalog_product_id]
            : deletedCatalogItems;

          return {
            ...prev,
            [activeSection]: {
              ...prev?.[activeSection],
              deleted_catalog_items: updatedDeletedItems,
              arrays: {
                ...prev?.[activeSection]?.arrays,
                [fieldName]: updatedArray,
              },
            },
          };
        });
      }
    }
  };

  // const handleArrayRemoveOld = (
  //   field: FieldConfig,
  //   itemId: string,
  //   parentPath?: FieldPath,
  //   tabIndex?: number | null,
  // ) => {
  //   const arrayPath = parentPath?.parentFieldName
  //     ? `${parentPath.parentFieldName}.${parentPath.itemId}.${field.name}`
  //     : field.name;

  //   // Update UUIDs
  //   setUuids((prev) => ({
  //     ...prev,
  //     [`${activeSection}${tabIndex !== null ? `.${tabIndex}` : ""}.${arrayPath}`]: (
  //       prev[`${activeSection}${tabIndex !== null ? `.${tabIndex}` : ""}.${arrayPath}`] || []
  //     ).filter((id) => id !== itemId),
  //   }));

  //   // Remove form values for the array item
  //   setFormValues((prev) => {
  //     const sectionValues = prev[activeSection] || {};

  //     if (tabIndex !== null) {
  //       const tabId = sectionUpdates?.[activeSection]?.tabs?.[tabIndex]?.id;

  //       // ✅ Delete from arrays inside a specific tab
  //       const tab = sectionValues.tabs[tabId];
  //       const updatedArray = { ...(tab.arrays[arrayPath] || {}) };
  //       delete updatedArray[itemId];
  //       const tabs = {
  //         ...sectionValues.tabs,
  //         [tabId]: {
  //           ...tab,
  //           arrays: {
  //             ...tab.arrays,
  //             [arrayPath]: updatedArray,
  //           },
  //         },
  //       };

  //       return {
  //         ...prev,
  //         [activeSection]: {
  //           ...sectionValues,
  //           tabs,
  //         },
  //       };
  //     }

  //     // ✅ Delete from arrays directly under section
  //     if (!sectionValues.arrays?.[arrayPath]) return prev;

  //     const updatedArray = { ...sectionValues.arrays[arrayPath] };
  //     delete updatedArray[itemId];

  //     return {
  //       ...prev,
  //       [activeSection]: {
  //         ...sectionValues,
  //         arrays: {
  //           ...sectionValues.arrays,
  //           [arrayPath]: updatedArray,
  //         },
  //       },
  //     };
  //   });
  // };

  useEffect(() => {
    const fetchTemplates = async () => {
      const { data, error } = await supabase
        .from("estimate_text_templates")
        .select("id,name,html")
        .eq("scope", "custom_page_text")
        .order("created_at", { ascending: true });
      if (!error && data) {
        setTextTemplates(
          (data as TextTemplate[]).map((t) => ({
            id: t.id,
            name: t.name || "",
            html: t.html || "",
          })),
        );
      } else if (error) {
        console.warn("Failed to load templates from Supabase", error);
        toast({
          title: "Could not load templates",
          description: error.message,
          variant: "destructive",
        });
      }
    };
    fetchTemplates();
  }, [toast]);

  // Normalize HTML for comparison (editors may produce slightly different markup)
  const normalizeHtml = useCallback((s: string) => {
    return (s || "")
      .trim()
      .replace(/\s+/g, " ")
      .replace(/>\s+</g, "><");
  }, []);

  // If page refreshes with textHtml set, re-select matching template (best-effort by html match)
  useEffect(() => {
    const currentHtml: string = formValues?.[activeSection]?.textHtml || "";
    if (!currentHtml || textTemplates.length === 0) return;

    const n = normalizeHtml(currentHtml);
    const idx = textTemplates.findIndex((t) => {
      const th = t.html || "";
      return th === currentHtml || normalizeHtml(th) === n;
    });
    if (idx === -1) return;

    const t = textTemplates[idx];
    if (!t?.id) return;

    setSelectedTemplateId(t.id);
    setSelectedTemplateIdx(String(idx));
  }, [activeSection, formValues, textTemplates, normalizeHtml]);
  useEffect(() => {
    if (activeSection !== 6) return;

    const section = sectionUpdates?.find(sec => sec.id === activeSection);
    if (!section?.tabs || section.tabs.length === 0) return;

    const populateProductsInSections = () => {

      const updates: Record<string, TabUpdate> = {};
      let hasChanges = false;

      section.tabs.forEach((tab, tabIndex) => {
        const tabId = String(tab.id);
        const deletedCatalogItems = formValues[activeSection]?.tabs?.[tabId]?.deleted_catalog_items || [];

        // ── Products assigned via the legacy product.tab array ──
        const legacyTabProducts = products.filter(
          (product) => product.tab && product.tab.includes(tabId)
        );

        const supplierTabProducts = products.filter((product) => {
          if (product.tab && product.tab.includes(tabId)) return false;
          const rawSts = (product.calculation as Record<string, unknown>)?.supplier_tab_sections;
          if (!rawSts) return false;
          const sts = normaliseSupplierTabSections(rawSts);
          return Object.values(sts).some((assignments) =>
            assignments.some((a) => a.tab_id === tabId)
          );
        });

        const allTabProducts = [...legacyTabProducts, ...supplierTabProducts];
        if (allTabProducts.length === 0) return;

        if (!updates[tabId]) {
          updates[tabId] = {
            ...formValues[activeSection]?.tabs?.[tabId],
            arrays: {
              ...formValues[activeSection]?.tabs?.[tabId]?.arrays,
              sections: {
                ...formValues[activeSection]?.tabs?.[tabId]?.arrays?.sections,
              }
            }
          };
        }

        allTabProducts.forEach((product) => {
          if (deletedCatalogItems.includes(product.id)) return;

          const isLegacy = product.tab && product.tab.includes(tabId);

          if (isLegacy) {
            const tabIndexInProduct = product.tab!.indexOf(tabId);
            const targetSectionId = product.sections?.[tabIndexInProduct];
            if (!targetSectionId) return;

            const deletedSections = formValues[activeSection]?.permanently_deleted_sections || [];
            if (deletedSections.includes(targetSectionId)) return;

            const existingItems =
              formValues[activeSection]?.tabs?.[tabId]?.arrays?.sections?.[targetSectionId]?.items || {};
            const productExists = Object.values(existingItems).some(
              (item) => (item as QuoteItem).catalog_product_id === product.id
            );
            if (productExists) return;

            const sps = product.product_suppliers ?? [];
            const preferred = sps.find((sp) =>
              (sp.variants ?? []).some((v) => v.is_preferred)
            );
            const resolvedSp = preferred ?? sps[0];
            const resolvedVariant =
              (resolvedSp?.variants ?? []).find((v) => v.is_preferred) ??
              resolvedSp?.variants?.[0];

            if (!updates[tabId].arrays.sections[targetSectionId]) {
              updates[tabId].arrays.sections[targetSectionId] = {
                ...formValues[activeSection]?.tabs?.[tabId]?.arrays?.sections?.[targetSectionId],
                items: {
                  ...formValues[activeSection]?.tabs?.[tabId]?.arrays?.sections?.[targetSectionId]?.items,
                },
              };
            }

            updates[tabId].arrays.sections[targetSectionId].items[product.id] = {
              text: product.name,
              price: resolvedVariant?.price ?? product.price ?? 0,
              description: product.description || "",
              wastage_percentage: product.wastage_percentage || 0,
              is_catalog_item: true,
              catalog_product_id: product.id,
              catalog_supplier_id: resolvedSp?.supplier_id ?? null,
              catalog_variant_id: resolvedVariant?.id ?? null,
              unit_of_measure: resolvedVariant?.unit_of_measure ?? product.unit_of_measure ?? null,
              sku: resolvedVariant?.sku ?? null,
            };

            hasChanges = true;

          } else {
            const rawSts = (product.calculation as Record<string, unknown>)?.supplier_tab_sections;
            const sts = normaliseSupplierTabSections(rawSts);

            for (const [supplierId, assignments] of Object.entries(sts)) {
              const matchingAssignments = assignments.filter((a) => a.tab_id === tabId);
              if (matchingAssignments.length === 0) continue;

              const resolvedSp = (product.product_suppliers ?? []).find(
                (sp) => sp.supplier_id === supplierId
              );
              const resolvedVariant =
                (resolvedSp?.variants ?? []).find((v) => v.is_preferred) ??
                resolvedSp?.variants?.[0];

              matchingAssignments.forEach((assignment) => {
                const targetSectionId = assignment.section_id;
                if (!targetSectionId) return;

                const deletedSections = formValues[activeSection]?.permanently_deleted_sections || [];
                if (deletedSections.includes(targetSectionId)) return;

                const itemKey = `${product.id}::${supplierId}::${targetSectionId}`;

                const existingItems =
                  formValues[activeSection]?.tabs?.[tabId]?.arrays?.sections?.[targetSectionId]?.items || {};

                const productExists = Object.entries(existingItems).some(([k, item]) => {
                  const quoteItem = item as QuoteItem;
                  if (k === itemKey) return true;
                  return (
                    quoteItem.catalog_product_id === product.id &&
                    quoteItem.catalog_supplier_id === supplierId
                  );
                });
                if (productExists) return;

                if (!updates[tabId].arrays.sections[targetSectionId]) {
                  updates[tabId].arrays.sections[targetSectionId] = {
                    ...formValues[activeSection]?.tabs?.[tabId]?.arrays?.sections?.[targetSectionId],
                    items: {
                      ...formValues[activeSection]?.tabs?.[tabId]?.arrays?.sections?.[targetSectionId]?.items,
                    }
                  };
                }

                updates[tabId].arrays.sections[targetSectionId].items[itemKey] = {
                  text: product.name,
                  price: resolvedVariant?.price ?? product.price ?? 0,
                  description: product.description || "",
                  wastage_percentage: product.wastage_percentage || 0,
                  is_catalog_item: true,
                  catalog_product_id: product.id,
                  catalog_supplier_id: supplierId,
                  catalog_variant_id: resolvedVariant?.id ?? null,
                  unit_of_measure: resolvedVariant?.unit_of_measure ?? product.unit_of_measure ?? null,
                  sku: resolvedVariant?.sku ?? null,
                };

                hasChanges = true;
              });
            }
          }
        });
      });

      if (hasChanges) {
        setFormValues(prev => ({
          ...prev,
          [activeSection]: {
            ...prev[activeSection],
            tabs: {
              ...prev[activeSection]?.tabs,
              ...updates,
            }
          }
        }));

      }
    };

    populateProductsInSections();
  }, [activeSection, products, sectionUpdates]);
  const saveTextTemplate = async (html: string, name: string) => {
    const { data, error } = await supabase.from("estimate_text_templates").insert({
      name: name.trim(),
      html,
      scope: "custom_page_text",
    } as Database["public"]["Tables"]["estimate_text_templates"]["Insert"]);
    if (error) {
      console.error("Failed to save template", error);
      toast({
        title: "Failed to save template",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    const inserted = (Array.isArray(data) && data.length > 0) ? (data[0] as Partial<TextTemplate>) : undefined;
    setTextTemplates((prev) => [
      ...prev,
      {
        id: inserted?.id || crypto.randomUUID(),
        name: inserted?.name || name.trim(),
        html: inserted?.html || html,
      },
    ]);
    toast({ title: "Template saved", description: "Added to your templates." });
  };

  const updateTextTemplate = async (id: string, html: string, name?: string): Promise<boolean> => {
    const payload: Database["public"]["Tables"]["estimate_text_templates"]["Update"] = {
      html,
      ...(name !== undefined ? { name: name.trim() } : {}),
    };

    const { error } = await supabase.from("estimate_text_templates").update(payload).eq("id", id);

    if (error) {
      console.error("Failed to update template", error);
      toast({ title: "Failed to update template", description: error.message, variant: "destructive" });
      return false;
    }

    setTextTemplates((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
            ...t,
            html,
            ...(name !== undefined ? { name: name.trim() } : {}),
          }
          : t,
      ),
    );

    toast({ title: "Template updated", description: "Your changes were saved." });
    return true;
  };

  const openSaveTemplateDialog = (html: string) => {
    const suggested = `Template ${textTemplates.length + 1}`;
    const selected = selectedTemplateId ? textTemplates.find((t) => t.id === selectedTemplateId) : null;
    setPendingTemplateHtml(html);
    setTemplateName(selected?.name || suggested);
    setIsSaveTemplateOpen(true);
  };

  const buildTemplateScope = (fieldName: string, path: FieldPath, tabIndex: number | null, fieldType?: string) => {
    if (activeSection === QuoteID) {
      if (fieldType === "textarea") return "quote_details_textarea";
      if (fieldType === "richtext") return "quote_details_richtext";
    }
    const tabId = tabIndex !== null ? sectionUpdates.find((sec) => sec.id === activeSection)?.tabs?.[tabIndex]?.id : null;
    const pathKey = [path.grandParentFieldName, path.parentFieldName, fieldName].filter(Boolean).join(".");
    return `quote_details:${activeSection}:${tabId || "no-tab"}:${pathKey || fieldName}`;
  };

  // TODO: is a single client specific option that's why added as static location id here. (Should be moved to a DB config)
  const ALLOWED_CUSTOM_PDF_LOCATION = "tbk3DUfjHf5bWxHBPjhO" === locationId;

  function generateField(config: FieldConfig, index: number, path: FieldPath = {}, tabIndex: number | null = null, options?: { compactRichtext?: boolean }) {
    const fieldValue = getFieldValue(config, path, tabIndex);

    const conditionalFields =
      config.conditionalFields?.[fieldValue] &&
      config.conditionalFields?.[fieldValue]?.map((condConfig, condIndex) => {
        return generateField(condConfig, condIndex, path, tabIndex, options);
      });

    switch (config.type) {
      case "text":
      case "number":
      case "email": {
        const isPriceField = config.name === "price";
        const isCatalogItem = path.parentFieldName
          ? getFieldValue(
            { name: "is_catalog_item", type: "switch" } as FieldConfig,
            path,
            tabIndex
          ) === true
          : false;

        const isCatalogPriceField = isPriceField && isCatalogItem;
        return (
          <div
            key={`${config.name}-${index}-${path.itemId || ""}`}
            // className="w-[50%]"
            className={config.colSpan ? `col-span-${config.colSpan}` : "col-span-1"}
          >
            <Label htmlFor={config.name}>{config.label}</Label>
            <Input
              type={config.type}
              id={config.name}
              placeholder={config.placeholder || ""}
              value={fieldValue !== undefined && fieldValue !== null ? fieldValue : ""}
              onChange={(e) => handleFieldChange(config.name, e.target.value, path, tabIndex)}
              disabled={isCatalogPriceField}
              className={isCatalogPriceField ? "bg-muted cursor-not-allowed" : ""}
            />
          </div>
        );
      }

      case "date":
        return (
          <div
            key={`${config.name}-${index}-${path.itemId || ""}`}
          // className="w-[50%]"
          >
            <Label htmlFor={config.name}>{config.label}</Label>
            <DatePicker
              date={fieldValue ? new Date(fieldValue) : new Date()}
              onSelect={(date) => handleFieldChange(config.name, date?.toISOString() || "", path, tabIndex)}
            />
          </div>
        );

      case "upload":
        return (
          <div key={`${config.name}-${index}-${path.itemId || ""}`} className="w-full mt-8">
            {/* <div className="space-y-3 mt-3">
              <FileDropzone
                accept="application/pdf"
                valueDataUrl={
                  formValues[activeSection]?.file_storage_path
                    ? fileUploadService.getFileUrl(
                      formValues[activeSection]?.file_storage_path
                    )
                    : undefined
                }
                // onChange={() => {}}
                onChange={async (file, dataUrl) => {
                  if (file) {
                    // Validate file before upload
                    const validation = fileUploadService.validateFile(file);
                    if (!validation.valid) {
                      toast({
                        title: "Invalid file",
                        description: validation.error,
                        variant: "destructive",
                      });
                      return;
                    }

                    // Upload file to storage and update section
                    const { success, ...uploadResult } =
                      await fileUploadService.uploadFileByLocation(
                        file,
                        locationId
                      );

                    if (!success) {
                      return toast({
                        title: "File Upload Failed",
                        description: uploadResult.error,
                      });
                    }
                    const payload = {
                      file_storage_path: uploadResult.storagePath,
                      file_name: uploadResult.fileName,
                      file_size: uploadResult.fileSize,
                      file_type: uploadResult.fileType,
                    };

                    Object.keys(payload).forEach((key) => {
                      handleFieldChange(key, payload[key], {}, null);
                    });

                    toast({
                      title: "File uploaded successfully",
                      description: "File has been saved to storage",
                    });
                  } else {
                    const payload = {
                      file_storage_path: "",
                      file_name: "",
                      file_size: "",
                      file_type: "",
                    };

                    Object.keys(payload).forEach((key) => {
                      handleFieldChange(key, payload[key], {}, null);
                    });

                    toast({
                      title: "File removed",
                      description: "File reference has been removed",
                    });
                  }
                }}
              />
              {formValues[activeSection]?.file_storage_path && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>File: {formValues[activeSection]?.file_name}</div>
                  <div>
                    Size:{" "}
                    {(
                      (formValues[activeSection]?.file_size || 0) / 1024
                    ).toFixed(1)}{" "}
                    KB
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        fileUploadService.downloadFile(
                          formValues[activeSection]?.file_storage_path,
                          formValues[activeSection]?.file_name
                        )
                      }
                    >
                      Download
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const payload = {
                          file_storage_path: "",
                          file_name: "",
                          file_size: "",
                          file_type: "",
                        };

                        Object.keys(payload).forEach((key) => {
                          handleFieldChange(key, payload[key], {}, null);
                        });
                      }}
                    >
                      Remove File
                    </Button>
                  </div>
                </div>
              )}
            </div> */}
            <FileDropzone
              label={config.label}
              accept={config.allowedTypes?.includes("images") ? "image/*" : "*/*"}
              multiple={config.multiple || false}
              valueDataUrl={
                fieldValue?.file_storage_path ? fileUploadService.getFileUrl(fieldValue?.file_storage_path) : ""
              }
              fileLibrary={
                locationId ? { locationId, contactId: contactId ?? undefined } : null
              }
              onLinkFromLibrary={(linked) => {
                handleFieldChange(
                  config.name,
                  {
                    file_storage_path: linked.file_storage_path,
                    file_name: linked.file_name,
                    file_size: linked.file_size,
                    file_type: linked.file_type,
                  },
                  path,
                  tabIndex,
                );
                toast({
                  title: "File linked",
                  description: "An existing upload is now attached to this field.",
                });
              }}
              onChange={async (file, dataUrl) => {
                if (file) {
                  // Validate file before upload
                  const validation = fileUploadService.validateFile(file, true);
                  if (!validation.valid) {
                    toast({
                      title: "Invalid file",
                      description: validation.error,
                      variant: "destructive",
                    });
                    return;
                  }

                  // Upload file to storage and update section
                  const { success, ...uploadResult } = await fileUploadService.uploadFileByLocation(
                    file,
                    locationId,
                    true,
                    contactId,
                  );

                  if (!success) {
                    return toast({
                      title: "File Upload Failed",
                      description: uploadResult.error,
                    });
                  }
                  const payload = {
                    file_storage_path: uploadResult.storagePath,
                    file_name: uploadResult.fileName,
                    file_size: uploadResult.fileSize,
                    file_type: uploadResult.fileType,
                  };

                  // Object.keys(payload).forEach((key) => {
                  //   handleFieldChange(key, payload[key], {}, null);
                  // });
                  handleFieldChange(config.name, payload, path, tabIndex);

                  toast({
                    title: "File uploaded successfully",
                    description: "File has been saved to storage",
                  });
                } else {
                  const payload = {
                    file_storage_path: "",
                    file_name: "",
                    file_size: "",
                    file_type: "",
                  };

                  Object.keys(payload).forEach((key) => {
                    handleFieldChange(config.name, null, path, tabIndex);
                  });

                  toast({
                    title: "File removed",
                    description: "File reference has been removed",
                  });
                }
              }}
            />
          </div>
        );

      case "textarea":
        return (
          <div
            key={`${config.name}-${index}-${path.itemId || ""}`}
            className={config.colSpan ? `col-span-${config.colSpan}` : "col-span-2"}
          >
            <Label htmlFor={config.name}>{config.label}</Label>
            <div className="mb-2">
              <TemplateControls
                scope={buildTemplateScope(config.name, path, tabIndex, config.type)}
                value={fieldValue || ""}
                onChange={(next) => handleFieldChange(config.name, next, path, tabIndex)}
                onAfterUpdate={() => onSaveRequested?.(formValues, sectionUpdates)}
              />
            </div>
            <Textarea
              id={config.name}
              placeholder={config.placeholder || ""}
              value={fieldValue || ""}
              onChange={(e) => handleFieldChange(config.name, e.target.value, path, tabIndex)}
            />
          </div>
        );

      case "dropdown":
        return (
          <div key={`${config.name}-${index}-${path.itemId || ""}`} className="gap-2 items-center">
            <Label>{config.label}</Label>
            <Select
              value={fieldValue || ""}
              onValueChange={(val) => handleFieldChange(config.name, val, path, tabIndex)}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder={config.placeholder || "Select option"} />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background">
                {config.options && config.options.length > 0 ? (
                  config.options.map((opt, i) => (
                    <SelectItem key={i} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="__none__" disabled>
                    No options available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        );

      case "richtext":
        return (
          <div
            key={`${config.name}-${index}-${path.itemId || ""}`}
            className={`col-span-2 ${options?.compactRichtext ? "min-w-0 max-w-full overflow-x-auto" : ""}`}
          >
            <Label>{config.label}</Label>
            <div className="my-2">
              <TemplateControls
                scope={buildTemplateScope(config.name, path, tabIndex, config.type)}
                value={fieldValue || ""}
                onChange={(next) => handleFieldChange(config.name, next, path, tabIndex)}
                onAfterUpdate={() => onSaveRequested?.(formValues, sectionUpdates)}
              />
            </div>
            <RichTextEditor
              value={fieldValue || ""}
              onChange={(html) => handleFieldChange(config.name, html, path, tabIndex)}
              compact={options?.compactRichtext}
            />
          </div>
        );

      case "richtext_custom_pdf":
        return (
          <React.Fragment key={`${config.name}-${index}-${path.itemId || ""}`}>
            <br />
            <div className="flex gap-4 w-full">
              {customTemplates.filter(template => template.name === 'Custom' ? ALLOWED_CUSTOM_PDF_LOCATION : true).map((item, index) => {
                return (
                  <div
                    key={index}
                    onClick={() => {
                      setSelectedTemplate(index);
                      handleFieldChange(config.name, item.html, path, tabIndex);
                    }}
                    className={`p-5 flex justify-center items-center border w-full hover:border-red-500 cursor-pointer  ${selectedTemplate === index ? "border-red-500" : "border-gray-300"}`}
                  >
                    <div className="text-lg font-bold">{item.name}</div>
                  </div>
                );
              })}
              {/* <div className="p-5 flex justify-center items-center border w-full hover:border-blue-500">
                <div className="text-lg font-bold">Custom</div>
              </div> */}
            </div>
            <div className="col-span-2 " style={{ display: 'block' }}>
              <Label>{config.label}</Label>
              <div className="my-2">
                <TemplateControls
                  scope={buildTemplateScope(config.name, path, tabIndex, "richtext")}
                  value={fieldValue || ""}
                  onChange={(next) => handleFieldChange(config.name, next, path, tabIndex)}
                  confirmOnLoad={false}
                  onAfterUpdate={() => onSaveRequested?.(formValues, sectionUpdates)}
                />
              </div>
              <RichTextEditor
                value={fieldValue || ""}
                onChange={(html) => handleFieldChange(config.name, html, path, tabIndex)}
              />
            </div>
          </React.Fragment>
        );

      case "slider":
        return (
          <div key={`${config.name}-${index}-${path.itemId || ""}`}>
            <Label>{config.label}</Label>
            <div className="flex items-center gap-3">
              <Slider
                value={[fieldValue === 0 ? 0 : fieldValue || config.default || config.min || 0]}
                min={config.min || 0}
                max={config.max || 100}
                step={config.step || 1}
                onValueChange={(v) => handleFieldChange(config.name, v[0], path, tabIndex)}
                className="flex-1"
              />
              <Input
                key={`slider-input-${config.name}-${fieldValue}`}
                type="number"
                min={config.min || 0}
                max={config.max || 100}
                defaultValue={fieldValue === 0 ? 0 : fieldValue || config.default || ""}
                onInput={(e) => {
                  // Only update when using arrow keys (value changes by step amount)
                  const newValue = Number(e.currentTarget.value);
                  const step = config.step || 1;
                  const diff = Math.abs(newValue - (fieldValue === 0 ? 0 : fieldValue || config.default || 0));

                  if (diff === step && !isNaN(newValue)) {
                    handleFieldChange(config.name, newValue, path, tabIndex);
                  }
                }}
                onBlur={(e) => {
                  const numValue = Number(e.target.value);
                  const clampedValue = Math.max(
                    config.min || 0,
                    Math.min(config.max || 100, isNaN(numValue) ? config.min || 0 : numValue)
                  );
                  handleFieldChange(config.name, clampedValue, path, tabIndex);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                className="w-20"
              />
              <span className="text-sm">%</span>
            </div>
          </div>
        );

      case "radio":
        return (
          <div key={`${config.name}-${index}-${path.itemId || ""}`} className="space-y-4">
            <Label>{config.label}</Label>
            <RadioGroup
              value={fieldValue || config.default || ""}
              onValueChange={(val) => handleFieldChange(config.name, val, path, tabIndex)}
            >
              {config.options?.map((opt, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <RadioGroupItem value={opt.value} id={`${config.name}-${opt.value}-${path.itemId || ""}`} />
                  <Label htmlFor={`${config.name}-${opt.value}-${path.itemId || ""}`}>{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case "switch":
        return (
          <div key={`${config.name}-${index}-${path.itemId || ""}`}>
            <div className="flex flex-row gap-5">
              {config.label && <p>{config.label}</p>}
              <Switch
                checked={fieldValue || config.default || false}
                onCheckedChange={() =>
                  handleFieldChange(config.name, !(fieldValue || config.default || false), path, tabIndex)
                }
                className="shrink-0"
              />
            </div>
            {conditionalFields}
          </div>
        );

      // case "array": {
      //   const arrayItems = getArrayItems(config.name, path, tabIndex);
      //   return (
      //     <div
      //       key={`${config.name}-${index}-${path.itemId || ""}`}
      //       className="col-span-2"
      //     >
      //       <h4 className="font-medium capitalize">{config.label}</h4>

      //       {arrayItems.map((itemId) => (
      //         <div key={itemId} className="border-b pb-3 relative mt-3">
      //           <div className="">
      //             <Button
      //               variant="link"
      //               className="absolute top-[-1rem] right-0"
      //               onClick={() =>
      //                 handleArrayRemove(config, itemId, path, tabIndex)
      //               }
      //             >
      //               <TrashIcon />
      //             </Button>
      //           </div>
      //           <div
      //             className={`grid ${
      //               config.inputsInRow && `grid-cols-${config.inputsInRow}`
      //             } gap-3`}
      //           >
      //             {config.fields?.map((childField, idx) => {
      //               const childPath = {
      //                 parentFieldName: config.name,
      //                 itemId: itemId,
      //                 ...(path.parentFieldName
      //                   ? {
      //                       grandParentFieldName: path.parentFieldName,
      //                       parentItemId: path.itemId,
      //                     }
      //                   : {}),
      //               };

      //               return generateField(childField, idx, childPath, tabIndex);
      //             })}
      //           </div>
      //         </div>
      //       ))}

      //       <Button
      //         variant="link"
      //         onClick={() => handleArrayAdd(config, path, tabIndex)}
      //       >
      //         + Add Item
      //       </Button>
      //     </div>
      //   );
      // }
      case "array": {
        const arrayItems = getArrayItems(config.name, path, tabIndex);

        const hasSectionTitle = config.fields?.some((field) => field.name === "section_title");
        const hasNestedArray = config.fields?.some((field) => field.type === "array");
        const shouldShowAccordion = hasSectionTitle && hasNestedArray;

        const isQuoteDetailsItems = activeSection === QuoteID &&
          config.name === "items" &&
          path.parentFieldName === "sections" &&
          tabIndex !== null;

        return (
          <div key={`${config.name}-${index}-${path.itemId || ""}`} className="col-span-2">
            <h4 className="font-medium capitalize">{config.label}</h4>

            {arrayItems.map((itemId) => {
              const sectionId = `${activeSection}-${config.name}-${itemId}-${tabIndex || "no-tab"}`;
              const isExpanded = expandedSections[sectionId];

              // Check if this is a catalog item
              const childPath = {
                parentFieldName: config.name,
                itemId: itemId,
                ...(path.parentFieldName
                  ? {
                    grandParentFieldName: path.parentFieldName,
                    parentItemId: path.itemId,
                  }
                  : {}),
              };

              const isCatalogItem = getFieldValue(
                { name: "is_catalog_item", type: "switch" } as FieldConfig,
                childPath,
                tabIndex
              ) === true;

              if (shouldShowAccordion) {
                const sectionTitleField = config.fields.find((field) => field.name === "section_title");
                const otherFields = config.fields.filter((field) => field.name !== "section_title");

                const sectionTitleValue =
                  getFieldValueForAccordion("section_title", childPath, tabIndex) || "Untitled Section";

                // Check if this is a Quote Details subsection with items (for propagation toggle)
                const isQuoteDetailsSubsection =
                  activeSection === QuoteID && config.name === "sections" && tabIndex !== null;

                const taxField = otherFields.find((f) => f.name === "Tax");
                const marginField = otherFields.find((f) => f.name === "Margin");
                const remainingFields = otherFields.filter((f) => f.name !== "Tax" && f.name !== "Margin");
                return (
                  <div key={itemId} className="border border-gray-200 rounded-lg mb-3">
                    <div
                      className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50 border-b"
                      onClick={() => toggleSection(sectionId)}
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDownIcon className="w-4 h-4" />
                        ) : (
                          <ChevronRightIcon className="w-4 h-4" />
                        )}
                        <span className="font-medium">{sectionTitleValue}</span>
                        {isQuoteDetailsSubsection && (
                          <div
                            className="flex items-center gap-2 ml-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Switch
                              checked={sectionPropagation[itemId] !== false}
                              onCheckedChange={(checked) => {
                                setSectionPropagation((prev) => ({
                                  ...prev,
                                  [itemId]: checked,
                                }));
                              }}
                            />
                            <span className="text-xs text-gray-600">Sync across tabs</span>
                          </div>
                        )}
                      </div>

                      <Button
                        variant="link"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArrayRemove(config, itemId, path, tabIndex);
                        }}
                      >
                        <TrashIcon />
                      </Button>
                    </div>

                    {isExpanded && (
                      <div className="p-3">
                        {/* Section Title with Tax and Margin switches in one row */}
                        <div className="mb-3 grid grid-cols-12 gap-3 items-center">
                          <div className="col-span-6 flex items-center gap-2">
                            <Label className="whitespace-nowrap">{sectionTitleField?.label || "Section Title"}:</Label>
                            <Input
                              type="text"
                              value={getFieldValue(sectionTitleField, childPath, tabIndex) || ""}
                              onChange={(e) => handleFieldChange(sectionTitleField.name, e.target.value, childPath, tabIndex)}
                              className="flex-1"
                            />
                          </div>
                          {taxField && (
                            <div className="col-span-3">
                              {generateField(taxField, 0, childPath, tabIndex)}
                            </div>
                          )}
                          {marginField && (
                            <div className="col-span-3">
                              {generateField(marginField, 0, childPath, tabIndex)}
                            </div>
                          )}
                        </div>

                        {/* Remaining fields (items array) */}
                        <div className={`grid ${config.inputsInRow && `grid-cols-${config.inputsInRow}`} gap-3`}>
                          {remainingFields.map((childField, idx) => {
                            return generateField(childField, idx, childPath, tabIndex);
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              } else if (isCatalogItem && config.name === "items") {
                // Enhanced UI for catalog items using ProductCard component
                const richtextFields = config.fields?.filter((f) => f.type === "richtext") ?? [];
                const extraFieldsContent =
                  richtextFields.length > 0 ? (
                    <div className="space-y-2">
                      {richtextFields.map((field, idx) =>
                        generateField(field, idx, childPath, tabIndex, { compactRichtext: true })
                      )}
                    </div>
                  ) : null;

                const itemData = {
                  text: getFieldValue({ name: "text", type: "text" } as FieldConfig, childPath, tabIndex),
                  price: getFieldValue({ name: "price", type: "number" } as FieldConfig, childPath, tabIndex),
                  quantity: getFieldValue({ name: "quantity", type: "number" } as FieldConfig, childPath, tabIndex),
                  wastage_percentage: getFieldValue({ name: "wastage_percentage", type: "number" } as FieldConfig, childPath, tabIndex),
                  description: getFieldValue({ name: "description", type: "textarea" } as FieldConfig, childPath, tabIndex),
                  catalog_product_id: getFieldValue({ name: "catalog_product_id", type: "text" } as FieldConfig, childPath, tabIndex),
                  catalog_supplier_id: getFieldValue({ name: "catalog_supplier_id", type: "text" } as FieldConfig, childPath, tabIndex),
                  catalog_variant_id: getFieldValue({ name: "catalog_variant_id", type: "text" } as FieldConfig, childPath, tabIndex),
                  sku: getFieldValue({ name: "sku", type: "text" } as FieldConfig, childPath, tabIndex),
                  unit_of_measure: getFieldValue({ name: "unit_of_measure", type: "text" } as FieldConfig, childPath, tabIndex),
                  formula_expression: getFieldValue({ name: "formula_expression", type: "text" } as FieldConfig, childPath, tabIndex),
                };

                // Get product details from catalog
                const catalogProduct = products.find(p => p.id === itemData.catalog_product_id);
                const quantityKey = `${sectionUpdates.find((sec) => sec.id === activeSection)?.tabs?.[tabIndex]?.id}-${path.itemId}-${itemId}`;
                const isManuallyEdited = manuallyEditedQuantityKeys.current.has(quantityKey);

                const sectionTitle = (() => {
                  if (tabIndex !== null) {
                    const tabId = sectionUpdates.find((sec) => sec.id === activeSection)?.tabs?.[tabIndex]?.id;
                    return formValues[activeSection]?.tabs?.[tabId]?.arrays?.sections?.[path.itemId]?.section_title;
                  }
                  return formValues[activeSection]?.arrays?.sections?.[path.itemId]?.section_title;
                })();

                return (
                  <ProductCard
                    key={itemId}
                    itemId={itemId}
                    productData={itemData}
                    catalogProduct={catalogProduct}
                    categories={categories}
                    suppliers={suppliers}
                    isManuallyEdited={isManuallyEdited}
                    sectionTitle={sectionTitle}
                    onQuantityChange={(value) => {
                      manuallyEditedQuantityKeys.current.add(quantityKey);
                      handleFieldChange("quantity", value, childPath, tabIndex);
                    }}
                    onDelete={() => handleArrayRemove(config, itemId, path, tabIndex)}
                  >
                    {extraFieldsContent}
                  </ProductCard>
                );
              } else {
                return (
                  <Card key={itemId} className="p-4 relative my-4 border border-gray-200 bg-gray-50">
                    <div className="absolute top-2 right-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleArrayRemove(config, itemId, path, tabIndex)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className={`grid ${config.inputsInRow && `grid-cols-${config.inputsInRow}`} gap-3`}>
                      {config.fields?.map((childField, idx) => {
                        return generateField(childField, idx, childPath, tabIndex);
                      })}
                    </div>
                  </Card>
                );
              }
            })}

            {shouldShowAccordion ? (

              <Button
                variant="link"
                className="text-primary"
                onClick={() => handleArrayAdd(config, path, tabIndex)}
              >
                + Add Section
              </Button>
            ) : (

              <Button
                variant="link"
                className="text-primary"
                onClick={() => {
                  if (isQuoteDetailsItems) {
                    setCurrentConfig(config);
                    setCurrentPath(path);
                    setCurrentTabIndex(tabIndex);
                    setIsAddItemModalOpen(true);
                  } else {
                    handleArrayAdd(config, path, tabIndex);
                  }
                }}
              >
                + Add Item
              </Button>
            )}
          </div>
        );
      } //updated array filed

      default:
        return <React.Fragment key={`${config.name}-${index}-${path.itemId || ""}`}></React.Fragment>;
    }
  }

  const [activeTab, setActiveTab] = useState("0");

  // Add these functions inside your component
  const handleTabAdd = (sectionId: number) => {
    if (isLocked) return;
    // Reset auto-save timer on tab add
    if (onResetAutoSaveTimer) {
      onResetAutoSaveTimer();
    }

    const newTabId = uuidv4();

    setSectionUpdates((prev) => {
      const newSections = prev ? JSON.parse(JSON.stringify(prev)) : JSON.parse(JSON.stringify(sectionUpdates));
      const sectionIndex = newSections.findIndex((s) => s.id === sectionId);

      if (sectionIndex === -1) return prev || sectionUpdates;

      const section = newSections[sectionIndex];
      if (section.maxAllowedTabs && (section.tabs?.length || 0) >= section.maxAllowedTabs) {
        return prev;
      }

      const newTab: TabConfig = {
        id: newTabId,
        title: `Quote ${(section.tabs?.length || 0) + 1}`,
        sortOrder: (section.tabs?.length || 0) + 1,
        useTemplate: true,
      };

      section.tabs = [...(section.tabs || []), newTab];
      return newSections;
    });

    // Initialize form values for the new tab
    setFormValues((prev) => {
      const sectionValues = prev[sectionId] || {};
      return {
        ...prev,
        [sectionId]: {
          ...sectionValues,
          tabs: {
            ...sectionValues.tabs,
            [newTabId]: {},
          },
        },
      };
    });
  };

  const handleTabRemove = (sectionId: number, tabId: string) => {
    if (isLocked) return;
    // Reset auto-save timer on tab remove
    if (onResetAutoSaveTimer) {
      onResetAutoSaveTimer();
    }

    setSectionUpdates((prev) => {
      const newSections = prev ? JSON.parse(JSON.stringify(prev)) : JSON.parse(JSON.stringify(sectionUpdates));
      const sectionIndex = newSections.findIndex((s) => s.id === sectionId);

      if (sectionIndex === -1) return prev || sectionUpdates;

      const section = newSections[sectionIndex];
      if (section.tabs) {
        section.tabs = section.tabs.filter((tab) => tab.id !== tabId);
      }

      return newSections;
    });

    // Remove form values for the tab
    setFormValues((prev) => {
      const sectionValues = prev[sectionId] || {};
      if (!sectionValues.tabs) return prev;

      const updatedTabs = { ...sectionValues.tabs };
      delete updatedTabs[tabId];

      return {
        ...prev,
        [sectionId]: {
          ...sectionValues,
          tabs: updatedTabs,
        },
      };
    });

    // Close dialog and reset state
    setIsDeleteTabDialogOpen(false);
    setTabToDelete(null);
  };

  // Add this helper function to initiate tab deletion
  const handleTabDeleteClick = (sectionId: number, tabId: string) => {
    setTabToDelete({ sectionId, tabId });
    setIsDeleteTabDialogOpen(true);
  };

  const [tabRename, setTabRename] = useState(false);
  const [activeTabTitle, setActiveTabTitle] = useState("");

  const handleTabRenameToggle = (tabIndex: number) => {
    if (isLocked) return;
    // Reset auto-save timer on tab rename
    if (onResetAutoSaveTimer) {
      onResetAutoSaveTimer();
    }

    setSectionUpdates((prev) => {
      return prev.map((sec) => {
        if (sec.id === activeSection) {
          if (sec.tabs && sec.tabs[tabIndex] && activeTabTitle) {
            sec.tabs[tabIndex].title = activeTabTitle;
          }
        }
        return sec;
      });
    });

    setTabRename((prev) => !prev);
  };

  const renderTabs = (section: SectionConfig) => {

    // Render tabs for other sections
    if (!section.tabs || section.tabs.length === 0) return null;

    return (
      <div className="space-y-4 mt-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-wrap gap-2 border-b pb-2 items-center">
            <TabsList className="">
              {section.tabs.slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((tab, tabIndex) => (
                <TabsTrigger value={tabIndex.toString()} className="w-full">
                  {tab.title}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500 ml-2"
                    disabled={section.tabs.length <= 1}
                    onClick={() => handleTabDeleteClick(Number(section.id), tab.id)}
                  >
                    <TrashIcon className="h-3 w-3" />
                  </Button>
                </TabsTrigger>
              ))}
            </TabsList>

            {section.allowNewTabs && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTabAdd(Number(section.id))}
                disabled={section.maxAllowedTabs ? (section.tabs?.length || 0) >= section.maxAllowedTabs : false}
              >
                +
              </Button>
            )}
          </div>

          {section.tabs.slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((tab, tabIndex) => (
            <TabsContent key={tab.id} value={tabIndex.toString()}>
              <div className="">
                <div className="flex items-center">
                  {tabRename ? (
                    <Input
                      type="text"
                      placeholder={tab.title}
                      value={activeTabTitle}
                      onChange={(e) => setActiveTabTitle(e.target.value)}
                    />
                  ) : (
                    <h2>{tab.title}</h2>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-2"
                    onClick={() => handleTabRenameToggle(tabIndex)}
                  >
                    {tabRename ? <Check className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
                  </Button>
                </div>

                {tab.useTemplate ? (
                  <>
                    {section.template?.slice().sort((a: TemplateSection, b: TemplateSection) => (a.sortOrder || 0) - (b.sortOrder || 0))
                      .map((sec: TemplateSection, index) => (
                        <React.Fragment key={`section-${index}`}>
                          <div className="border rounded-md p-3 mt-3">
                            <h3 className="font-semibold tracking-tight text-lg">{sec?.title}</h3>
                            {sec?.description && (
                              <p className="font-regular tracking-tight text-sm pb-3">{sec?.description}</p>
                            )}
                            <div className="grid gap-3">
                              {sec?.fields?.map((field, idx) => generateField(field, idx, {}, tabIndex))}
                            </div>
                          </div>
                        </React.Fragment>
                      ))
                    }

                    {/* Display Tab Total using calculateTabTotals */}
                    {(() => {
                      const tabTotals = calculateTabTotals(sectionUpdates as unknown as QuoteSectionUpdate[], formValues);
                      const currentTabTotal = tabTotals.find(t => t.tabId === tab.id);

                      if (currentTabTotal) {
                        const currentTotal = currentTabTotal.total;
                        const taxRate = Number(formValues[activeSection]?.tabs?.[tab.id]?.tax_rate || 0);
                        const profitMargin = Number(formValues[activeSection]?.tabs?.[tab.id]?.profit_margin || 0);

                        return (
                          <TabTotalInput
                            key={tab.id}
                            tabId={String(tab.id)}
                            currentTotal={currentTotal}
                            taxRate={taxRate}
                            profitMargin={profitMargin}
                            isLocked={isLocked}
                            onError={(msg) => {
                              setFormValues(prev => ({
                                ...prev,
                                _tabTotalErrors: {
                                  ...(prev as Record<string, unknown> & { _tabTotalErrors?: Record<string, string> })._tabTotalErrors,
                                  [tab.id]: msg,
                                }
                              }));
                              toast({ title: "Invalid Tab Total", description: msg, variant: "destructive" });
                            }}
                            onTotalChange={(newTotal) => {
                              if (newTotal <= 0) return;
                              const taxMult = 1 + taxRate / 100;
                              const currentMarginMult = 1 + profitMargin / 100;
                              const rawSubtotal = currentTotal / (currentMarginMult * taxMult);
                              if (rawSubtotal <= 0) return;
                              const minTotal = rawSubtotal * taxMult;
                              const maxTotal = rawSubtotal * 2 * taxMult;
                              if (newTotal < minTotal || newTotal > maxTotal) return;

                              const newMargin = ((newTotal / (rawSubtotal * taxMult)) - 1) * 100;
                              const clampedMargin = Math.max(0, Math.min(100, Math.round(newMargin * 100) / 100));
                              handleFieldChange("profit_margin", clampedMargin, {}, tabIndex);

                              setFormValues(prev => {
                                const errors = { ...((prev as Record<string, unknown> & { _tabTotalErrors?: Record<string, string> })._tabTotalErrors) };
                                delete errors[tab.id];
                                return { ...prev, _tabTotalErrors: errors };
                              });

                              if (onResetAutoSaveTimer) onResetAutoSaveTimer();
                            }}
                          />
                        );
                      }
                      return null;
                    })()}
                  </>
                ) : (
                  <div className="text-muted-foreground text-sm">Custom fields configuration would go here</div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    );
  };

  const handleSectionTitleUpdate = () => {
    if (isLocked) return;
    // Reset auto-save timer on section title update
    if (onResetAutoSaveTimer && editingTitle) {
      onResetAutoSaveTimer();
    }

    if (editingTitle) {
      setSectionUpdates((prev) => {
        return prev?.map((sec) => (sec.id === activeSection ? { ...sec, title } : sec));
      });
    }
    setEditingTitle((prev) => !prev);
  };

  const handleRemoveSection = () => {
    if (isLocked) return;
    // Reset auto-save timer on section remove
    if (onResetAutoSaveTimer) {
      onResetAutoSaveTimer();
    }

    setSectionUpdates((prev) => {
      setFormValues((prevFromVals) => {
        const updatedValues = { ...prevFromVals };
        delete updatedValues[activeSection];
        return updatedValues;
      });
      const oldActiveSection = activeSection;
      setActiveSection(1);
      return prev?.filter((sec) => sec.id !== oldActiveSection);
    });
  };

  const validateAddress = (address: string): { isValid: boolean; errorMessage?: string } => {
    if (!address) {
      return {
        isValid: false,
        errorMessage: "Please enter a home address",
      };
    }

    if (address.length < 10) {
      return {
        isValid: false,
        errorMessage: "Address is too short. Please enter a complete address",
      };
    }

    if (address.length > 200) {
      return {
        isValid: false,
        errorMessage: "Address is too long. Please enter a valid address (max 200 characters)",
      };
    }

    // Check for basic address components (numbers and letters)
    const hasNumber = /\d/.test(address);
    const hasLetters = /[a-zA-Z]/.test(address);

    if (!hasNumber || !hasLetters) {
      return {
        isValid: false,
        errorMessage: "Please enter a valid street address with both numbers and street name",
      };
    }

    // Check for minimum number of words (at least 3: number, street, city/state)
    const wordCount = address.split(/\s+/).filter((word) => word.length > 0).length;
    if (wordCount < 3) {
      return {
        isValid: false,
        errorMessage: "Please enter a complete address including street, city, and state",
      };
    }

    return { isValid: true };
  };

  const handlePlaceEagleViewOrder = async () => {
    const address = formValues[activeSection]?.home_address?.trim() || "";

    // Validate address
    const validation = validateAddress(address);
    if (!validation.isValid) {
      toast({
        title: "Validation Error",
        description: validation.errorMessage,
        variant: "destructive",
      });
      return;
    }

    // All validation passed - now place the order with EagleView
    try {
      // Step 1: Create order request from address with locationId:contactId as ReferenceID
      // This format is required by the EagleView webhook callback to identify the GHL location and contact
      const referenceId = `${locationId}:${contactId}`;
      const orderRequest = measurementOrdersService.createBasicOrderFromAddress(
        address,
        referenceId, // Pass locationId:contactId as ReferenceID for webhook parsing
        roofProduct, // Already a Primary Product ID from enum
        deliveryInstruction, // Use deliveryInstruction state
        measurementInstruction, // Already a MeasurementInstructionType from enum
        promoCode.trim() || null // Optional promo code
      );

      // Step 2: Place the order with EagleView API
      const orderResponse = await measurementOrdersService.placeOrder(orderRequest);

      // Step 3: Store the order details in formValues for persistence
      // Use the first report ID from the ReportIds array
      const reportId = orderResponse.ReportIds?.[0];

      // Update formValues synchronously for both local and parent state
      const updatedFormValues = {
        ...formValues,
        [activeSection]: {
          ...formValues[activeSection],
          eagleview_report_id: reportId,
          eagleview_order_id: orderResponse.OrderId,
          eagleview_report_status: ReportStatus.Created,
        },
      };

      // Reset auto-save timer after placing order
      if (onResetAutoSaveTimer) {
        onResetAutoSaveTimer();
      }

      // Update local state
      setFormValues(updatedFormValues);

      // Update parent state immediately
      if (setExternalFormValues) {
        setExternalFormValues(updatedFormValues);
      }

      // Step 4: Store the measurement report data in GHL contact custom fields
      if (ghlCredentials && contactId) {
        try {
          await updateMeasurementReport(
            ghlCredentials,
            contactId,
            reportId?.toString(),
            ReportStatus.Created.toString(),
            orderResponse.OrderId?.toString(),
          );
          console.log("EagleView order details saved to GHL contact custom fields");
        } catch (ghlError) {
          console.error("Error saving EagleView order details to GHL:", ghlError);
          // Don't throw - the order was placed successfully, just log the GHL save error
        }
      }

      if (onSaveRequested) {
        onSaveRequested(updatedFormValues, sectionUpdates);
      }

      toast({
        title: "Order Placed",
        description: `EagleView order #${orderResponse.OrderId} submitted successfully.`,
      });
      console.log("Measurement order submitted successfully:", orderResponse);
    } catch (error) {
      console.error("Error placing EagleView order:", error);
      toast({
        title: "Order Failed",
        description:
          error.message ||
          "Failed to place measurement order. Please ensure EagleView credentials are configured in GHL location settings.",
        variant: "destructive",
      });
    }
  };

  const handleGetEagleViewOrder = async () => {
    const reportId = formValues[activeSection]?.eagleview_report_id || contact?.customField?.find((f) => f.key === "contact.eagleview_report_id")?.value;

    if (!reportId) {
      toast({
        title: "Error",
        description: "No report ID found",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Fetching Report",
        description: "Retrieving measurement report...",
      });

      // Fetch the report from EagleView API
      const reportResponse = await measurementOrdersService.getMeasurementReport(reportId);
      const reportStatus: ReportStatus = reportResponse.StatusId;

      const reportUrl = (reportStatus === ReportStatus.Completed && reportResponse.ReportDownloadLink)
        ? formatGoogleViewerUrl(reportResponse.ReportDownloadLink, false)
        : null;

      // Update formValues with the latest status and report data
      const updatedFormValues = {
        ...formValues,
        [activeSection]: {
          ...formValues[activeSection],
          eagleview_report_id: reportId,
          eagleview_report_status: reportStatus,
          eagleview_report_url: reportUrl,
          eagleview_report_data: {
            displayStatus: reportResponse.DisplayStatus,
            status: reportResponse.Status,
            datePlaced: reportResponse.DatePlaced,
            dateCompleted: reportResponse.DateCompleted,
            reportDownloadLink: reportResponse.ReportDownloadLink,
            totalCost: reportResponse.TotalCost,
            area: reportResponse.Area,
            pitch: reportResponse.Pitch,
            lengthRidge: reportResponse.LengthRidge,
            lengthValley: reportResponse.LengthValley,
            lengthEave: reportResponse.LengthEave,
            lengthRake: reportResponse.LengthRake,
            lengthHip: reportResponse.LengthHip,
            totalRoofFacets: reportResponse.TotalRoofFacets,
          },
        },
      };

      // Reset auto-save timer after fetching report
      if (onResetAutoSaveTimer) {
        onResetAutoSaveTimer();
      }

      // Update local state
      setFormValues(updatedFormValues);

      // Update parent state immediately
      if (setExternalFormValues) {
        setExternalFormValues(updatedFormValues);
      }

      // Update the measurement report status in GHL contact custom fields
      if (ghlCredentials && contactId) {
        try {
          await updateMeasurementReport(ghlCredentials, contactId, reportId?.toString(), reportStatus.toString(), null, reportResponse.ReportDownloadLink);
          console.log("EagleView report status updated in GHL contact custom fields");
        } catch (ghlError) {
          console.error("Error updating EagleView report status in GHL:", ghlError);
          // Don't throw - the report was fetched successfully, just log the GHL save error
        }
      }

      toast({
        title: "Report Updated",
        description: `Status: ${reportResponse.DisplayStatus || reportResponse.Status}`,
      });
    } catch (error) {
      console.error("Error fetching EagleView report:", error);
      toast({
        title: "Fetch Failed",
        description: error.message || "Failed to retrieve measurement report",
        variant: "destructive",
      });
    }
  };

  const handleAddItemConfirm = (type: 'custom' | 'catalog', selectedItems?: SelectedCatalogItem[]) => {
    if (!currentConfig || !currentPath) return;

    if (type === 'catalog' && selectedItems && selectedItems.length > 0) {
      const tabId = currentTabIndex !== null
        ? sectionUpdates.find((sec) => sec.id === activeSection)?.tabs?.[currentTabIndex]?.id
        : null;

      const existingItems = currentTabIndex !== null
        ? formValues[activeSection]?.tabs?.[tabId]?.arrays?.[currentPath.parentFieldName]?.[currentPath.itemId]?.[currentConfig.name] || {}
        : formValues[activeSection]?.arrays?.[currentPath.parentFieldName]?.[currentPath.itemId]?.[currentConfig.name] || {};

      let addedCount = 0;
      let skippedCount = 0;
      const formulasByKey = new Map<string, string>();
      products.forEach((p) => {
        const meta = getProductFormulaMeta(p);
        if (meta?.key && meta.expression) formulasByKey.set(meta.key, meta.expression);
      });
      const measurementContext = getMeasurementContext(formValues);
      selectedItems.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (!product) return;

        const isDuplicate = Object.values(existingItems).some((existing) => {
          const existingItem = existing as QuoteItem & { catalog_variant_id?: string };
          if (item.variantId && existingItem.catalog_variant_id === item.variantId) return true;
          if (!item.variantId && existingItem.catalog_product_id === product.id) return true;
          return false;
        });

        if (isDuplicate) {
          skippedCount++;
          return; // Skip this product
        }

       const productPrice = item.price ?? product.price ?? 0;
        // ------------------------------------------------------------------Empty string means "All Suppliers" so use default price
        // if (selectedSupplierId && selectedSupplierId.trim() !== '' &&
        //   product.product_suppliers && Array.isArray(product.product_suppliers)) {
        //   const supplierPrice = product.product_suppliers.find(
        //     sp => sp.supplier_id === selectedSupplierId
        //   );
        //   if (supplierPrice) {
        //     productPrice = supplierPrice.price;
        //   }
        // }

        const formulaExpression = getProductFormulaMeta(product)?.expression || "";
        const evalResult = evaluateFormulaForProduct(
          product,
          formulasByKey,
          measurementContext,
          product.wastage_percentage
        );

        const initialValues = {
          text: product.name || '',
          price: productPrice,
          quantity: evalResult.value ?? 0,
          description: product.description || '',
          wastage_percentage: product.wastage_percentage || 0,
          is_catalog_item: true,
          catalog_product_id: product.id,
          catalog_variant_id: item.variantId ?? null,
          catalog_supplier_id: item.supplierId ?? null,
          sku: item.sku ?? null,
          unit_of_measure: item.unitOfMeasure ?? null,
          formula_expression: formulaExpression || "",
        };
        handleArrayAdd(currentConfig, currentPath, currentTabIndex, initialValues);
        addedCount++;
      });

      // Show appropriate toast message
      if (addedCount > 0 && skippedCount > 0) {
        toast({
          title: "Products Added",
          description: `${addedCount} product(s) added successfully. ${skippedCount} duplicate(s) skipped.`,
        });
      } else if (addedCount > 0) {
        toast({
          title: "Products Added",
          description: `${addedCount} product(s) added successfully`,
        });
      } else if (skippedCount > 0) {
        toast({
          title: "Duplicates Detected",
          description: `${skippedCount} selected product(s) already exist in this section.`,
          variant: "destructive",
        });
      }
    } else {
      // Add custom item
      const initialValues = {
        is_catalog_item: false,
        price: 0,
        quantity: 0,
        wastage_percentage: 0,
      };
      handleArrayAdd(currentConfig, currentPath, currentTabIndex, initialValues);
    }

    // Reset modal state
    setIsAddItemModalOpen(false);
    setCurrentConfig(null);
    setCurrentPath(null);
    setCurrentTabIndex(null);
  };

  if (!section && !isLeadDetailsSection) {
    return <h1>Please select a section to continue</h1>;
  }

  return (
    <>
      <div className={isLocked ? 'pointer-events-none opacity-60 select-none' : ''}>
        <fieldset disabled={isLocked} className="contents">
          <div className=" p-4 min-h-[500px]">
        {!isLeadDetailsSection && (
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              {editingTitle ? (
                <>
                  <Input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
                </>
              ) : (
                <h3 className="font-semibold tracking-tight text-lg">{section?.title}</h3>
              )}
              <Button variant="ghost" size="icon" className="h-6 w-6 ml-2" onClick={handleSectionTitleUpdate}>
                {editingTitle ? <Check className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
              </Button>
            </div>
            {section?.type === "custom" && (
              <div className="flex items-center justify-end mb-3">
                <Button variant="outline" size="sm" onClick={handleRemoveSection}>
                  <TrashIcon className="w-3 h-3 text-red-500" />
                </Button>
              </div>
            )}
          </div>
        )}

        {isLeadDetailsSection && (
          <div className="space-y-4 mt-3">
            <DataEntrySection
              activeSection={Number(activeSection)}
              formValues={formValues}
              handleFieldChange={handleFieldChange}
              setFormValues={setFormValues}
              sectionUpdates={sectionUpdates}
              products={products}
              onResetAutoSaveTimer={onResetAutoSaveTimer}
            />
            {/* {section.sections?.map((sec, index) => (
              <div key={`section-${index}`} className="border rounded-md p-3 mt-3">
                <h3 className="font-semibold tracking-tight text-lg">{sec?.title}</h3>
                {sec?.description && (
                  <p className="font-regular tracking-tight text-sm pb-3">
                    {sec?.description}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {sec?.fields?.map((field, idx) => generateField(field, idx))}
                </div>
              </div>
            ))} */}
          </div>
        )}

            {activeSection === MeasurementsPageId && (
              <div className="border rounded-md p-4 mt-3 space-y-4">
                <div className="border rounded-md p-4 mt-3 space-y-4">
                  <p className="text-sm text-muted-foreground">Add measurements for this property either manually or order from our supporter partner.</p>
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Measurement source</Label>
                    <RadioGroup
                      value={formValues[activeSection]?.measurementsReportMode ?? "manual"}
                      onValueChange={(value: "manual" | "eagleview" | "quickmeasure") => {
                        handleFieldChange("measurementsReportMode", value, {}, null);
                        handleFieldChange(
                          "measurement_provider",
                          value === "quickmeasure" ? "quickmeasure" : "eagleview",
                          {}, null
                        );
                      }}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="manual" id="measurements-manual" />
                        <Label htmlFor="measurements-manual" className="font-normal cursor-pointer">Manual</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="eagleview" id="measurements-eagleview" />
                        <Label htmlFor="measurements-eagleview" className="font-normal cursor-pointer">EagleView</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="quickmeasure" id="measurements-quickmeasure" />
                        <Label htmlFor="measurements-quickmeasure" className="font-normal cursor-pointer">QuickMeasure</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  {/* Provider Selection */}
                  {/* <div className="space-y-3">
              <Label className="text-base font-semibold">Select Measurement Provider</Label>
              <div className="grid grid-cols-2 gap-4">
                <Card
                  className={`p-4 cursor-pointer transition-all hover:border-primary ${(formValues[activeSection]?.measurement_provider || 'eagleview') === 'eagleview'
                    ? 'border-primary border-2 bg-primary/5'
                    : 'border-muted'
                    }`}
                  onClick={() => handleFieldChange('measurement_provider', 'eagleview', {}, null)}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    </div>
                    <h3 className="font-semibold">EagleView</h3>
                    <p className="text-xs text-muted-foreground text-center">
                      Aerial measurements with detailed reports
                    </p>
                  </div>
                </Card>

                <Card
                  className={`p-4 cursor-pointer transition-all hover:border-primary ${formValues[activeSection]?.measurement_provider === 'quickmeasure'
                    ? 'border-primary border-2 bg-primary/5'
                    : 'border-muted'
                    }`}
                  onClick={() => handleFieldChange('measurement_provider', 'quickmeasure', {}, null)}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    </div>
                    <h3 className="font-semibold">QuickMeasure</h3>
                    <p className="text-xs text-muted-foreground text-center">
                      Fast measurements with instant results
                    </p>
                  </div>
                </Card>
              </div>
            </div> */}

                  {/* Show form only after provider selection */}
                  {(
                    <>

                      <div className="border rounded-md p-4 mt-3 space-y-4">
                        {(formValues[activeSection]?.measurement_provider || 'eagleview') === 'eagleview' && (
                          <>
                            {/* <p className="text-sm text-muted-foreground">Add measurements for this property—manually or via EagleView report.</p> */}
                            {/* Toggle: Manual vs EagleView */}
                            {/* <div className="space-y-2">
                        <Label className="text-base font-semibold">Measurement source</Label>
                        <RadioGroup
                          value={formValues[activeSection]?.measurementsReportMode ?? "manual"}
                          onValueChange={(value: "manual" | "eagleview") => handleFieldChange("measurementsReportMode", value, {}, null)}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="manual" id="measurements-manual" />
                            <Label htmlFor="measurements-manual" className="font-normal cursor-pointer">Manual</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="eagleview" id="measurements-eagleview" />
                            <Label htmlFor="measurements-eagleview" className="font-normal cursor-pointer">EagleView</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="quickmeasure" id="measurements-quickmeasure" />
                            <Label htmlFor="measurements-quickmeasure" className="font-normal cursor-pointer">QuickMeasure</Label>
                          </div>
                        </RadioGroup>
                      </div> */}
                          </>
                        )}
                        {/* Manual measurements: list from Settings → Measurements (measurement-types) */}
                        {(
                          (formValues[activeSection]?.measurement_provider || "eagleview") === "eagleview" &&
                          (formValues[activeSection]?.measurementsReportMode ?? "manual") === "manual"
                        ) && (
                            <div className="space-y-3">
                              <Label className="text-base font-semibold">Measurements</Label>
                              <p className="text-sm text-muted-foreground">Enter quantities for each measurement type. Leave blank if not applicable.</p>
                              <div className="grid gap-3 sm:grid-cols-2">
                                {measurementTypes
                                  // NEW: for Vanguard show only its specific fields; for others show only global fields
                                  .filter((mt) => mt.usedInManual && (mt.locationIds && mt.locationIds.includes(locationId ?? "") || !mt.locationIds))
                                  .map((mt) => (
                                    <div key={mt.id} className="space-y-1.5">
                                      <Label htmlFor={`manual-${mt.key}`} className="text-sm font-medium">
                                        {mt.name}
                                        {mt.unit && <span className="text-muted-foreground font-normal"> ({mt.unit})</span>}
                                      </Label>
                                      <Input
                                        id={`manual-${mt.key}`}
                                        type="text"
                                        inputMode="decimal"
                                        placeholder={`Enter ${mt.name.toLowerCase()}`}
                                        value={formValues[activeSection]?.manualMeasurements?.[mt.key] ?? ""}
                                        onChange={(e) => {
                                          const next = { ...(formValues[activeSection]?.manualMeasurements || {}), [mt.key]: e.target.value };
                                          handleFieldChange("manualMeasurements", next, {}, null);
                                        }}
                                      />
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}

                        {(
                          (formValues[activeSection]?.measurement_provider ?? "eagleview") === "eagleview" &&
                          (formValues[activeSection]?.measurementsReportMode ?? "manual") !== "manual"
                        ) && (
                            <>
            {!isEagleViewAuthorized && (
              <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950 p-4 text-sm text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800">
                <p className="font-medium mb-1">Authorization Required</p>
                <p>
                  Please connect your Eagleview account in{" "}
                  <a href="/settings" className="underline font-medium hover:text-yellow-900 dark:hover:text-yellow-100">
                    Settings
                  </a>
                  {" "}before placing orders.
                </p>
              </div>
            )}

            <div className="space-y-4">

              {/* Building ID / Address */}
              <div className="space-y-2">
                <Label htmlFor="home_address" className="text-base font-semibold">Home Address</Label>
                <Input
                  id="home_address"
                  placeholder="Enter the property address (e.g., 123 Main St, City, State ZIP)"
                  value={formValues[activeSection]?.home_address || ""}
                  onChange={(e) => handleFieldChange("home_address", e.target.value, {}, null)}
                />
              </div>

              {/* Only show configuration options before order is placed */}
              {!formValues[activeSection]?.eagleview_report_id && (
                <>
                  {/* Property Type Selection */}
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Property Type</Label>
                    <RadioGroup
                      value={propertyType}
                      onValueChange={setPropertyType}
                      className="flex gap-4 mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="residential" id="residential" />
                        <Label htmlFor="residential" className="font-normal cursor-pointer">Residential</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="commercial" id="commercial" />
                        <Label htmlFor="commercial" className="font-normal cursor-pointer">Commercial</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Roof Products */}
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Roof Products</Label>
                    <Select
                      value={roofProduct.toString()}
                      onValueChange={(value) => setRoofProduct(parseInt(value))}
                      disabled={isLoadingProducts}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingProducts ? "Loading products..." : "Select roof product"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProducts.length > 0 ? (
                          getFilteredProducts().map(product => (
                            <SelectItem key={product.productID} value={product.productID.toString()}>
                              {product.description || product.name}
                            </SelectItem>
                          ))
                        ) : (
                          // Fallback to hardcoded values if products aren't loaded
                          propertyType === "residential" ? (
                            <>
                              <SelectItem value={PrimaryProductId.PremiumResidential.toString()}>Premium</SelectItem>
                              <SelectItem value={PrimaryProductId.BidPerfectResidential.toString()}>Bid Perfect™</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value={PrimaryProductId.PremiumCommercial.toString()}>Premium</SelectItem>
                              <SelectItem value={PrimaryProductId.BidPerfectCommercial.toString()}>Bid Perfect™</SelectItem>
                            </>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                                    {/* Delivery Instructions */}
                                    <div className="space-y-2">
                                      <Label className="text-base font-semibold">Delivery Instructions</Label>
                                      <Select
                                        value={deliveryInstruction.toString()}
                                        onValueChange={(value) => setDeliveryInstruction(parseInt(value))}
                                        disabled={isLoadingProducts}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder={isLoadingProducts ? "Loading delivery options..." : "Select delivery instruction"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {availableProducts.length > 0 ? (
                                            (() => {
                                              const selectedProduct = getSelectedProduct();
                                              const deliveryOptions = getAvailableDeliveryOptions(selectedProduct);

                            return deliveryOptions.length > 0 ? (
                              deliveryOptions.map(delivery => (
                                <SelectItem key={delivery.productID} value={delivery.productID.toString()}>
                                  {delivery.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value={DeliveryProductId.RegularDelivery.toString()}>Regular Delivery</SelectItem>
                            );
                          })()
                        ) : (
                          // Fallback to hardcoded values if products aren't loaded
                          (roofProduct === PrimaryProductId.BidPerfectResidential || roofProduct === PrimaryProductId.BidPerfectCommercial) ? (
                            <>
                              <SelectItem value={DeliveryProductId.RegularDelivery.toString()}>Regular Delivery</SelectItem>
                              <SelectItem value={DeliveryProductId.QuickDelivery.toString()}>Quick Delivery</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value={DeliveryProductId.RegularDelivery.toString()}>Regular Delivery</SelectItem>
                              <SelectItem value={DeliveryProductId.ExpressDelivery.toString()}>Express Delivery</SelectItem>
                              <SelectItem value={DeliveryProductId.ThreeHourDelivery.toString()}>Three Hour Delivery</SelectItem>
                            </>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Measurement Instructions */}
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Measurement Instructions</Label>
                    <Select
                      value={measurementInstruction.toString()}
                      onValueChange={(value) => setMeasurementInstruction(parseInt(value))}
                      disabled={isLoadingProducts}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingProducts ? "Loading measurement options..." : "Select measurement instruction"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProducts.length > 0 ? (
                          (() => {
                            const selectedProduct = getSelectedProduct();
                            const validInstructionTypes = selectedProduct?.measurementInstructionTypes || [];

                            return validInstructionTypes.length > 0 ? (
                              validInstructionTypes.map(type => (
                                <SelectItem key={type} value={type.toString()}>
                                  {getMeasurementInstructionLabel(type)}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value={MeasurementInstructionType.PrimaryStructureOnly.toString()}>
                                Primary Structure Only
                              </SelectItem>
                            );
                          })()
                        ) : (
                          // Fallback to hardcoded values if products aren't loaded
                          propertyType === "residential" ? (
                            <>
                              <SelectItem value={MeasurementInstructionType.PrimaryStructureOnly.toString()}>Primary Structure Only</SelectItem>
                              <SelectItem value={MeasurementInstructionType.PrimaryPlusDetachedGarage.toString()}>Primary Structure + Detached Garage</SelectItem>
                              <SelectItem value={MeasurementInstructionType.AllStructuresOnParcel.toString()}>All Structures on Parcel</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value={MeasurementInstructionType.PrimaryStructureOnly.toString()}>Primary Structure Only</SelectItem>
                              <SelectItem value={MeasurementInstructionType.PrimaryPlusDetachedGarage.toString()}>Primary Structure + Detached Garage</SelectItem>
                              <SelectItem value={MeasurementInstructionType.AllStructuresOnParcel.toString()}>All Structures on Parcel</SelectItem>
                              <SelectItem value={MeasurementInstructionType.CommercialComplex.toString()}>Commercial Complex</SelectItem>
                            </>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Promo Code */}
                  <div className="space-y-2">
                    <Label htmlFor="promoCode" className="text-base font-semibold">Promo Code (Optional)</Label>
                    <Input
                      id="promoCode"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Enter promo code"
                    />
                  </div>
                </>
              )}

              {/* Order Status and Actions */}
              <div className="flex items-center gap-3 pt-2">
                {formValues[activeSection]?.eagleview_report_id && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Report #:</span>
                      <span className="text-sm text-muted-foreground font-mono">
                        {formValues[activeSection].eagleview_report_id}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Status:</span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${getStatusBadgeClassName(
                          formValues[activeSection]?.eagleview_report_data?.displayStatus ||
                          formValues[activeSection]?.eagleview_report_data?.status ||
                          getReportStatusText(formValues[activeSection]?.eagleview_report_status),
                        )}`}
                      >
                        {formValues[activeSection]?.eagleview_report_data?.displayStatus ||
                          formValues[activeSection]?.eagleview_report_data?.status ||
                          getReportStatusText(formValues[activeSection]?.eagleview_report_status)}
                      </Badge>
                    </div>
                  </>
                )}
                {!formValues[activeSection]?.eagleview_report_data?.reportDownloadLink && (
                  <Button
                    onClick={() => {
                      if (formValues[activeSection]?.eagleview_report_id) {
                        handleGetEagleViewOrder();
                      } else {
                        handlePlaceEagleViewOrder();
                      }
                    }}
                    disabled={!formValues[activeSection]?.home_address?.trim() || !isEagleViewAuthorized}
                    className={formValues[activeSection]?.eagleview_report_id ? "ml-auto" : ""}
                  >
                    {formValues[activeSection]?.eagleview_report_id ? "Get Report" : "Order Report"}
                  </Button>
                )}
              </div>

              {formValues[activeSection]?.eagleview_report_data?.reportDownloadLink &&
                formValues[activeSection]?.eagleview_report_status === ReportStatus.Completed && (
                  <Collapsible open={isPdfViewerOpen} onOpenChange={setIsPdfViewerOpen}>
                    <div className="border rounded-md overflow-hidden bg-muted/20">
                      <div className="flex items-center justify-between p-3 bg-muted/50 border-b">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Measurement Report</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={formValues[activeSection].eagleview_report_data.reportDownloadLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            Download Report
                          </a>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${isPdfViewerOpen ? "rotate-180" : ""}`}
                              />
                              <span className="sr-only">Toggle PDF viewer</span>
                            </Button>
                          </CollapsibleTrigger>
                        </div>
                      </div>
                      <CollapsibleContent>
                        <div className="w-full h-[600px]">
                          <iframe
                            src={formatGoogleViewerUrl(formValues[activeSection].eagleview_report_data.reportDownloadLink, true)}
                            className="w-full h-full"
                            title="EagleView Measurement Report"
                            frameBorder="0"
                          />
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                                  )}
                              </div>
                            </>
                          )}

                        {formValues[activeSection]?.measurement_provider === 'quickmeasure' && (
                          <>
                            {!isQuickMeasureAuthorized && (
                              <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950 p-4 text-sm text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800">
                                <p className="font-medium mb-1">Authorization Required</p>
                                <p>
                                  Please connect your QuickMeasure account in{" "}
                                  <a href="/settings" className="underline font-medium hover:text-yellow-900 dark:hover:text-yellow-100">
                                    Settings
                                  </a>{" "}
                                  before placing orders.
                                </p>
                              </div>
                            )}

                            <div className={`space-y-4 ${!isQuickMeasureAuthorized ? "mt-4" : ""}`}>
                              {/* Site Status */}
                              <div className="flex items-center gap-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleGetSiteStatus}
                                  disabled={!isQuickMeasureAuthorized || isCheckingSiteStatus}
                                >
                                  {isCheckingSiteStatus
                                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Checking...</>
                                    : "Check Site Status"}
                                </Button>
                                {siteStatusData && (
                                  <>
                                    <Badge
                                      variant="outline"
                                      className={siteStatusData.siteStatus === "Open"
                                        ? "bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400"
                                        : "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400"}
                                    >
                                      {siteStatusData.siteStatus}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">(~{siteStatusData.siteAverageResponseTime} min)</span>
                                  </>
                                )}
                              </div>

                              {/* Home Address */}
                              <div className="space-y-1">
                                <Label htmlFor="qm_home_address" className="text-base font-semibold">Home Address</Label>
                                {!getContactAddress() && (
                                  <p className="text-xs text-amber-600 dark:text-amber-400">
                                    No address on GHL contact. Enter address below — it will be saved to the contact before placing an order.
                                  </p>
                                )}
                                <div className="flex gap-2">
                                  <div className="relative flex-1">
                                    <Input
                                      id="qm_home_address"
                                      placeholder="Enter the property address (e.g., 123 Main St, City, State ZIP)"
                                      value={formValues[activeSection]?.quickmeasure_home_address || ""}
                                      onChange={(e) => {
                                        handleFieldChange("quickmeasure_home_address", e.target.value, {}, null);
                                        if (coverageData) setCoverageData(null);
                                      }}
                                      className={[
                                        "pr-8",
                                        coverageData?.success === true ? "border-green-500 focus-visible:ring-green-500" : "",
                                        coverageData?.success === false ? "border-red-500 focus-visible:ring-red-500" : "",
                                      ].join(" ")}
                                    />
                                    {coverageData !== null && (
                                      <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                                        {coverageData.success
                                          ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                                          : <XCircle className="h-4 w-4 text-red-500" />}
                                      </div>
                                    )}
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => { await handleCheckCoverage(); }}
                                    disabled={
                                      !isQuickMeasureAuthorized ||
                                      isCheckingCoverage ||
                                      !formValues[activeSection]?.quickmeasure_home_address?.trim()
                                    }
                                    className="shrink-0"
                                  >
                                    {isCheckingCoverage
                                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Checking...</>
                                      : "Check Coverage"}
                                  </Button>
                                </div>
                              </div>

                              {/* Property Type */}
                              <div className="space-y-2">
                                <Label className="text-base font-semibold">Property Type</Label>
                                <RadioGroup
                                  value={formValues[activeSection]?.quickmeasure_product_code || "SF"}
                                  onValueChange={(value) => {
                                    handleFieldChange("quickmeasure_product_code", value, {}, null);
                                    handleFieldChange("quickmeasure_selected_product_code", "", {}, null);
                                    setCoverageData(null);
                                    setPartnerDetails(null);
                                    // setAccountCheckData(null);
                                    setQuickMeasureOrderData(null);
                                  }}
                                  className="flex gap-6 mt-1"
                                >
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="SF" id="qm_sf" />
                                    <Label htmlFor="qm_sf" className="font-normal cursor-pointer">Single Family</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="MF" id="qm_mf" />
                                    <Label htmlFor="qm_mf" className="font-normal cursor-pointer">Multi-Family</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="CM" id="qm_cm" />
                                    <Label htmlFor="qm_cm" className="font-normal cursor-pointer">Commercial</Label>
                                  </div>
                                </RadioGroup>
                              </div>

                              {/* Partner Details */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <Label className="text-base font-semibold">Partner Details</Label>
                                    {partnerDetails && (
                                      <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400">
                                        {partnerDetails.subscribers?.[0]?.name || "Configured"}
                                      </Badge>
                                    )}
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleGetPartnerDetails}
                                    disabled={!isQuickMeasureAuthorized || isLoadingPartnerDetails}
                                    className="shrink-0"
                                  >
                                    {isLoadingPartnerDetails
                                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</>
                                      : partnerDetails ? "Refresh" : "Get Partner Details"}
                                  </Button>
                                </div>

                                {partnerDetails && (() => {
                                  const allProducts = partnerDetails.subscribers.flatMap(sub =>
                                    (sub.subscriberProduct || []).map(p => ({ ...p, subscriberName: sub.name }))
                                  );
                                  return (
                                    <div className="space-y-1">
                                      <Label className="text-sm font-medium text-muted-foreground">Select Product</Label>
                                      <Select
                                        value={formValues[activeSection]?.quickmeasure_selected_product_code || ""}
                                        onValueChange={(value) => {
                                          handleFieldChange("quickmeasure_selected_product_code", value, {}, null);
                                          if (onResetAutoSaveTimer) onResetAutoSaveTimer();
                                        }}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select a product to order..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {allProducts.length > 0 ? (
                                            allProducts.map((product) => (
                                              <SelectItem key={product.subscriberProductId} value={product.productCode}>
                                                {product.productCode} — ${product.price.toFixed(2)}
                                              </SelectItem>
                                            ))
                                          ) : (
                                            <SelectItem value="__none__" disabled>No products available</SelectItem>
                                          )}
                                        </SelectContent>
                                      </Select>
                                      {!formValues[activeSection]?.quickmeasure_selected_product_code && (
                                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                          Select a product before placing an order.
                                        </p>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* Customer Email */}
                              {/* <div className="space-y-1">
                          <Label htmlFor="qm_customer_email" className="text-base font-semibold">Customer Email</Label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Input
                                id="qm_customer_email"
                                type="email"
                                placeholder="customer@email.com"
                                value={formValues[activeSection]?.customer_email || ""}
                                onChange={(e) => {
                                  handleFieldChange("customer_email", e.target.value, {}, null);
                                  if (accountCheckData) setAccountCheckData(null);
                                }}
                                className={[
                                  "pr-8",
                                  accountCheckData?.success === true ? "border-green-500 focus-visible:ring-green-500" : "",
                                  accountCheckData?.success === false ? "border-red-500 focus-visible:ring-red-500" : "",
                                ].join(" ")}
                              />
                              {accountCheckData !== null && (
                                <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                                  {accountCheckData.success
                                    ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    : <XCircle className="h-4 w-4 text-red-500" />}
                                </div>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCheckAccount}
                              disabled={
                                !isQuickMeasureAuthorized ||
                                isCheckingAccount ||
                                !formValues[activeSection]?.customer_email?.trim()
                              }
                              className="shrink-0"
                            >
                              {isCheckingAccount
                                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Validating...</>
                                : "Validate Account"}
                            </Button>
                          </div>
                        </div> */}

                              {/* Additional Instructions */}
                              <div className="space-y-2">
                                <Label htmlFor="qm_instructions" className="text-base font-semibold">
                                  Additional Instructions{" "}
                                  <span className="text-muted-foreground font-normal">(Optional)</span>
                                </Label>
                                <Textarea
                                  id="qm_instructions"
                                  placeholder="e.g., Please include attached Garage"
                                  value={formValues[activeSection]?.quickmeasure_instructions || ""}
                                  onChange={(e) => handleFieldChange("quickmeasure_instructions", e.target.value, {}, null)}
                                  rows={2}
                                />
                              </div>

                              {/* Order Actions Row */}
                              <div className="flex items-center gap-3 pt-1 flex-wrap">
                                {(quickMeasureOrderData?.success || formValues[activeSection]?.quickmeasure_gaf_order_number) && (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">GAF Order #:</span>
                                      <span className="text-sm text-muted-foreground font-mono">
                                        {(quickMeasureOrderData as FlexibleQuickMeasureOrder)?.gafOrderNumber ??
                                          (quickMeasureOrderData as FlexibleQuickMeasureOrder)?.GAFOrderNumber ??
                                          formValues[activeSection]?.quickmeasure_gaf_order_number ??
                                          "—"}
                                      </span>
                                    </div>

                                    <Badge
                                      variant="outline"
                                      className={getStatusBadgeClassName(
                                        quickMeasureOrderDetail?.orderStatus ||
                                        formValues[activeSection]?.quickmeasure_order_status ||
                                        "placed"
                                      )}
                                    >
                                      {quickMeasureOrderDetail?.orderStatus ||
                                        formValues[activeSection]?.quickmeasure_order_status ||
                                        "Placed"}
                                    </Badge>

                                    {/* Get Report button */}
                                    {!quickMeasureOrderDetail?.isCompleted &&
                                      !["success", "completed"].includes(
                                        formValues[activeSection]?.quickmeasure_order_status?.toLowerCase() ?? ""
                                      ) && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={handleGetQuickMeasureOrderDetail}
                                          disabled={!isQuickMeasureAuthorized || isFetchingOrderDetail}
                                        >
                                          {isFetchingOrderDetail ? (
                                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Fetching…</>
                                          ) : (
                                            "Get Report"
                                          )}
                                        </Button>
                                      )}
                                  </>
                                )}

                                {/* Place order button — only before an order has been placed */}
                                {!quickMeasureOrderData?.success &&
                                  !formValues[activeSection]?.quickmeasure_gaf_order_number && (
                                    <Button
                                      onClick={handlePlaceQuickMeasureOrder}
                                      disabled={
                                        !isQuickMeasureAuthorized ||
                                        isPlacingOrder ||
                                        !!formValues[activeSection]?.quickmeasure_gaf_order_number ||
                                        // !formValues[activeSection]?.quickmeasure_home_address?.trim() ||
                                        // !formValues[activeSection]?.customer_email?.trim() ||
                                        !formValues[activeSection]?.quickmeasure_selected_product_code
                                      }
                                      className="ml-auto"
                                    >
                                      {isPlacingOrder ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Placing Order…</>
                                      ) : (
                                        "Place Order"
                                      )}
                                    </Button>
                                  )}
                              </div>

                              {(() => {
                                const status = formValues[activeSection]?.quickmeasure_order_status?.toLowerCase() ?? "";
                                const isCompleted = ["success", "completed"].includes(status);
                                if (!isCompleted) return null;

                                const reportMeta = formValues[activeSection]?.quickmeasure_order_detail?.reportMetaData?.RoofMeasurement;;
                                if (!reportMeta) return null;

                                const isEmptyValue = (val: unknown): boolean => {
                                  if (val === null || val === undefined) return true;
                                  if (typeof val === "string" && val.trim() === "") return true;
                                  if (typeof val === "string" && val.trim() === "[]") return true;
                                  if (typeof val === "string" && val.trim() === "{}") return true;
                                  if (Array.isArray(val)) return true;
                                  if (typeof val === "object") return true;
                                  return false;
                                };

                                const visibleEntries = Object.entries(reportMeta).filter(([_, val]) => !isEmptyValue(val));
                                if (visibleEntries.length === 0) return null;

                                return (
                                  <Collapsible defaultOpen={false}>
                                    <div className="border rounded-md overflow-hidden bg-muted/20">
                                      <div className="flex items-center justify-between p-3 bg-muted/50 border-b">
                                        <div className="flex items-center gap-2">
                                          <FileText className="h-4 w-4 text-muted-foreground" />
                                          <span className="text-sm font-medium">Measurement Summary</span>
                                        </div>
                                        <CollapsibleTrigger asChild>
                                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                            <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
                                            <span className="sr-only">Toggle summary</span>
                                          </Button>
                                        </CollapsibleTrigger>
                                      </div>
                                      <CollapsibleContent>
                                        <div className="p-4">
                                          <div className="grid grid-cols-4 gap-x-6 gap-y-3">
                                            {visibleEntries.map(([key, val]) => (
                                              <div key={key} className="flex flex-col">
                                                <span className="text-xs text-muted-foreground">{key}</span>
                                                <span className="text-sm font-semibold">{String(val)}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </CollapsibleContent>
                                    </div>
                                  </Collapsible>
                                );
                              })()}

                              {/* Report PDF Viewer */}
                              {(quickMeasureOrderDetail?.isCompleted ||
                                ["success", "completed"].includes(
                                  formValues[activeSection]?.quickmeasure_order_status?.toLowerCase() ?? ""
                                )) &&
                                (quickMeasureOrderDetail?.reportUrl || formValues[activeSection]?.quickmeasure_report_url) && (
                                  <Collapsible open={isPdfViewerOpen} onOpenChange={setIsPdfViewerOpen}>
                                    <div className="border rounded-md overflow-hidden bg-muted/20">
                                      <div className="flex items-center justify-between p-3 bg-muted/50 border-b">
                                        <div className="flex items-center gap-2">
                                          <FileText className="h-4 w-4 text-muted-foreground" />
                                          <span className="text-sm font-medium">QuickMeasure Report</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {/* Download button — uses blob URL so auth is already baked in */}
                                          {reportBlobUrl ? (
                                            <a
                                              href={reportBlobUrl}
                                              download="quickmeasure-report.pdf"
                                              className="text-xs text-primary hover:underline"
                                            >
                                              Download Report
                                            </a>
                                          ) : isLoadingReport ? (
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                              Loading…
                                            </span>
                                          ) : (
                                            // Blob not ready yet — trigger load manually
                                            <button
                                              className="text-xs text-primary hover:underline"
                                              onClick={() => {
                                                const url =
                                                  quickMeasureOrderDetail?.reportUrl ||
                                                  formValues[activeSection]?.quickmeasure_report_url;
                                                if (url) loadQuickMeasureReport(url);
                                              }}
                                            >
                                              Download Report
                                            </button>
                                          )}
                                          <CollapsibleTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                              <ChevronDown
                                                className={`h-4 w-4 transition-transform ${isPdfViewerOpen ? "rotate-180" : ""}`}
                                              />
                                              <span className="sr-only">Toggle PDF viewer</span>
                                            </Button>
                                          </CollapsibleTrigger>
                                        </div>
                                      </div>
                                      <CollapsibleContent>
                                        <div className="w-full h-[600px]">
                                          {isLoadingReport ? (
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground h-[600px] justify-center">
                                              <Loader2 className="h-6 w-6 animate-spin" />
                                              <span className="text-sm">Loading report…</span>
                                            </div>
                                          ) : reportBlobUrl ? (
                                            <iframe
                                              src={reportBlobUrl}
                                              className="w-full h-[600px]"
                                              title="QuickMeasure Report"
                                              frameBorder="0"
                                            />
                                          ) : (
                                            <p className="text-sm text-muted-foreground p-4">Report unavailable</p>
                                          )}
                                        </div>
                                      </CollapsibleContent>
                                    </div>
                                  </Collapsible>
                                )}
                            </div>
                          </>
                        )}


                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeSection !== 4 &&
              (section?.allowNewTabs
                ? renderTabs(section)
                : section?.sections?.slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((sec, index) => (
                  <div key={`section-${index}`} className="border rounded-md p-3 mt-3">
                    <h3 className="font-semibold tracking-tight text-lg">{sec?.title}</h3>
                    <p className="font-regular tracking-tight text-sm pb-3">{sec?.description}</p>
                    <div className="grid grid-cols-2 gap-3">
                      {sec?.fields?.map((field, idx) => generateField(field, idx))}
                    </div>
                  </div>
                )))}

            {section?.type === "custom" && (
              <div className="space-y-3">
                {formValues[activeSection]?.content_type === "my_pdfs" && (
                  <div className="text-sm text-muted-foreground mt-3">No PDFs available for selection.</div>
                )}
                {formValues[activeSection]?.content_type === "shared_pdfs" && (
                  <div className="text-sm text-muted-foreground mt-3">No shared PDFs available.</div>
                )}
                {formValues[activeSection]?.content_type === "single_use_pdf" && (
                  <div className="space-y-3 mt-3">
                    <FileDropzone
                      accept="application/pdf"
                      valueDataUrl={
                        formValues[activeSection]?.file_storage_path
                          ? fileUploadService.getFileUrl(formValues[activeSection]?.file_storage_path)
                          : undefined
                      }
                      fileLibrary={
                        locationId ? { locationId, contactId: contactId ?? undefined } : null
                      }
                      onLinkFromLibrary={(linked) => {
                        const payload = {
                          file_storage_path: linked.file_storage_path,
                          file_name: linked.file_name,
                          file_size: linked.file_size,
                          file_type: linked.file_type,
                        };
                        Object.keys(payload).forEach((key) => {
                          handleFieldChange(key, payload[key as keyof typeof payload], {}, null);
                        });
                        toast({
                          title: "File linked",
                          description: "An existing upload is now attached to this section.",
                        });
                      }}
                  // onChange={() => {}}
                  onChange={async (file, dataUrl) => {
                    if (file) {
                      // Validate file before upload
                      const validation = fileUploadService.validateFile(file);
                      if (!validation.valid) {
                        toast({
                          title: "Invalid file",
                          description: validation.error,
                          variant: "destructive",
                        });
                        return;
                      }

                      // Upload file to storage and update section
                      const { success, ...uploadResult } = await fileUploadService.uploadFileByLocation(
                        file,
                        locationId,
                        true,
                        contactId,
                      );

                      if (!success) {
                        return toast({
                          title: "File Upload Failed",
                          description: uploadResult.error,
                        });
                      }
                      const payload = {
                        file_storage_path: uploadResult.storagePath,
                        file_name: uploadResult.fileName,
                        file_size: uploadResult.fileSize,
                        file_type: uploadResult.fileType,
                      };

                      Object.keys(payload).forEach((key) => {
                        handleFieldChange(key, payload[key], {}, null);
                      });

                      toast({
                        title: "File uploaded successfully",
                        description: "File has been saved to storage",
                      });
                    } else {
                      const payload = {
                        file_storage_path: "",
                        file_name: "",
                        file_size: "",
                        file_type: "",
                      };

                      Object.keys(payload).forEach((key) => {
                        handleFieldChange(key, payload[key], {}, null);
                      });

                      toast({
                        title: "File removed",
                        description: "File reference has been removed",
                      });
                    }
                  }}
                />
                {formValues[activeSection]?.file_storage_path && (
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>File: {formValues[activeSection]?.file_name}</div>
                    <div>Size: {((formValues[activeSection]?.file_size || 0) / 1024).toFixed(1)} KB</div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          fileUploadService.downloadFile(
                            formValues[activeSection]?.file_storage_path,
                            formValues[activeSection]?.file_name,
                          )
                        }
                      >
                        Download
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const payload = {
                            file_storage_path: "",
                            file_name: "",
                            file_size: "",
                            file_type: "",
                          };

                          Object.keys(payload).forEach((key) => {
                            handleFieldChange(key, payload[key], {}, null);
                          });
                        }}
                      >
                        Remove File
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {(formValues[activeSection]?.content_type === "text_page" ||
              formValues[activeSection]?.content_type === undefined) && (
                <div className="space-y-2 mt-3">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                            openSaveTemplateDialog(formValues[activeSection]?.textHtml || "");
                      }}
                    >
                      Save as Template
                    </Button>
                    <Select
                      //   value={formValues[activeSection]?.textHtml || ""}
                      value={selectedTemplateIdx}
                      onValueChange={(idx) => {
                        let shouldUpdate = true;
                        if (formValues[activeSection]?.textHtml) {
                          if (!confirm("Are you sure you want to use this template?")) {
                            shouldUpdate = false;
                          }
                        }
                        if (shouldUpdate) {
                              const t = textTemplates[Number(idx)];
                              if (!t) return;
                              setSelectedTemplateId(t.id);
                              setSelectedTemplateIdx(String(idx));
                              handleFieldChange("textHtml", t.html || "", {}, null);
                            }
                          }}
                        >
                          <SelectTrigger className="w-56">
                            <SelectValue placeholder="Load template" />
                          </SelectTrigger>
                          <SelectContent className="z-50 bg-background">
                            {textTemplates.length === 0 ? (
                              <SelectItem value="__none__" disabled>
                                No templates
                              </SelectItem>
                            ) : (
                              textTemplates.map((t, i) => (
                                <SelectItem key={t.id || i} value={String(i)}>
                                  {t.name || `Template ${i + 1}`}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <Dialog open={isSaveTemplateOpen} onOpenChange={setIsSaveTemplateOpen}>
                        <DialogContent className="sm:max-w-[420px]">
                          <DialogHeader>
                            <DialogTitle>Save template</DialogTitle>
                            <DialogDescription>Enter template name and choose how to save.</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-2">
                            <div className="space-y-2">
                              <Label htmlFor="v2-custom-page-template-name" className="text-sm font-medium">
                                Template name
                              </Label>
                              <Input
                                id="v2-custom-page-template-name"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                placeholder={`Template ${textTemplates.length + 1}`}
                                className="w-full min-w-0"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                disabled={!selectedTemplateId}
                                onClick={async () => {
                                  if (!selectedTemplateId) return;
                                  if (!templateName.trim()) {
                                    toast({
                                      title: "Name required",
                                      description: "Please enter a template name.",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  const ok = await updateTextTemplate(selectedTemplateId, pendingTemplateHtml, templateName.trim());
                                  setIsSaveTemplateOpen(false);
                                  if (ok) onSaveRequested?.(formValues, sectionUpdates);
                                }}
                              >
                                Update template
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                onClick={async () => {
                                  if (!templateName.trim()) {
                                    toast({
                                      title: "Name required",
                                      description: "Please enter a template name.",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  await saveTextTemplate(pendingTemplateHtml, templateName.trim());
                                  setIsSaveTemplateOpen(false);
                                }}
                              >
                                Save as new
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                  <RichTextEditor
                    value={formValues[activeSection]?.textHtml || ""}
                    onChange={(html) => {
                      handleFieldChange("textHtml", html, {}, null);
                    }}
                  />
                </div>
              )}
          </div>
        )}

        {/* Delete tab dialog */}
        <Dialog open={isDeleteTabDialogOpen} onOpenChange={setIsDeleteTabDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Tab</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete this tab? All data associated with this tab will be permanently removed. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDeleteTabDialogOpen(false);
                    setTabToDelete(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (tabToDelete) {
                      handleTabRemove(tabToDelete.sectionId, tabToDelete.tabId);
                    }
                  }}
                >
                  Delete Tab
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

            {/* Only render once rendererKey is resolved */}
          {rendererKey !== undefined && (
          <div style={{ display: "none" }}>
          <QuotationTemplate
            formValues={formValues}
            sectionUpdates={sectionUpdates}
            locDetails={locDetails}
            contact={contact}
            locationId={locationId}
            rendererKey={rendererKey}
          />
        </div>
      )}

        <AddItemDialog
          isOpen={isAddItemModalOpen}
          onClose={() => setIsAddItemModalOpen(false)}
          onConfirm={handleAddItemConfirm}
          suppliers={suppliers}
        />

      </div >
      </fieldset>
    </div>
    </>
  );
}
