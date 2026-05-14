import { supabase } from "@/integrations/supabase/client";
import { locationService } from "@/services/estimates/location-service";
import {
  NO_DEFAULT_PRODUCT_LOCATIONS,
  NO_DEFAULT_CATEGORY_LOCATIONS,
} from "@/constants/location-constants";
import type { Json } from "@/integrations/supabase/types";
import type {
  RawProductRow,
  RawVariantRow,
  RawVariantPricingRow,
  RawFormulaRow,
  ProductCalculation,
  EstimateConfigFormValues,
  EstimateConfigData,
  EstimateTabData,
  EstimateSectionData,
  EstimateItem,
  SyncProductEstimateParams,
  CreateProductParams,
  UpdateProductParams,
  VariantType,
} from "@/types/product";

interface ConfigRow {
  id: string;
  form_values: Json;
}

export interface SupplierVariantOption {
  id: string;      
  supplier_id: string;
  variant_name?: string | null;
  variant_type: string;
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
  formula_v2?: { key: string; expression: string; description?: string } | null;
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
  variant_type: "default" | "color" | "size" | "material";
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
  // Joined fields (optional, present when fetched with supplier join)
  supplier_name?: string | null;
}

export interface ProductWithVariants extends Product {
  supplier_variants?: ProductSupplierVariant[];
}
export interface CategoryTreeNode extends ProductCategory {
  children: CategoryTreeNode[];
}

export function buildCategoryTree(list: ProductCategory[], parentId: string | null = null): CategoryTreeNode[] {
  return list
    .filter(item => (item.parent_id ?? null) === parentId)
    .map(item => ({
      ...item,
      children: buildCategoryTree(list, item.id)
    }));
}

