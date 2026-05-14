import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Plus, Pencil, Trash2, Search, X, Tag } from "lucide-react";
import { formulaService } from "@/services/formulas/formula-service";
import { measurementTypes } from "@/data/measurement-types";
import ExpressionTokenPicker from "@/components/settings/ExpressionTokenPicker";
import { toast } from "sonner";
import { BulkCategorizeDialog } from "../ui/BulkCategorizeDialog";
import { productService } from "@/services/products/product-service";
import { SupplierVariantsEditor, type SupplierVariantMap } from "../ui/Suppliervariants";
import type {
  Product,
  ProductCategory,
  ProductSupplierVariant,
  SupplierTabSectionsMap,
  FormErrors,
  VariantRowErrors,
  ImportPreviewRow,
  ImportResultRow,
  ImportRawRow,
  ImportStatus,
  QuoteTab,
  FormulaRow,
  TokenType,
  ProductSupplier,
  SupplierTabAssignment,
  BinaryOperator,
  VariantPayload,
  TabSectionsMap,
  ImportStep,
  ActiveTab,

} from "@/types/product";

function parseSupplierTabSections(raw: unknown): SupplierTabSectionsMap {
  if (!raw || typeof raw !== "object") return {};

  const result: SupplierTabSectionsMap = {};

  for (const [supplierId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      result[supplierId] = (value as unknown[]).filter(
        (a): a is SupplierTabAssignment => !!a && typeof a === "object" && "tab_id" in a
      );
    } else if (value && typeof value === "object" && "tab_id" in value) {
      const legacy = value as { tab_id: string; section_id: string };
      result[supplierId] = legacy.tab_id ? [legacy] : [];
    }
  }

  return result;
}


const MEASUREMENT_OPTIONS = measurementTypes.filter((m) => m.usedInManual);
const MEASUREMENT_TOKEN_OPTIONS = MEASUREMENT_OPTIONS.map((m) => ({
  key: m.key,
  label: m.name,
  description: m.unit,
  group: "Measurements",
}));
const BINARY_OPS = ["+", "-", "*", "/"] as const;
const ALL_OPS = [...BINARY_OPS, "(", ")"] as const;
const OPERATOR_SET = new Set<string>(ALL_OPS);
const MEASUREMENT_KEYS = new Set(MEASUREMENT_OPTIONS.map((m) => m.key));
const WASTE_PERCENTAGE_KEY = "waste_percentage";
const numberRegex = /^-?\d+(\.\d+)?$/;

function getTokenType(token: string): TokenType {
  if (token === "(") return "open";
  if (token === ")") return "close";
  if (BINARY_OPS.includes(token as BinaryOperator)) return "binary_op";
  return "operand";
}
function lastType(tokens: string[]): TokenType | null {
  return tokens.length === 0 ? null : getTokenType(tokens[tokens.length - 1]);
}
function unclosedBrackets(tokens: string[]): number {
  return tokens.reduce((n, t) => (t === "(" ? n + 1 : t === ")" ? n - 1 : n), 0);
}
const canAddOperand = (tokens: string[]) => {
  const t = lastType(tokens);
  return t === null || t === "binary_op" || t === "open";
};
const canAddBinaryOp = (tokens: string[]) => {
  const t = lastType(tokens);
  return t === "operand" || t === "close";
};
const canAddOpen = (tokens: string[]) => {
  const t = lastType(tokens);
  return t === null || t === "binary_op" || t === "open";
};
const canAddClose = (tokens: string[]) => {
  const t = lastType(tokens);
  return (t === "operand" || t === "close") && unclosedBrackets(tokens) > 0;
};
const addOperand = (tokens: string[], value: string): string[] => {
  const t = lastType(tokens);
  if (t === "operand") return [...tokens.slice(0, -1), value];
  return [...tokens, value];
};
const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "formula";
function parseExpression(expr: string, formulaKeys: Set<string> = new Set()): string[] {
  const parts = expr.trim().split(/\s+/).filter(Boolean);
  const tokens: string[] = [];
  for (const p of parts) {
    if (MEASUREMENT_KEYS.has(p) || OPERATOR_SET.has(p)) tokens.push(p);
    else if (p === WASTE_PERCENTAGE_KEY || formulaKeys.has(p)) tokens.push(p);
    else if (numberRegex.test(p)) tokens.push(p);
  }
  return tokens;
}

const isGlobalProduct = (product: Product): boolean =>
  !product.location_id || product.location_id.trim() === "";

