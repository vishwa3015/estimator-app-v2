
import type { Json } from "@/integrations/supabase/types";
import { QuoteLineItem } from "./estimate-items";

export type VariantType = "default" | "color" | "size" | "material";

export type ImportStatus = "created" | "updated" | "skipped" | "error";

export interface SupplierVariantOption {
  id: string;
  supplier_id: string;
  variant_name?: string | null;
  variant_type: VariantType;
  sku?: string | null;
  unit_of_measure?: string | null;
  price: number;
  is_preferred: boolean;
}

export interface SupplierPrice {
  supplier_id: string;
  price: number;
  item_id?: string[];
  variants?: SupplierVariantOption[];
  variant_name?: string | null;
  variant_type?: VariantType | null;
}
export interface TabProductDetail {
  title: string;
  description: string;
}

export interface SupplierTabSectionAssignment {
  tab_id: string;
  section_id: string;
}

export type SupplierTabSectionsMap = Record<
  string,
  SupplierTabSectionAssignment[]
>;

export interface ProductCalculation {
  supplier_tab_sections?: SupplierTabSectionsMap;
  [tabIndex: string]: unknown;
}

export interface FormulaV2 {
  key: string;
  expression: string;
  description?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  supplier?: string | null;
  product_suppliers?: SupplierPrice[] | null;
  unit_of_measure?: string | null;
  category_id?: string | null;
  location_id: string;
  wastage_percentage?: number;
  created_at: string;
  updated_at: string;
  item_type?: string[];
  tab?: string[] | null;
  sections?: string[] | null;
  quantity?: number | null;
  calculation?: ProductCalculation | null;
  formula_v2?: FormulaV2 | null;
  tab_product_details?: Record<string, TabProductDetail> | null;
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  location_id: string;
  parent_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductSupplier {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  location_id: string;
  created_at: string;
  updated_at: string;
}

export interface ProductSupplierVariant {
  id: string;
  product_id: string;
  supplier_id: string;
  variant_name?: string | null;
  variant_type: VariantType;
  sku?: string | null;
  unit_of_measure?: string | null;
  color_hex?: string | null;
  material?: string | null;
  size?: string | null;
  weight?: number | null;
  price: number;
  is_preferred: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  supplier_name?: string | null;
}

export interface ProductWithVariants extends Product {
  supplier_variants?: ProductSupplierVariant[];
}

export interface CategoryTreeNode extends ProductCategory {
  children: CategoryTreeNode[];
}

export interface RawProductRow {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  supplier?: string | null;
  unit_of_measure?: string | null;
  category_id?: string | null;
  location_id: string;
  wastage_percentage?: number | null;
  item_type?: string[] | null;
  tab?: string[] | null;
  sections?: string[] | null;
  quantity?: number | null;
  /** jsonb column — use `Json` so Supabase insert/update accepts it */
  calculation?: Json | null;
  /** jsonb column — use `Json` so Supabase insert/update accepts it */
  tab_product_details?: Json | null;
  created_at: string;
  updated_at: string;
  /** Joined relation — present only in getProducts SELECT */
  product_supplier_variants_v2?: RawVariantRow[];
  product_suppliers?: unknown;
}

export interface RawVariantRow {
  id: string;
  product_id: string;
  supplier_id: string;
  variant_name?: string | null;
  variant_type: VariantType;
  sku?: string | null;
  unit_of_measure?: string | null;
  price: number;
  is_preferred: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  /** Present when joined with product_suppliers_v2(name) */
  product_suppliers_v2?: { name: string } | null;
}

export interface RawVariantPricingRow {
  supplier_id: string;
  price: number;
  sku?: string | null;
  unit_of_measure?: string | null;
  product_suppliers_v2?: { name: string } | null;
}

export interface RawFormulaRow {
  product_id: string;
  formula_key: string;
  /** jsonb column at DB boundary — narrowed to { expression?: string } in service */
  formula: Json | null;
  description?: string | null;
}

export interface EstimateItem {
  catalog_product_id?: string;
  catalog_supplier_id?: string;
  catalog_variant_id?: string;
  text?: string;
  price?: number;
  unit_of_measure?: string;
  sku?: string;
  wastage?: number;
  wastage_percentage?: number;
  [key: string]: unknown;
}

export interface EstimateSectionData {
  section_title?: string;
  sortOrder?: number;
  Tax?: boolean;
  Margin?: boolean;
  items?: Record<string, EstimateItem>;
}

export interface EstimateTabData {
  arrays?: {
    sections?: Record<string, EstimateSectionData>;
  };
}

export interface EstimateConfigFormValues {
  "6"?: {
    tabs?: Record<string, EstimateTabData>;
  };
  [sectionKey: string]: unknown;
}

export interface EstimateConfigSection {
  id: number;
  tabs?: Array<{ id: string; title: string }>;
  [key: string]: unknown;
}

export interface EstimateConfigData {
  sections?: EstimateConfigSection[];
}

export type CreateProductParams = Omit<
  Product,
  "id" | "created_at" | "updated_at" | "location_id"
> & {
  supplierId?: string;
  variantPrice?: number;
  variantUom?: string;
  variantSku?: string;
};

export type UpdateProductParams = Partial<
  Omit<Product, "id" | "created_at" | "updated_at" | "location_id">
> & {
  supplierId?: string;
  variantPrice?: number;
  variantUom?: string;
  variantSku?: string;
};

export interface UpsertDefaultVariantParams {
  productId: string;
  supplierId: string;
  price: number;
  unitOfMeasure?: string;
  sku?: string;
}

export interface SyncProductEstimateParams {
  name?: string;
  price?: number;
  unit_of_measure?: string;
  sku?: string;
  wastage_percentage?: number;
  supplier_id?: string;
  variant_id?: string;
}

export type CreateCategoryParams = Omit<
  ProductCategory,
  "id" | "created_at" | "updated_at" | "location_id"
>;

export type UpdateCategoryParams = Partial<
  Omit<ProductCategory, "id" | "created_at" | "updated_at" | "location_id">
>;

export type CreateSupplierParams = Omit<
  ProductSupplier,
  "id" | "created_at" | "updated_at" | "location_id"
>;

export type UpdateSupplierParams = Partial<
  Omit<ProductSupplier, "id" | "created_at" | "updated_at" | "location_id">
>;

export type CreateSupplierVariantParams = Omit<
  ProductSupplierVariant,
  "id" | "created_at" | "updated_at" | "supplier_name"
>;

export type UpdateSupplierVariantParams = Partial<
  Omit<
    ProductSupplierVariant,
    "id" | "created_at" | "updated_at" | "supplier_name"
  >
>;

export interface VariantUIRow {
  id?: string;
  supplier_id: string;
  sku: string;
  unit_of_measure: string;
  price: number | string;
  is_preferred: boolean;
  is_active: boolean;
  _deleted?: boolean;
  _dirty?: boolean;
}

export type SupplierVariantMap = Record<string, VariantUIRow[]>;

export interface VariantRowErrors {
  supplier?: string;
  price?: string;
  unit_of_measure?: string;
}

export interface FormErrors {
  name?: string;
  variants?: Record<string, Record<number, VariantRowErrors>>;
  supplierMissing?: string;
}

export interface VariantPersistPayload {
  product_id: string;
  supplier_id: string;
  sku: string | null;
  unit_of_measure: string;
  price: number;
  is_preferred: boolean;
  is_active: boolean;
  variant_type: VariantType;
}

export interface ImportPreviewRow {
  name: string;
  description: string;
  category: string;
  supplier: string;
  sku: string;
  unit_of_measure: string;
  price: string;
  supplierFound: boolean;
  productExists: boolean;
  rawRow: ImportRawRow;
}

export interface ImportRawRow {
  name?: string;
  price?: string | number;
  description?: string;
  category?: string;
  category_name?: string;
  Category?: string;
  "Category Name"?: string;
  category_id?: string;
  supplier?: string;
  sku?: string;
  unit_of_measure?: string;
}

export interface ImportResultRow {
  name: string;
  status: ImportStatus;
  reason?: string;
}

export interface SelectedCatalogItem {
  productId: string;
  variantId?: string;
  supplierId?: string;
  price: number;
  sku?: string | null;
  unitOfMeasure?: string | null;
}

export interface SupplierVariantRow {
  rowKey: string;
  supplierId: string;
  price: number;
  sku?: string | null;
  unitOfMeasure?: string | null;
  variantName?: string | null;
  variantType?: VariantType | null;
  variantId?: string;
}

export interface VariantMetaRowProps {
  price: number;
  sku?: string | null;
  unitOfMeasure?: string | null;
  variantName?: string | null;
  variantType?: VariantType | null;
  supplierName?: string | null;
  isSupplierPrice?: boolean;
}

export interface FormulaRow {
  productId: string;
  productName: string;
  key: string;
}

export interface FormulaTokenOption {
  key: string;
  label: string;
  description?: string;
  group?: string;
}

export type TokenType = "operand" | "binary_op" | "open" | "close";

export type BinaryOp = "+" | "-" | "*" | "/";
export type BracketOp = "(" | ")";
export type Operator = BinaryOp | BracketOp;

export interface QuoteTab {
  id: string;
  title: string;
}

export interface TabSection {
  id: string;
  title: string;
  sortOrder?: number;
  items?: QuoteLineItem[];
}
export type ImportStep = "idle" | "preview" | "result";

export type ActiveTab = "my" | "default";

export type BinaryOperator = "+" | "-" | "*" | "/";

export type VariantPayload = VariantPersistPayload;

export type TabSectionsMap = Record<string, TabSection[]>;

export type SupplierTabAssignment = SupplierTabSectionAssignment;

export interface ProductFormulaRow {
  productId: string;
  productName: string;
  key: string;
  expression: string;
  description?: string;
}