export const productService = {

  getSupplierName(product: Product): string | null {
    const supplierName =
      "supplier_name" in product &&
      typeof (product as Product & { supplier_name?: string }).supplier_name === "string"
        ? (product as Product & { supplier_name?: string }).supplier_name
        : product.supplier ?? null;
    return supplierName && supplierName.trim() ? supplierName.trim() : null;
  },

  async getQuoteTabs(): Promise<{ id: string; title: string }[]> {
    const locationId = await locationService.getLocationContext();
    if (!locationId) return [];

    const { data, error } = await supabase
      .from("estimate_configurations_v2")
      .select("config_data")
      .eq("location_id", locationId)
      .single();

    if (error || !data?.config_data) return [];

    const configData = data.config_data as unknown as EstimateConfigData;
    const sections = configData?.sections || [];

    const quoteSection = (configData?.sections ?? []).find((s) => s.id === 6);
    if (!quoteSection?.tabs) return [];

    return quoteSection.tabs.map((tab) => ({
      id: tab.id,
      title: tab.title,
    }));
  },

  async getMultipleTabSections(tabIds: string[]): Promise<Record<string, { id: string; title: string }[]>> {
    if (tabIds.length === 0) return {};

    const locationId = await locationService.getLocationContext();
    if (!locationId) return {};

    const { data, error } = await supabase
      .from("estimate_configurations_v2")
      .select("form_values")
      .eq("location_id", locationId)
      .single();

    if (error || !data?.form_values) return {};

    const formValues = data.form_values as unknown as EstimateConfigFormValues;
    const result: Record<string, { id: string; title: string }[]> = {};

    tabIds.forEach((tabId) => {
      const tabData = formValues["6"]?.tabs?.[tabId];
      if (!tabData?.arrays?.sections) {
        result[tabId] = [];
        return;
      }

      const sections = Object.entries(tabData.arrays.sections).map(
        ([sectionId, sectionData]) => ({
          id: sectionId,
          title: sectionData?.section_title ?? "Untitled Section",
          sortOrder: sectionData?.sortOrder ?? 0,
        })
      );

      result[tabId] = sections.sort((a, b) => a.sortOrder - b.sortOrder);
    });

    return result;
  },

  async getTabSections(tabId: string): Promise<{ id: string; title: string }[]> {
    const result = await this.getMultipleTabSections([tabId]);
    return result[tabId] || [];
  },

  async createSectionInTab(tabId: string, sectionTitle: string): Promise<{ id: string; title: string }> {
    const locationId = await locationService.getLocationContext();
    if (!locationId) throw new Error("Location not found");

    const newSectionId = crypto.randomUUID();

    const { data, error } = await supabase
      .from("estimate_configurations_v2")
      .select("form_values")
      .eq("location_id", locationId)
      .single();

    if (error || !data?.form_values) throw new Error("Configuration not found");

    const formValues = data.form_values as unknown as EstimateConfigFormValues;

    // Ensure structure exists
    if (!formValues["6"]) formValues["6"] = { tabs: {} };
    if (!formValues["6"].tabs) formValues["6"].tabs = {};
    if (!formValues["6"].tabs[tabId])
      formValues["6"].tabs[tabId] = { arrays: { sections: {} } };
    if (!formValues["6"].tabs[tabId].arrays)
      formValues["6"].tabs[tabId].arrays = { sections: {} };
    if (!formValues["6"].tabs[tabId].arrays!.sections)
      formValues["6"].tabs[tabId].arrays!.sections = {};

    // Add new section
    formValues["6"].tabs[tabId].arrays!.sections![newSectionId] = {
      section_title: sectionTitle,
      sortOrder:
        Object.keys(formValues["6"].tabs[tabId].arrays!.sections!).length + 1,
      Tax: true,
      Margin: true,
      items: {}
    };

    const { error: updateError } = await supabase
      .from("estimate_configurations_v2")
      .update({ form_values: formValues as unknown as Json })
      .eq("location_id", locationId);

    if (updateError) throw updateError;

    return { id: newSectionId, title: sectionTitle };
  },

  async getProducts(): Promise<Product[]> {
    const locationId = await locationService.getLocationContext();
    if (!locationId) throw new Error("Location ID not found");

    const excludeDefaults = NO_DEFAULT_PRODUCT_LOCATIONS.includes(locationId);

    const { data: productsData, error: productsError } = await supabase
      .from("products_v2")
     .select(`
        *,
        product_supplier_variants_v2 (
          id,
          supplier_id,
          variant_name,
          variant_type,
          sku,
          unit_of_measure,
          price,
          is_preferred,
          is_active
        )
      `)
      .or(
        excludeDefaults
          ? `location_id.eq.${locationId}`
          : `location_id.eq.${locationId},location_id.is.null,location_id.eq.""`
      )
      .order("name");

    if (productsError) throw productsError;

    const rawProducts = (productsData || []) as unknown as RawProductRow[];
    if (rawProducts.length === 0) return [];
    const variantsByProduct: Record<string, SupplierPrice[]> = {};
    rawProducts.forEach((product: RawProductRow) => {
      const variants = (product.product_supplier_variants_v2 ?? []) as RawVariantRow[];
      const activeVariants = variants.filter((v) => v.is_active !== false);
      const supplierMap: Record<string, SupplierPrice> = {};
      activeVariants.forEach((v: RawVariantRow) => {
        const variantOption: SupplierVariantOption = {
          id: v.id,
          supplier_id: v.supplier_id,
          variant_name: v.variant_name ?? null,
          variant_type: v.variant_type,
          sku: v.sku ?? null,
          unit_of_measure: v.unit_of_measure ?? null,
          price: v.price,
          is_preferred: v.is_preferred,
        };

        if (!supplierMap[v.supplier_id]) {
          supplierMap[v.supplier_id] = {
            supplier_id: v.supplier_id,
            price: v.price, 
            variants: [variantOption],
          };
        } else {
          supplierMap[v.supplier_id].variants!.push(variantOption);
        }

        if (v.is_preferred) {
          supplierMap[v.supplier_id].price = v.price;
        }
      });

      variantsByProduct[product.id] = Object.values(supplierMap);
    });

    const products: Product[] = rawProducts.map((product: RawProductRow) => {
      if (product.calculation) {
        if (typeof product.calculation === 'string') {
          try {
            product.calculation = JSON.parse(product.calculation) as Json;
          } catch (e) {
            product.calculation = {};
          }
        }

        if (
          typeof product.calculation === "object" &&
          !Array.isArray(product.calculation) &&
          product.calculation !== null
        ) {
          const calc = product.calculation as unknown as ProductCalculation;
          Object.entries(calc).forEach(([tabIndex, rules]) => {
            if (!/^\d+$/.test(tabIndex)) return;
            if (!Array.isArray(rules)) {
              (product.calculation as unknown as ProductCalculation)[tabIndex] = [];
            }
          });
        } else {
          product.calculation = {};
        }
      } else {
        product.calculation = {};
      }

      if (!product.item_type || !Array.isArray(product.item_type)) {
        product.item_type = [];
      }

      product.product_suppliers = variantsByProduct[product.id] || [];

      delete product.product_supplier_variants_v2;

        if (Array.isArray(product.product_suppliers)) {
          // Ensure all items have required fields with item_id as array
          product.product_suppliers = product.product_suppliers.map((sp: SupplierPrice) => ({
            supplier_id: sp.supplier_id,
            price: sp.price ?? 0,
            item_id: Array.isArray(sp.item_id) ? sp.item_id : [],
            variants: sp.variants ?? [],  
          }));
        } else {
          product.product_suppliers = [];
        }

      if (product.tab_product_details) {
        if (typeof product.tab_product_details === "string") {
          try {
            product.tab_product_details = JSON.parse(product.tab_product_details) as Json;
          } catch (e) {
            product.tab_product_details = null;
          }
        }
        if (
          typeof product.tab_product_details !== "object" ||
          Array.isArray(product.tab_product_details)
        ) {
          product.tab_product_details = null;
        }
      } else {
        product.tab_product_details = null;
      }

      return product as unknown as Product;
    });

    const { data: formulaRows } = await supabase
      .from("formulas_v2")
      .select("product_id, formula_key, formula, description")
      .eq("location_id", locationId);

    const formulaByProductId = new Map<
      string,
      { key: string; expression: string; description?: string }
    >();

    (formulaRows || []).forEach((row: RawFormulaRow) => {
      const formulaJson = row.formula;
      const formulaObj =
        formulaJson !== null &&
        typeof formulaJson === "object" &&
        !Array.isArray(formulaJson)
          ? (formulaJson as Record<string, unknown>)
          : {};
      const expression =
        typeof formulaObj["expression"] === "string"
          ? formulaObj["expression"].trim()
          : "";
      if (row.product_id && expression) {
        formulaByProductId.set(row.product_id, {
          key: row.formula_key || "formula",
          expression,
          description:
            typeof row.description === "string" ? row.description.trim() : undefined,
        });
      }
    });
    products.forEach((p) => {
      p.formula_v2 = formulaByProductId.get(p.id) ?? null;
    });

    return products;
  },

  async createProduct(product: CreateProductParams): Promise<Product> {
    const locationId = await locationService.getLocationContext();
    if (!locationId) throw new Error("Location ID not found");

    const productData: Partial<RawProductRow> = {
      name: product.name,
      description: product.description,
      price: product.price || 0,
      location_id: locationId,
    };
    if (product.category_id !== undefined) productData.category_id = product.category_id;
    if (product.wastage_percentage !== undefined)
      productData.wastage_percentage = product.wastage_percentage;
    if (product.item_type !== undefined) productData.item_type = product.item_type;
    if (product.calculation)
      productData.calculation = product.calculation as unknown as Json;
    if (product.tab_product_details !== undefined)
      productData.tab_product_details =
        (product.tab_product_details as unknown as Json) ?? null;

    const { data, error } = await supabase
      .from("products_v2")
      .insert(productData)
      .select()
      .single();

    if (error) {
      console.error("Create product error:", error);
      throw error;
    }

    const result = data as RawProductRow;

    if (result.calculation && typeof result.calculation === "string") {
      try {
        result.calculation = JSON.parse(result.calculation) as Json;
      } catch (e) {
        console.error("Failed to parse calculation:", e);
        result.calculation = null;
      }
    }
    
    if (product.supplierId && product.variantPrice !== undefined) {
      await this.upsertDefaultVariant({
        productId: result.id,
        supplierId: product.supplierId,
        price: product.variantPrice,
        unitOfMeasure: product.variantUom,
        sku: product.variantSku,
      });
    }
    return result as unknown as Product;
  },

  async updateProduct(id: string, updates: UpdateProductParams): Promise<Product> {
    const updateData: Partial<RawProductRow> = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.price !== undefined) updateData.price = updates.price;
    if (updates.supplier !== undefined) updateData.supplier = updates.supplier;
    if (updates.unit_of_measure !== undefined)
      updateData.unit_of_measure = updates.unit_of_measure;
    if (updates.category_id !== undefined) updateData.category_id = updates.category_id;
    if (updates.wastage_percentage !== undefined)
      updateData.wastage_percentage = updates.wastage_percentage;
    if (updates.item_type !== undefined) updateData.item_type = updates.item_type;

    if (updates.calculation !== undefined){
      updateData.calculation = (updates.calculation as unknown as Json) ?? null;
    }

    if (updates.tab_product_details !== undefined)
      updateData.tab_product_details =
        (updates.tab_product_details as unknown as Json) ?? null;

    const { data, error } = await supabase
      .from("products_v2")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Update product error:", error);
      throw error;
    }
    
    const result = data as RawProductRow;
    
    // Parse calculation back to object if needed
    if (result.calculation && typeof result.calculation === 'string') {
      try {
        result.calculation = JSON.parse(result.calculation) as Json;
      } catch (e) {
        console.error("Failed to parse calculation:", e);
        result.calculation = null;
      }
    }

    if (updates.supplierId && updates.variantPrice !== undefined) {
      await this.upsertDefaultVariant({
        productId: id,
        supplierId: updates.supplierId,
        price: updates.variantPrice,
        unitOfMeasure: updates.variantUom,
        sku: updates.variantSku,
      });
    }
    return result as unknown as Product;
  },

  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase.from("products_v2").delete().eq("id", id);
    if (error) throw error;
  },

  async syncProductNameInEstimates(
    productId: string,
    updates: SyncProductEstimateParams
  ): Promise<void> {
    const locationId = await locationService.getLocationContext();
    if (!locationId) return;

    const patchFormData = (
      formData: EstimateConfigFormValues | null | undefined
    ): { updated: EstimateConfigFormValues; changed: boolean } => {
      if (!formData)
        return { updated: {} as EstimateConfigFormValues, changed: false };

      const updated: EstimateConfigFormValues = JSON.parse(JSON.stringify(formData));
      let changed = false;

      const quoteSection = updated["6"];
      if (!quoteSection?.tabs) return { updated, changed };

      for (const tabData of Object.values(quoteSection.tabs) as EstimateTabData[]) {
        const sections = tabData?.arrays?.sections;
        if (!sections) continue;

        for (const section of Object.values(sections) as EstimateSectionData[]) {
          const items = section?.items;
          if (!items) continue;

          for (const item of Object.values(items) as EstimateItem[]) {
            if (item?.catalog_product_id !== productId) continue;

            if (updates.name !== undefined && item.text !== updates.name) {
              item.text = updates.name;
              changed = true;
            }
            if (updates.price !== undefined && item.price !== updates.price) {
              item.price = updates.price;
              changed = true;
            }
            if (updates.unit_of_measure !== undefined && item.unit_of_measure !== updates.unit_of_measure) {
              item.unit_of_measure = updates.unit_of_measure;
              changed = true;
            }
            if (updates.sku !== undefined && item.sku !== updates.sku) {
              item.sku = updates.sku;
              changed = true;
            }
            if (updates.wastage_percentage !== undefined) {
              const newWastage = updates.wastage_percentage;
              if (item.wastage !== newWastage) {
                item.wastage = newWastage;
                changed = true;
              }
              if (item.wastage_percentage !== newWastage) {
                item.wastage_percentage = newWastage;
                changed = true;
              }
              if (updates.supplier_id !== undefined && item.catalog_supplier_id !== updates.supplier_id) {
                item.catalog_supplier_id = updates.supplier_id;
                changed = true;
              }
              if (updates.variant_id !== undefined && item.catalog_variant_id !== updates.variant_id) {
                item.catalog_variant_id = updates.variant_id;
                changed = true;
              }
            }
          }
        }
      }

      return { updated, changed };
    };

    const { data: configs } = await supabase
      .from("estimate_configurations_v2")
      .select("id, form_values")
      .eq("location_id", locationId);

    if (configs?.length) {
      const configUpdatesWithId: { id: string; promise: PromiseLike<unknown> }[] = [];

      for (const config of configs as ConfigRow[]) {
        const formValues = config.form_values as unknown as EstimateConfigFormValues;
        const { updated, changed } = patchFormData(formValues);
        if (changed) {
          configUpdatesWithId.push({
            id: config.id,
            promise: supabase
              .from("estimate_configurations_v2")
              .update({ form_values: updated as unknown as Json })
              .eq("id", config.id),
          });
        }
      }

      const results = await Promise.allSettled(
        configUpdatesWithId.map((c) => c.promise)
      );
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(
            `Failed to sync product name for config ${configUpdatesWithId[index].id}:`,
            result.reason
          );
        }
      });
    }
  },

  async getProductSupplierVariants(
    productId: string,
    options: { withSupplierName?: boolean } = {}
  ): Promise<ProductSupplierVariant[]> {
    const query = options.withSupplierName
      ? supabase
        .from("product_supplier_variants_v2")
        .select("*, product_suppliers_v2(name)")
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("created_at")
      : supabase
        .from("product_supplier_variants_v2")
        .select("*")
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("created_at");

    const { data, error } = await query;
    if (error) throw error;

    return ((data || []) as unknown as RawVariantRow[]).map((row) => ({
      ...row,
      supplier_name: row.product_suppliers_v2?.name ?? null,
      product_suppliers_v2: undefined,
    })) as ProductSupplierVariant[];
  },

  async getVariantsForProducts(
    productIds: string[]
  ): Promise<Record<string, ProductSupplierVariant[]>> {
    if (productIds.length === 0) return {};

    const { data, error } = await supabase
      .from("product_supplier_variants_v2")
      .select("*, product_suppliers_v2(name)")
      .in("product_id", productIds)
      .eq("is_active", true)
      .order("created_at");

    if (error) throw error;

    const result: Record<string, ProductSupplierVariant[]> = {};
    ((data || []) as unknown as RawVariantRow[]).forEach((row) => {
      const pid = row.product_id;
      if (!result[pid]) result[pid] = [];
      result[pid].push({
        ...row,
        supplier_name: row.product_suppliers_v2?.name ?? null,
        product_suppliers_v2: undefined,
      } as ProductSupplierVariant);
    });

    return result;
  },

  async getProductDefaultPricing(productId: string): Promise<{
    supplierId?: string;
    supplierName?: string;
    price?: number;
    unitOfMeasure?: string | null;
    sku?: string | null;
  } | null> {
    const { data, error } = await supabase
      .from("product_supplier_variants_v2")
      .select(`id, supplier_id, price, sku, unit_of_measure, product_suppliers_v2 ( id, name )`)
      .eq("product_id", productId)
      .eq("variant_type", "default")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    const row = data as unknown as RawVariantPricingRow;
    return {
      supplierId: row.supplier_id,
      supplierName: row.product_suppliers_v2?.name ?? undefined,
      price: row.price,
      unitOfMeasure: row.unit_of_measure,
      sku: row.sku ?? null,
    };
  },

  async upsertDefaultVariant(params: {
    productId: string;
    supplierId: string;
    price: number;
    unitOfMeasure?: string;
    sku?: string;
  }): Promise<ProductSupplierVariant> {
    const { data: existing } = await supabase
      .from("product_supplier_variants_v2")
      .select("id")
      .eq("product_id", params.productId)
      .eq("variant_type", "default")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (params.sku?.trim()) {
      const { data: skuConflict } = await supabase
        .from("product_supplier_variants_v2")
        .select("id")
        .eq("product_id", params.productId)
        .eq("supplier_id", params.supplierId)
        .eq("variant_type", "default")
        .eq("sku", params.sku.trim())
        .eq("is_active", true)
        .maybeSingle();

      if (skuConflict && skuConflict.id !== existing?.id) {
        throw new Error(`SKU "${params.sku}" already exists for this product, supplier, and variant type.`);
      }
    }

    if (existing?.id) {
      const { data, error } = await supabase
        .from("product_supplier_variants_v2")
        .update({
          supplier_id: params.supplierId,
          price: params.price,
          unit_of_measure: params.unitOfMeasure ?? null,
          sku: params.sku ?? null,
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ProductSupplierVariant;
    }

    const { data, error } = await supabase
      .from("product_supplier_variants_v2")
      .insert({
        product_id: params.productId,
        supplier_id: params.supplierId,
        variant_name: "Default",
        variant_type: "default",
        price: params.price,
        unit_of_measure: params.unitOfMeasure ?? null,
        sku: params.sku ?? null,
        is_preferred: true,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data as unknown as ProductSupplierVariant;
  },

  async createSupplierVariant(
    variant: Omit<ProductSupplierVariant, "id" | "created_at" | "updated_at">
  ): Promise<ProductSupplierVariant> {
    if (!variant.variant_type || (variant.variant_type as string) === "undefined") {
      variant.variant_type = "default";
    }

    if (!variant.variant_name) {
      variant.variant_name = "Default";
    }

    if (variant.sku?.trim()) {
      const { data: conflict } = await supabase
        .from("product_supplier_variants_v2")
        .select("id")
        .eq("product_id", variant.product_id)
        .eq("supplier_id", variant.supplier_id)
        .eq("variant_type", variant.variant_type)
        .eq("sku", variant.sku.trim())
        .eq("is_active", true)
        .maybeSingle();

      if (conflict) {
        throw new Error(`SKU "${variant.sku}" already exists for this product/supplier/type combination.`);
      }
    }

    const { data, error } = await supabase
      .from("product_supplier_variants_v2")
      .insert(variant as unknown as Record<string, unknown>)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as ProductSupplierVariant;
  },

  async updateSupplierVariant(
    id: string,
    updates: Partial<Omit<ProductSupplierVariant, "id" | "created_at" | "updated_at">>
  ): Promise<ProductSupplierVariant> {
    const { data, error } = await supabase
      .from("product_supplier_variants_v2")
      .update(updates as unknown as Record<string, unknown>)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as ProductSupplierVariant;
  },

  async deactivateSupplierVariant(id: string): Promise<void> {
    const { error } = await supabase
      .from("product_supplier_variants_v2")
      .update({ is_active: false })
      .eq("id", id);

    if (error) throw error;
  },

  async deleteSupplierVariant(id: string): Promise<void> {
    const { error } = await supabase
      .from("product_supplier_variants_v2")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  async getCategories(): Promise<ProductCategory[]> {
    const locationId = await locationService.getLocationContext();
    const excludeDefaults = NO_DEFAULT_CATEGORY_LOCATIONS.includes(locationId ?? "");
    const { data, error } = await supabase
      .from("product_categories_v2")
      .select("*")
       .or(
        excludeDefaults
          ? `location_id.eq.${locationId}`
          : `location_id.eq.${locationId},location_id.is.null,location_id.eq.""`
      )
      .order("name");

    if (error) throw error;
    return data || [];
  },

  async createCategory(category: Omit<ProductCategory, "id" | "created_at" | "updated_at" | "location_id">): Promise<ProductCategory> {
    const locationId = await locationService.getLocationContext();
    if (!locationId) throw new Error("Location ID not found");

    const { data, error } = await supabase
      .from("product_categories_v2")
      .insert({ ...category, location_id: locationId, parent_id: category.parent_id ?? null })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateCategory(id: string, updates: Partial<Omit<ProductCategory, "id" | "created_at" | "updated_at" | "location_id">>): Promise<ProductCategory> {
    const { data, error } = await supabase
      .from("product_categories_v2")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from("product_categories_v2")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  async getSuppliers(): Promise<ProductSupplier[]> {
    const locationId = await locationService.getLocationContext();
    if (!locationId) throw new Error("Location ID not found");

    const { data, error } = await supabase
      .from("product_suppliers_v2")
      .select("*")
      .eq("location_id", locationId)
      .eq("is_active", true)
      .order("name");

    if (error) throw error;
    return data || [];
  },

  async createSupplier(
    supplier: Omit<ProductSupplier, "id" | "created_at" | "updated_at" | "location_id">
  ): Promise<ProductSupplier> {
    const locationId = await locationService.getLocationContext();
    if (!locationId) throw new Error("Location ID not found");

    const { data, error } = await supabase
      .from("product_suppliers_v2")
      .insert({ ...supplier, location_id: locationId })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateSupplier(
    id: string,
    updates: Partial<Omit<ProductSupplier, "id" | "created_at" | "updated_at" | "location_id">>
  ): Promise<ProductSupplier> {
    const { data, error } = await supabase
      .from("product_suppliers_v2")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteSupplier(id: string): Promise<void> {
    const { error } = await supabase.from("product_suppliers_v2").delete().eq("id", id);
    if (error) throw error;
  },
};