const ProductsSettings = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [suppliers, setSuppliers] = useState<ProductSupplier[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingVariants, setSavingVariants] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category_id: "",
    wastage_percentage: "",
    supplier: "",
    unit_of_measure: "",
  });

  const [supplierVariantMap, setSupplierVariantMap] = useState<SupplierVariantMap>({});
  const [readOnlyVariants, setReadOnlyVariants] = useState<ProductSupplierVariant[]>([]);
  const [supplierTabSections, setSupplierTabSections] = useState<SupplierTabSectionsMap>({});
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importRows, setImportRows] = useState<ImportRawRow[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [importLoading, setImportLoading] = useState<boolean>(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [quoteTabs, setQuoteTabs] = useState<QuoteTab[]>([]);
  const [tabSectionsMap, setTabSectionsMap] = useState<TabSectionsMap>({});
  const [loadingSections, setLoadingSections] = useState(false);
  const [selectedSectionPerTab, setSelectedSectionPerTab] = useState<Record<string, string>>({});
  const [sectionsLoadedOnce, setSectionsLoadedOnce] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [isFormulaEditDialogOpen, setIsFormulaEditDialogOpen] = useState(false);
  const [formulaEditKey, setFormulaEditKey] = useState("");
  const [formulaEditExpressionTokens, setFormulaEditExpressionTokens] = useState<string[]>([]);
  const [formulaEditDescription, setFormulaEditDescription] = useState("");
  const [formulaEditSubmitting, setFormulaEditSubmitting] = useState(false);
  const [otherFormulaRowsForEdit, setOtherFormulaRowsForEdit] = useState<FormulaRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [importPreviewRows, setImportPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [importResultRows, setImportResultRows] = useState<ImportResultRow[]>([]);
  const [importStep, setImportStep] = useState<ImportStep>("idle");
  const [bulkCategorizeOpen, setBulkCategorizeOpen] = useState(false);
  const [bulkCategorizeLoading, setBulkCategorizeLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("my");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterWastageMin, setFilterWastageMin] = useState<string>("");
  const [filterWastageMax, setFilterWastageMax] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
     setSelectedProducts([])
     setFilterCategory("all");
     setFilterWastageMin("");
     setFilterWastageMax("");
 }, [activeTab, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData, tabsData, suppliersData] = await Promise.all([
        productService.getProducts(),
        productService.getCategories(),
        productService.getQuoteTabs(),
        productService.getSuppliers(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
      setQuoteTabs(tabsData);
      setSuppliers(suppliersData);
    } catch (error) {
      toast.error("Failed to load products: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (!isDialogOpen) {
      setSectionsLoadedOnce(false);
      return;
    }

    if (sectionsLoadedOnce || quoteTabs.length === 0) return;

    const loadAllSections = async () => {
      setLoadingSections(true);

      const allTabIds = quoteTabs.map(tab => tab.id);
      const sectionsMap = await productService.getMultipleTabSections(allTabIds);

      setTabSectionsMap(sectionsMap);
      setSectionsLoadedOnce(true);
      setLoadingSections(false);
    };

    loadAllSections();
  }, [isDialogOpen, quoteTabs, sectionsLoadedOnce]);

  const validateForm = (): FormErrors | null => {
    const errors: FormErrors = {};

    if (!formData.name.trim()) {
      errors.name = "Product name is required.";
    }

    const variantErrors: NonNullable<FormErrors["variants"]> = {};
    let hasSupplierMissing = false;

    const totalActiveVariants = Object.values(supplierVariantMap)
      .flat()
      .filter((v) => !v._deleted).length;

    if (totalActiveVariants === 0) {
      errors.supplierMissing =
        "At least one supplier variant with supplier, price, and unit of measure is required.";
    } else {
      for (const [supplierId, variants] of Object.entries(supplierVariantMap)) {
        const activeVariants = variants.filter((v) => !v._deleted);
        if (activeVariants.length === 0) continue;

        if (!supplierId?.trim()) {
          hasSupplierMissing = true;
          activeVariants.forEach((_, index) => {
            if (!variantErrors["__empty__"]) variantErrors["__empty__"] = {};
            variantErrors["__empty__"][index] = { supplier: "Supplier is required." };
          });
          continue;
        }

        variants.forEach((v, index) => {
          if (v._deleted) return;
          const rowErrors: VariantRowErrors = {};

          const priceNum = Number(v.price);
          if (v.price === "" || v.price === undefined || isNaN(priceNum)) {
            rowErrors.price = "Price is required.";
          } else if (priceNum < 0) {
            rowErrors.price = "Price must be 0 or greater.";
          }

          if (!v.unit_of_measure?.trim()) {
            rowErrors.unit_of_measure = "Unit of measure is required.";
          }

          if (Object.keys(rowErrors).length > 0) {
            if (!variantErrors[supplierId]) variantErrors[supplierId] = {};
            variantErrors[supplierId][index] = rowErrors;
          }
        });
      }

      if (hasSupplierMissing) errors.supplierMissing = "One or more variant rows are missing a supplier.";
      if (Object.keys(variantErrors).length > 0) errors.variants = variantErrors;
    }

    return Object.keys(errors).length > 0 ? errors : null;
  };

  const clearFieldError = (field: keyof FormErrors) => {
    setFormErrors((prev) => {
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  };

  const hasVariantErrors =
    !!formErrors.variants && Object.keys(formErrors.variants).length > 0;

  const persistVariants = async (productId: string): Promise<void> => {
    for (const [supplierId, variants] of Object.entries(supplierVariantMap)) {
      if (!supplierId?.trim()) continue;

      for (const v of variants) {
      try {
        if (v._deleted && v.id) {
          await productService.deactivateSupplierVariant(v.id);
          continue;
        }
        if (v._deleted) continue;

        const payload: VariantPayload = {
          product_id: productId,
          supplier_id: supplierId,
          sku: v.sku.trim() || null,
          unit_of_measure: v.unit_of_measure.trim(),
          price: Number(v.price),
          is_preferred: v.is_preferred,
          is_active: true,
          variant_type: "default",
        };

        if (!v.id) {
          await productService.createSupplierVariant(payload);
        } else if (v._dirty) {
          const { product_id, ...updatePayload } = payload;
          await productService.updateSupplierVariant(v.id, updatePayload);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`Failed to persist variant for supplier ${supplierId}:`, message);
        toast.error(`Failed to save variant: ${message}`);
        // re-throw so handleSubmit knows something went wrong
        throw error;
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateForm();
    if (errors) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setSavingVariants(true);

    try {
      const sectionsArray = Object.values(selectedSectionPerTab).filter(Boolean);

      const existingCalc =
        editingProduct?.calculation && typeof editingProduct.calculation === "object"
          ? { ...editingProduct.calculation }
          : {};

      const calculation = {
        ...existingCalc,
        supplier_tab_sections: supplierTabSections,
      };

      const sharedPayload: Omit<Product, "id" | "created_at" | "updated_at" | "location_id"> = {
        name: formData.name,
        description: formData.description || "",
        price: 0,
        category_id:
          formData.category_id === "NA" || !formData.category_id
            ? null
            : formData.category_id,
        wastage_percentage: parseFloat(formData.wastage_percentage) || 0,
        calculation,
      };

      let productId: string;
      if (editingProduct) {
        await productService.updateProduct(editingProduct.id, sharedPayload);
        productId = editingProduct.id;
        toast.success("Product updated successfully");
      } else {
        const created = await productService.createProduct(sharedPayload);
        productId = created.id;
        toast.success("Product created successfully");
      }

      await persistVariants(productId);

      if (editingProduct) {
        const preferredVariant = Object.values(supplierVariantMap)
          .flat()
          .filter((v) => !v._deleted && v.is_preferred)[0];

        const activeVariant =
          preferredVariant ||
          Object.values(supplierVariantMap)
            .flat()
            .filter((v) => !v._deleted)[0];

        try {
          await productService.syncProductNameInEstimates(editingProduct.id, {
            name: formData.name.trim(),
            price: activeVariant ? Number(activeVariant.price) : undefined,
            unit_of_measure: activeVariant?.unit_of_measure?.trim() || undefined,
            sku: activeVariant?.sku?.trim() || undefined,
            wastage_percentage: parseFloat(formData.wastage_percentage) || 0,
            supplier_id: activeVariant?.supplier_id || undefined,  // ADD THIS
            variant_id: activeVariant?.id || undefined,
          });
        } catch (syncErr) {
          console.warn("Could not sync product into estimates:", syncErr);
        }
      }

      setIsDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error("Failed to save product: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSavingVariants(false);
    }
  };

  const handleEdit = async (product: Product) => {
    if (isGlobalProduct(product)) return;
    setEditingProduct(product);
    setSupplierVariantMap({});
    setReadOnlyVariants([]);
    setVariantsLoading(true);

    try {
      const allVariants = await productService.getProductSupplierVariants(product.id, {
        withSupplierName: true,
      });

      const grouped: SupplierVariantMap = {};
      const nonDefault: ProductSupplierVariant[] = [];

      allVariants.forEach((v) => {
        if (v.variant_type === "default") {
          if (!grouped[v.supplier_id]) grouped[v.supplier_id] = [];
          grouped[v.supplier_id].push({
            id: v.id,
            supplier_id: v.supplier_id,
            sku: v.sku || "",
            unit_of_measure: v.unit_of_measure || "",
            price: v.price,
            is_preferred: v.is_preferred,
            is_active: v.is_active,
            _deleted: false,
            _dirty: false,
          });
        } else {
          nonDefault.push(v);
        }
      });

      setSupplierVariantMap(grouped);
      setReadOnlyVariants(nonDefault);
    } catch (_) {
      // silently ignore
    } finally {
      setVariantsLoading(false);
    }

    setFormData({
      name: product.name,
      description: product.description || "",
      category_id: product.category_id || "",
      wastage_percentage: product.wastage_percentage?.toString() || "0",
      supplier: product.supplier || "",
      unit_of_measure: product.unit_of_measure || "",
    });

    const storedAssignments = product.calculation?.supplier_tab_sections;
    setSupplierTabSections(parseSupplierTabSections(storedAssignments));

     setSectionsLoadedOnce(false);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const product = products.find((p) => p.id === id);
    if (!product || isGlobalProduct(product)) return;

    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await productService.deleteProduct(id);
      toast.success("Product deleted successfully");
      loadData();
    } catch (error) {
      toast.error("Failed to delete product: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category_id: "",
      wastage_percentage: "",
      supplier: "",
      unit_of_measure: "",
    });
    setEditingProduct(null);
    setFormErrors({});
    setSupplierVariantMap({});
    setReadOnlyVariants([]);
    setSupplierTabSections({});
    setIsFormulaEditDialogOpen(false);
  };
    const openFormulaEditDialog = async () => {
    if (!editingProduct) return;
    const f = editingProduct.formula_v2;
    setFormulaEditKey(f?.key ?? slugify(editingProduct.name));
    setFormulaEditDescription(f?.description ?? "");
    try {
      const { rows } = await formulaService.getFormulasFromDb({ pageSize: 500 });
      const other = rows.filter((r) => r.productId !== editingProduct.id);
      setOtherFormulaRowsForEdit(other);
      const otherKeys = new Set(other.map((r) => r.key));
      const tokens = f?.expression
        ? parseExpression(f.expression, otherKeys)
        : [];
      setFormulaEditExpressionTokens(tokens);
    } catch {
      setOtherFormulaRowsForEdit([]);
      setFormulaEditExpressionTokens(f?.expression ? parseExpression(f.expression) : []);
    }
    setIsFormulaEditDialogOpen(true);
  };

  const closeFormulaEditDialog = () => setIsFormulaEditDialogOpen(false);

  const addFormulaEditToken = (token: string) => {
    setFormulaEditExpressionTokens((prev) => {
      const type = getTokenType(token);
      if (type === "operand") return addOperand(prev, token);
      if (type === "binary_op") return canAddBinaryOp(prev) ? [...prev, token] : prev;
      if (type === "open") return canAddOpen(prev) ? [...prev, token] : prev;
      if (type === "close") return canAddClose(prev) ? [...prev, token] : prev;
      return prev;
    });
  };

  const handleFormulaEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || formulaEditSubmitting) return;
    const expression = formulaEditExpressionTokens.join(" ").trim();
    if (!expression) {
      toast.error("Expression is required.");
      return;
    }
    setFormulaEditSubmitting(true);
    try {
      await formulaService.upsertFormula({
        productId: editingProduct.id,
        key: formulaEditKey.trim() || slugify(editingProduct.name),
        expression,
        description: formulaEditDescription.trim() || undefined,
      });
      const newFormulaV2 = {
        key: formulaEditKey.trim() || slugify(editingProduct.name),
        expression,
        description: formulaEditDescription.trim() || undefined,
      };
      closeFormulaEditDialog();
      setEditingProduct((prev) => (prev ? { ...prev, formula_v2: newFormulaV2 } : null));
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingProduct.id ? { ...p, formula_v2: newFormulaV2 } : p
        )
      );
      toast.success("Formula updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save formula.");
    } finally {
      setFormulaEditSubmitting(false);
    }
  };

  const formulaEditOtherKeys = useMemo(
    () => new Set(otherFormulaRowsForEdit.map((r) => r.key)),
    [otherFormulaRowsForEdit]
  );
  const formulaEditTokenOptions = useMemo(
    () =>
      otherFormulaRowsForEdit.map((f) => ({
        key: f.key,
        label: f.productName,
        description: f.key,
        group: "Existing formulas",
      })),
    [otherFormulaRowsForEdit]
  );
  const formulaEditOperatorOptions = useMemo(
    () =>
      BINARY_OPS.map((op) => ({
        key: op,
        label: op,
        description: op === "+" ? "Add" : op === "-" ? "Subtract" : op === "*" ? "Multiply" : "Divide",
      })),
    []
  );
  const formulaEditBracketOptions = useMemo(
    () => [
      { key: "(", label: "(", description: "Open bracket" },
      { key: ")", label: ")", description: "Close bracket" },
    ],
    []
  );
  const formulaEditTokenClassName = (token: string): string => {
    if (MEASUREMENT_KEYS.has(token)) return "bg-primary/15 text-primary";
    if (token === WASTE_PERCENTAGE_KEY)
      return "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800";
    if (formulaEditOtherKeys.has(token))
      return "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800";
    if (OPERATOR_SET.has(token)) return "bg-muted border border-border text-foreground font-mono";
    return "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono border border-blue-200 dark:border-blue-800";
  };

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return "Uncategorized";
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || "Uncategorized";
  };

  const REQUIRED_COLUMNS = ["name", "price"];

  const handleSelectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setImportRows([]);
    setImportWarnings([]);
    setImportPreviewRows([]);
    setImportResultRows([]);
    setImportStep("idle");

    if (!file) return;

    try {
      let rows: ImportRawRow[] = [];
      const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

      if (isExcel) {
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(await file.arrayBuffer());
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(sheet);
      } else {
        const papaparse = await import("papaparse");
        const result = await new Promise<{ data: ImportRawRow[] }>((resolve) => {
          papaparse.parse(file, { header: true, skipEmptyLines: true, complete: resolve });
        });
        rows = result.data;
      }

      const warnings: string[] = [];

      const fileColumns = rows.length > 0 ? Object.keys(rows[0]).map((x) => x.toLowerCase()) : [];

      REQUIRED_COLUMNS.forEach((col) => {
        if (!fileColumns.includes(col)) {
          warnings.push(`Missing required column: "${col}"`);
        }
      });

    if (rows.length === 0) warnings.push("No rows found in file");

    setImportWarnings(warnings);
    const hasBlockingWarnings = warnings.some(
      (w) => w.startsWith("Missing required") || w.startsWith("No rows")
    );

      if (hasBlockingWarnings) {
        setImportRows([]);
        return;
      }

      setImportRows(rows);

      // Build preview rows — resolve supplier + product existence client-side
      const preview: ImportPreviewRow[] = rows.map((r) => {
        const name = r.name?.toString().trim() ?? "";
        const supplierName = r.supplier?.toString().trim() ?? "";
        const supplierFound = supplierName
          ? suppliers.some((s) => s.name.toLowerCase() === supplierName.toLowerCase())
          : false;
        const productExists = products.some(
          (p) => p.name.trim().toLowerCase() === name.toLowerCase()
        );

        return {
          name,
          description: r.description?.toString().trim() ?? "",
          category:
            r.category ||
            r.category_name ||
            r.Category ||
            r["Category Name"] ||
            "",
          supplier: supplierName,
          sku: r.sku?.toString().trim() ?? "",
          unit_of_measure: r.unit_of_measure?.toString().trim() ?? "",
          price: r.price?.toString().trim() ?? "",
          supplierFound,
          productExists,
          rawRow: r,
        };
      });

      setImportPreviewRows(preview);
      setImportStep("preview");
    } catch (err) {
      toast.error("Failed to read file: " + (err instanceof Error ? err.message : String(err)));
      setImportRows([]);
    }
  };

  const getOrCreateCategory = async (
    categoryName: string,
    categoryCache: Record<string, string>
  ) => {
    if (!categoryName) return undefined;

    const key = categoryName.trim().toLowerCase();

    if (categoryCache[key]) {
      return categoryCache[key];
    }

    const existing = categories.find(
      (c) => c.name.trim().toLowerCase() === key
    );

    if (existing) {
      categoryCache[key] = existing.id;
      return existing.id;
    }

    const newCategory = await productService.createCategory({
      name: categoryName.trim(),
      description: "",
    });

    categoryCache[key] = newCategory.id;

    return newCategory.id;
  };

  const handleImportConfirm = async () => {
    if (!importRows.length) {
      toast.error("No data to import");
      return;
    }

    setImportLoading(true);
  const resultRows: ImportResultRow[] = [];

  try {
    const createdCount = 0;
    const updatedCount = 0;
    const categoryCache: Record<string, string> = {};
      const importNames = new Set(
        importRows
          .map((r) => r.name?.toString().trim().toLowerCase())
          .filter(Boolean)
      );

      const matchedProductIds = products
        .filter((p) => importNames.has(p.name.trim().toLowerCase()))
        .map((p) => p.id);
      // Batch-fetch all variants for existing products upfront to avoid N+1 queries
      const allExistingVariants: Record<string, ProductSupplierVariant[]> = {};
      const VARIANT_CHUNK_SIZE = 50;
      for (let i = 0; i < matchedProductIds.length; i += VARIANT_CHUNK_SIZE) {
        const chunk = matchedProductIds.slice(i, i + VARIANT_CHUNK_SIZE);
          const chunkVariants = await productService.getVariantsForProducts(chunk);
          Object.assign(allExistingVariants, chunkVariants);
    }

    const sessionProductCache: Record<string, string> = {};
    const existingProductMap: Record<string, Product> = {};
    products.forEach((p) => {
      const key = p.name.trim().toLowerCase();
      sessionProductCache[key] = p.id;
      existingProductMap[key] = p;
    });

      for (const row of importRows) {
        const name = row.name?.toString().trim();
        const price = parseFloat(String(row.price));

      if (!name) {
        resultRows.push({ name: "(empty)", status: "skipped", reason: "No name" });
        continue;
      }
      if (isNaN(price)) {
        resultRows.push({ name, status: "skipped", reason: "Invalid price" });
        continue;
      }

      try {
      let category_id: string | undefined;
      if (row.category_id) {
          const catId = row.category_id.toString().trim();
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(catId)) {
            category_id = catId;
          }
        }

        if (!category_id) {
          const rawCategory =
            row.category ||
            row.category_name ||
            row.Category ||
            row["Category Name"] ||
            "";
          if (rawCategory.trim()) {
            category_id = await getOrCreateCategory(rawCategory.trim(), categoryCache);
          }
        }

      // Resolve supplier — required for any variant operation
      const supplierName = row.supplier?.toString().trim();
      const supplierId = supplierName
        ? suppliers.find((s) => s.name.toLowerCase() === supplierName.toLowerCase())?.id
        : undefined;

      const sku = row.sku?.toString().trim() || null;
      const uom = row.unit_of_measure?.toString().trim() || null;
        const nameLower = name.toLowerCase();

        let productId: string;
        let rowStatus: ImportResultRow["status"];

        const cachedId = sessionProductCache[nameLower];

        if (cachedId) {
          const existingMeta = existingProductMap[nameLower];
          await productService.updateProduct(cachedId, {
            description:
              row.description?.toString().trim() ||
              existingMeta?.description ||
              "",
            category_id: category_id ?? existingMeta?.category_id ?? null,
          });
          productId = cachedId;
          rowStatus = "updated";
        } else {
        const created = await productService.createProduct({
          name,
          price: 0,
          description: row.description?.toString().trim() || "",
          category_id: category_id || null,
        });
        productId = created.id;
        // Initialize empty variants cache entry for newly created product
        allExistingVariants[productId] = [];

          // Register immediately so next row with same name updates not creates
          sessionProductCache[nameLower] = productId;
          existingProductMap[nameLower] = created;

          rowStatus = "created";
        }

        let variantNote = "";
        if (!supplierId) {
          variantNote = supplierName
            ? ` (supplier "${supplierName}" not found — variant skipped)`
            : " (no supplier — variant skipped)";
        } else {
          const productVariants = allExistingVariants[productId] ?? [];

      if (sku) {
        // Match by supplier + SKU
        const matchingVariant = productVariants.find(
          (v) =>
            v.supplier_id === supplierId &&
            v.variant_type === "default" &&
            v.sku === sku
        );

        if (matchingVariant) {
          // Update existing variant
          await productService.updateSupplierVariant(matchingVariant.id, {
            price,
            unit_of_measure: uom,
            is_preferred: true,
          });
          // Update local cache
          matchingVariant.price = price;
          matchingVariant.unit_of_measure = uom;
        } else {
          // Create new variant with this SKU
          const created = await productService.createSupplierVariant({
            product_id: productId,
            supplier_id: supplierId,
            variant_name: "Default",
            variant_type: "default",
            price,
            unit_of_measure: uom,
            sku,
            is_preferred: true,
            is_active: true,
          });
          allExistingVariants[productId] = [...productVariants, created];
        }
      } else {
        // No SKU — match by supplier + default variant type only
        const defaultVariant = productVariants.find(
          (v) => v.supplier_id === supplierId && v.variant_type === "default"
        );

        if (defaultVariant) {
          // Update existing default variant for this supplier
          await productService.updateSupplierVariant(defaultVariant.id, {
            price,
            unit_of_measure: uom,
            is_preferred: true,
          });
          // Update local cache
          defaultVariant.price = price;
          defaultVariant.unit_of_measure = uom;
        } else {
          // Create new default variant for this supplier
          const created = await productService.createSupplierVariant({
            product_id: productId,
            supplier_id: supplierId,
            variant_name: "Default",
            variant_type: "default",
            price,
            unit_of_measure: uom,
            sku: null,
            is_preferred: true,
            is_active: true,
          });
          allExistingVariants[productId] = [...productVariants, created];
        }
      }
    }

        resultRows.push({
          name,
          status: rowStatus,
          reason: variantNote || undefined,
        });
        } catch (err) {
          resultRows.push({ name, status: "error", reason: err instanceof Error ? err.message : String(err) });
        }
      }

    await loadData();
    setImportResultRows(resultRows);
    setImportStep("result");
    } catch (err) {
      toast.error("Import failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setImportLoading(false);
    }
  };

  const globalProducts = useMemo(() => products.filter(isGlobalProduct), [products]);
  const locationProducts = useMemo(() => products.filter((p) => !isGlobalProduct(p)), [products]);
  const activeProducts = activeTab === "my" ? locationProducts : globalProducts;

  useEffect(() => {
  if (locationProducts.length === 0 && globalProducts.length > 0) {
    setActiveTab("default");
  } else if (locationProducts.length > 0) {
    setActiveTab("my");
  }
  }, [locationProducts.length, globalProducts.length]);

  const filteredProducts = useMemo(() => {
    return activeProducts.filter((p) => {
      if (!p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterCategory !== "all" && p.category_id !== filterCategory) return false;
      const wastage = p.wastage_percentage ?? 0;
      if (filterWastageMin !== "" && wastage < parseFloat(filterWastageMin)) return false;
      if (filterWastageMax !== "" && wastage > parseFloat(filterWastageMax)) return false;
      return true;
    });
  }, [activeProducts, searchQuery, filterCategory, filterWastageMin, filterWastageMax]);

  const visibleSelectedProducts = useMemo(
    () => selectedProducts.filter((id) => filteredProducts.some((p) => p.id === id)),
    [selectedProducts, filteredProducts]
  );
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleSelectProduct = (id: string) =>
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );

  const toggleSelectAll = () =>
    setSelectedProducts(
      filteredProducts.every((p) => selectedProducts.includes(p.id))
        ? selectedProducts.filter((id) => !filteredProducts.some((p) => p.id === id))
        : [...new Set([...selectedProducts, ...filteredProducts.map((p) => p.id)])]
    );

  const handleBulkDelete = async () => {
    if (!visibleSelectedProducts.length) return;
    if (!confirm(`Delete ${visibleSelectedProducts.length} products permanently?`)) return;
    setBulkDeleteLoading(true);

    try {
      await Promise.all(
        visibleSelectedProducts.map((id) => productService.deleteProduct(id))
      );

      toast.success("Selected products deleted");
      setSelectedProducts([]);
      loadData();
    } catch (err) {
      toast.error("Bulk delete failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const handleBulkCategorize = async (categoryId: string | null) => {
    setBulkCategorizeLoading(true);
    try {
      await Promise.all(visibleSelectedProducts.map((id) => productService.updateProduct(id, { category_id: categoryId })));
      toast.success(`Category updated for ${visibleSelectedProducts.length} product${visibleSelectedProducts.length !== 1 ? "s" : ""}`);
      setBulkCategorizeOpen(false);
      setSelectedProducts([]);
      loadData();
    } catch (err) {
      toast.error("Bulk categorize failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBulkCategorizeLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Products</h2>
          <p className="text-muted-foreground mt-1">
            Manage your product catalog
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "Edit Product" : "Add New Product"}
                </DialogTitle>
                <DialogDescription>
                  {editingProduct
                    ? "Update the product details below."
                    : "Create a new product for your catalog."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-1">
                    <Label htmlFor="name">
                      Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        if (formErrors.name) clearFieldError("name");
                      }}
                      className={formErrors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
                      aria-invalid={!!formErrors.name}
                    />
                    {formErrors.name && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      rows={2}
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-1">
                    <Label htmlFor="category">Category</Label>
                    <SearchableSelect
                      options={[
                        { value: "NA", label: "Uncategorized" },
                        ...categories.map((c) => ({ value: c.id, label: c.name })),
                      ]}
                      value={formData.category_id || "NA"}
                      onValueChange={(v) => setFormData({ ...formData, category_id: v === "NA" ? "" : v })}
                      placeholder="Select a category"
                      searchPlaceholder="Search category…"
                      emptyText="No category found."
                    />
                  </div>

                    <div className="space-y-1">
                      <Label htmlFor="wastage_percentage">Wastage %</Label>
                      <Input
                        id="wastage_percentage"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.wastage_percentage}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            wastage_percentage: e.target.value,
                          })
                        }
                        placeholder="e.g. 10"
                      />
                    </div>

                  {/* Supplier Variants — now with multi tab/section per supplier */}
                  <div className="space-y-1">
                    {variantsLoading ? (
                      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                        Loading variants…
                      </div>
                    ) : (
                      <SupplierVariantsEditor
                        suppliers={suppliers}
                        supplierVariantMap={supplierVariantMap}
                        onChange={(updated) => {
                          setSupplierVariantMap(updated);
                          // Re-validate on change
                          setFormErrors((prev) => {
                            const revalidated = validateVariants(updated);
                            const hasEmpty = revalidated?.["__empty__"];
                            const totalActive = Object.values(updated)
                              .flat()
                              .filter((v) => !v._deleted).length;
                            return {
                              ...prev,
                              variants: revalidated,
                              supplierMissing:
                                totalActive === 0
                                  ? "At least one supplier variant with supplier, price, and unit of measure is required."
                                  : hasEmpty
                                  ? "One or more variant rows are missing a supplier."
                                  : undefined,
                            };
                          });
                        }}
                        readOnlyVariants={readOnlyVariants}
                        variantErrors={formErrors.variants}
                        quoteTabs={quoteTabs}
                        tabSectionsMap={tabSectionsMap}
                        supplierTabSections={supplierTabSections}
                        onTabSectionChange={setSupplierTabSections}
                      />
                    )}

                    {formErrors.supplierMissing && (
                      <p className="text-xs text-red-500 mt-1">
                        {formErrors.supplierMissing}
                      </p>
                    )}
                    {!formErrors.supplierMissing && hasVariantErrors && (
                      <p className="text-xs text-red-500 mt-1">
                        Please fix the errors in the supplier variants below.
                      </p>
                    )}
                  </div>
                  {editingProduct && (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Formula</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          readOnly
                          disabled
                          value={editingProduct.formula_v2?.expression ?? ""}
                          placeholder="No formula for this product."
                          className="font-mono text-sm bg-muted/50 cursor-not-allowed flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={openFormulaEditDialog}
                          className="shrink-0"
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit formula
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={savingVariants}>
                    {savingVariants ? "Saving…" : editingProduct ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isFormulaEditDialogOpen} onOpenChange={(open) => !open && closeFormulaEditDialog()}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit formula</DialogTitle>
                <DialogDescription>
                  {editingProduct ? `Formula for "${editingProduct.name}"` : ""}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleFormulaEditSave}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Key (read-only)</Label>
                    <Input
                      readOnly
                      disabled
                      value={formulaEditKey}
                      className="font-mono text-sm bg-muted/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="formula-edit-description">Description (optional)</Label>
                    <Input
                      id="formula-edit-description"
                      value={formulaEditDescription}
                      onChange={(e) => setFormulaEditDescription(e.target.value)}
                      placeholder="e.g. Valley metal with 10% waste"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label>Expression *</Label>
                    <ExpressionTokenPicker
                      tokens={formulaEditExpressionTokens}
                      onTokensChange={(nextTokens) => {
                        const nextToken = nextTokens[nextTokens.length - 1];
                        if (nextTokens.length === formulaEditExpressionTokens.length + 1 && nextToken) {
                          addFormulaEditToken(nextToken);
                          return;
                        }
                        setFormulaEditExpressionTokens(nextTokens);
                      }}
                      measurementOptions={MEASUREMENT_TOKEN_OPTIONS}
                      formulaOptions={formulaEditTokenOptions}
                      wasteOption={{
                        key: WASTE_PERCENTAGE_KEY,
                        label: "waste_percentage",
                        description: "Product waste percentage",
                        group: "Waste %",
                      }}
                      operatorOptions={formulaEditOperatorOptions}
                      bracketOptions={formulaEditBracketOptions}
                      canAddOperand={canAddOperand}
                      canAddBinaryOp={canAddBinaryOp}
                      canAddOpen={canAddOpen}
                      canAddClose={canAddClose}
                      tokenClassName={formulaEditTokenClassName}
                      placeholder="Search measurements, formulas, operators, or type a number"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={closeFormulaEditDialog}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={formulaEditExpressionTokens.length === 0 || formulaEditSubmitting}>
                    {formulaEditSubmitting ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={importDialogOpen}
            onOpenChange={(open) => {
              setImportDialogOpen(open);
              if (!open) {
                setSelectedFile(null);
                setImportRows([]);
                setImportWarnings([]);
                setImportPreviewRows([]);
                setImportResultRows([]);
                setImportStep("idle");
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="secondary">Import CSV/Excel</Button>
            </DialogTrigger>

            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Import Products</DialogTitle>
                <DialogDescription>
                  {importStep === "idle" && "Upload a CSV or Excel file to import products."}
                  {importStep === "preview" && `${importPreviewRows.length} rows found — review before importing.`}
                  {importStep === "result" && "Import complete. Review the results below."}
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto space-y-4 py-2">
                {/* ── Step: idle ── */}
                {importStep === "idle" && (
                  <>
                    <Input
                      type="file"
                      accept=".csv,.xls,.xlsx"
                      onChange={handleSelectFile}
                    />
                    {selectedFile && (
                      <p className="text-sm text-muted-foreground">
                        Selected: <b>{selectedFile.name}</b>
                      </p>
                    )}
                    {importWarnings.length > 0 && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-md text-sm space-y-1">
                        {importWarnings.map((w, i) => (
                          <p key={i}>⚠ {w}</p>
                        ))}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground space-y-1 pt-1">
                      <p className="font-medium">Expected columns:</p>
                      <p>
                        <b>name</b> (required), <b>price</b> (required), description, category,
                        supplier, sku, unit_of_measure
                      </p>
                      <p>Supplier must already exist. Categories are created automatically if missing.</p>
                    </div>
                  </>
                )}

                {/* ── Step: preview ── */}
                {importStep === "preview" && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-2 font-medium">Name</th>
                          <th className="text-left p-2 font-medium">Category</th>
                          <th className="text-left p-2 font-medium">Supplier</th>
                          <th className="text-left p-2 font-medium">SKU</th>
                          <th className="text-left p-2 font-medium">UOM</th>
                          <th className="text-right p-2 font-medium">Price</th>
                          <th className="text-center p-2 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreviewRows.map((row, i) => (
                          <tr key={i} className="border-b hover:bg-muted/30">
                            <td className="p-2">
                              {row.name || <span className="text-red-400">—</span>}
                            </td>
                            <td className="p-2 text-muted-foreground">
                              {row.category || "—"}
                            </td>
                            <td className="p-2">
                              {row.supplier ? (
                                row.supplierFound ? (
                                  <span className="text-green-700">{row.supplier}</span>
                                ) : (
                                  <span className="text-amber-600" title="Supplier not found — variant will be skipped">
                                    {row.supplier} ⚠
                                  </span>
                                )
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="p-2 text-muted-foreground">{row.sku || "—"}</td>
                            <td className="p-2 text-muted-foreground">
                              {row.unit_of_measure || "—"}
                            </td>
                            <td className="p-2 text-right">
                              {row.price || <span className="text-red-400">—</span>}
                            </td>
                            <td className="p-2 text-center">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${row.productExists
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-green-100 text-green-700"
                                  }`}
                              >
                                {row.productExists ? "Update" : "Create"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ── Step: result ── */}
                {importStep === "result" && (
                  <div className="overflow-x-auto">
                    <div className="flex gap-4 text-sm mb-3">
                      <span className="text-green-700 font-medium">
                        Created: {importResultRows.filter((r) => r.status === "created").length}
                      </span>
                      <span className="text-blue-700 font-medium">
                        Updated: {importResultRows.filter((r) => r.status === "updated").length}
                      </span>
                      <span className="text-amber-700 font-medium">
                        Skipped: {importResultRows.filter((r) => r.status === "skipped").length}
                      </span>
                      <span className="text-red-700 font-medium">
                        Errors: {importResultRows.filter((r) => r.status === "error").length}
                      </span>
                    </div>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-2 font-medium">Name</th>
                          <th className="text-center p-2 font-medium">Status</th>
                          <th className="text-left p-2 font-medium">Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResultRows.map((row, i) => (
                          <tr key={i} className="border-b hover:bg-muted/30">
                            <td className="p-2">{row.name}</td>
                            <td className="p-2 text-center">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${row.status === "created"
                                    ? "bg-green-100 text-green-700"
                                    : row.status === "updated"
                                      ? "bg-blue-100 text-blue-700"
                                      : row.status === "skipped"
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-red-100 text-red-700"
                                  }`}
                              >
                                {row.status}
                              </span>
                            </td>
                            <td className="p-2 text-muted-foreground">{row.reason || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <DialogFooter className="pt-2 border-t">
                {importStep === "idle" && (
                  <Button
                    disabled={
                      !selectedFile ||
                      importRows.length === 0 ||
                      importWarnings.some(
                        (w) => w.startsWith("Missing required") || w.startsWith("No rows")
                      )
                    }
                    onClick={() => setImportStep("preview")}
                  >
                    Preview
                  </Button>
                )}
                {importStep === "preview" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setImportStep("idle")}
                      disabled={importLoading}
                    >
                      Back
                    </Button>
                    <Button onClick={handleImportConfirm} disabled={importLoading}>
                      {importLoading ? "Importing…" : `Import ${importPreviewRows.length} rows`}
                    </Button>
                  </>
                )}
                {importStep === "result" && (
                  <Button
                    onClick={() => {
                      setImportDialogOpen(false);
                      setSelectedFile(null);
                      setImportRows([]);
                      setImportWarnings([]);
                      setImportPreviewRows([]);
                      setImportResultRows([]);
                      setImportStep("idle");
                    }}
                  >
                    Done
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {visibleSelectedProducts.length > 0 && (
            <>
              <Button variant="outline" onClick={() => setBulkCategorizeOpen(true)}>
                <Tag className="mr-2 h-4 w-4" />Assign Category ({visibleSelectedProducts.length})
              </Button>
              <Button variant="destructive" onClick={handleBulkDelete}>
                {bulkDeleteLoading ? `Deleting... (${visibleSelectedProducts.length})` : `Delete Selected (${visibleSelectedProducts.length})`}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {locationProducts.length > 0 && (
          <div
            onClick={() => setActiveTab("my")}
            className={`inline-flex items-center px-3 py-1.5 rounded-md border text-sm font-medium cursor-pointer select-none transition-colors ${
              activeTab === "my"
                ? "border-gray-400 bg-white text-gray-900 shadow-sm"
                : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            My Products
          </div>
        )}
        {globalProducts.length > 0 && (
          <div
            onClick={() => setActiveTab("default")}
            className={`inline-flex items-center px-3 py-1.5 rounded-md border text-sm font-medium cursor-pointer select-none transition-colors ${
              activeTab === "default"
                ? "border-gray-400 bg-white text-gray-900 shadow-sm"
                : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Default Products
          </div>
        )}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search Products By Name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-5 flex-wrap justify-end">
      <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Category:</span>
          <div className="w-64">
            <SearchableSelect
              options={[
                { value: "all", label: "All" },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
              value={filterCategory}
              onValueChange={(v) => { setFilterCategory(v); setCurrentPage(1); }}
              placeholder="Select category"
              searchPlaceholder="Search category…"
              emptyText="No category found."
            />
          </div>
        </div>
      
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Wastage %:</span>
          <Input
            type="number"
            min="0"
            max="100"
            placeholder="Min"
            value={filterWastageMin}
            onChange={(e) => { setFilterWastageMin(e.target.value); setCurrentPage(1); }}
            className="w-20 h-8 text-sm"
          />
          <span className="text-muted-foreground text-sm">–</span>
          <Input
            type="number"
            min="0"
            max="100"
            placeholder="Max"
            value={filterWastageMax}
            onChange={(e) => { setFilterWastageMax(e.target.value); setCurrentPage(1); }}
            className="w-20 h-8 text-sm"
          />
        </div>
      
        {(filterCategory !== "all" || filterWastageMin !== "" || filterWastageMax !== "") && (
          <button
            onClick={() => { setFilterCategory("all"); setFilterWastageMin(""); setFilterWastageMax(""); setCurrentPage(1); }}
            className="text-xs text-red-500 hover:text-red-700 underline"
          >
            <X className="w-4 h-4"/>
          </button>
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <input
                  type="checkbox"
                  checked={
                    filteredProducts.length > 0 &&
                    filteredProducts.every((p) => selectedProducts.includes(p.id))
                  }
                  onChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Wastage %</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {activeTab === "my" ? "No products yet. Add your first product to get started." : "No default products found."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedProducts.map((product) => {
                const isGlobal = isGlobalProduct(product);
                return (
                  <TableRow key={product.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => toggleSelectProduct(product.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {product.description || "—"}
                  </TableCell>
                  <TableCell>{getCategoryName(product.category_id)}</TableCell>
                  <TableCell className="font-medium">
                    {product.wastage_percentage
                      ? `${product.wastage_percentage}%`
                      : "—"}
                  </TableCell>
                  <TableCell>
                      <TooltipProvider>
                        <div className="flex gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => !isGlobal && handleEdit(product)}
                                  disabled={isGlobal}
                                  className={isGlobal ? "opacity-40 cursor-not-allowed" : ""}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {isGlobal && (
                              <TooltipContent>
                                <p>Global products cannot be edited</p>
                              </TooltipContent>
                            )}
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => !isGlobal && handleDelete(product.id)}
                                  disabled={isGlobal}
                                  className={isGlobal ? "opacity-40 cursor-not-allowed" : ""}
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {isGlobal && (
                              <TooltipContent>
                                <p>Global products cannot be deleted</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <div className="flex justify-between items-center p-4">
          {/* Page size selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>

            <select
              className="border rounded p-1 text-sm"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              {[5, 10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          {/* Pagination buttons */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Previous
            </Button>

            <span className="text-sm">
              Page {currentPage} of {totalPages || 1}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= (totalPages || 1)}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>

      </div>
       <BulkCategorizeDialog
        open={bulkCategorizeOpen}
        onOpenChange={setBulkCategorizeOpen}
        selectedCount={visibleSelectedProducts.length}
        categories={categories}
        onConfirm={handleBulkCategorize}
        loading={bulkCategorizeLoading}
      />
    </div>
  );
};

function validateVariants(
  supplierVariantMap: SupplierVariantMap
): FormErrors["variants"] {
  const variantErrors: NonNullable<FormErrors["variants"]> = {};

  for (const [supplierId, variants] of Object.entries(supplierVariantMap)) {
    const activeVariants = variants.filter((v) => !v._deleted);
    if (activeVariants.length === 0) continue;

    if (!supplierId?.trim()) {
      activeVariants.forEach((_, index) => {
        if (!variantErrors["__empty__"]) variantErrors["__empty__"] = {};
        variantErrors["__empty__"][index] = { supplier: "Supplier is required." };
      });
      continue;
    }

    variants.forEach((v, index) => {
      if (v._deleted) return;
      const rowErrors: VariantRowErrors = {};

      const priceNum = Number(v.price);
      if (v.price === "" || v.price === undefined || isNaN(priceNum)) {
        rowErrors.price = "Price is required.";
      } else if (priceNum < 0) {
        rowErrors.price = "Price must be 0 or greater.";
      }

      if (!v.unit_of_measure?.trim()) {
        rowErrors.unit_of_measure = "Unit of measure is required.";
      }

      if (Object.keys(rowErrors).length > 0) {
        if (!variantErrors[supplierId]) variantErrors[supplierId] = {};
        variantErrors[supplierId][index] = rowErrors;
      }
    });
  }

  return Object.keys(variantErrors).length > 0 ? variantErrors : undefined;
}

export default ProductsSettings;
