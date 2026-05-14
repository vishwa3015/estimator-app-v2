import { supabase } from "@/integrations/supabase/client";
import { locationService } from "@/services/estimates/location-service";

export interface DbFormulaRow {
  productId: string;
  productName: string;
  key: string;
  expression: string;
  description?: string;
}

export interface FormulaQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  /** @deprecated No longer used; formulas are read from formulas_v2 */
  products?: unknown[];
}

export interface FormulaQueryResult {
  rows: DbFormulaRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UpsertFormulaInput {
  productId: string;
  key: string;
  expression: string;
  description?: string;
}

async function getLocationId(): Promise<string> {
  const locationId = await locationService.getLocationContext();
  if (locationId == null || locationId === "") throw new Error("Location ID not found");
  return String(locationId);
}

function mapRowToDbFormulaRow(row: {
  product_id: string;
  formula_key: string;
  formula: { expression?: string } | null;
  description: string | null;
  products_v2?: { name: string } | null;
}): DbFormulaRow {
  const formula = row.formula && typeof row.formula === "object" ? row.formula : {};
  const expression =
    typeof (formula as { expression?: string }).expression === "string"
      ? (formula as { expression: string }).expression.trim()
      : "";
  return {
    productId: row.product_id,
    productName: row.products_v2?.name ?? "",
    key: row.formula_key,
    expression,
    description: row.description?.trim() || undefined,
  };
}

export const formulaService = {
  async getFormulasFromDb(params: FormulaQueryParams = {}): Promise<FormulaQueryResult> {
    const locationId = await getLocationId();
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
    const search = (params.search ?? "").trim();

    const { data, error } = await supabase
      .from("formulas_v2")
      .select("product_id, formula_key, formula, description, products_v2(name)")
      .eq("location_id", locationId)
      .order("formula_key");

    if (error) throw error;

    const allRows = (data ?? [])
      .map((row) => mapRowToDbFormulaRow(row as Parameters<typeof mapRowToDbFormulaRow>[0]))
      .filter((r) => r.expression.length > 0);

    const normalizedSearch = search.toLowerCase();
    const filtered = normalizedSearch
      ? allRows.filter(
          (row) =>
            row.productName.toLowerCase().includes(normalizedSearch) ||
            row.key.toLowerCase().includes(normalizedSearch) ||
            row.expression.toLowerCase().includes(normalizedSearch)
        )
      : allRows;

    return {
      rows: filtered,
      total: filtered.length,
      page,
      pageSize,
    };
  },

  async upsertFormula(input: UpsertFormulaInput): Promise<DbFormulaRow> {
    const locationId = await getLocationId();
    const { productId, key, expression, description } = input;
    const productIdStr = String(productId);
    const formulaPayload = { expression };

    const { data: existing, error: fetchError } = await supabase
      .from("formulas_v2")
      .select("id, product_id, formula_key, formula, description")
      .eq("location_id", locationId)
      .eq("product_id", productIdStr)
      .maybeSingle();

    if (fetchError) throw fetchError;

    const row = existing as { id: string } | null;

    if (row?.id) {
      const { error: deleteError } = await supabase
        .from("formulas_v2")
        .delete()
        .eq("location_id", locationId)
        .eq("product_id", productIdStr);

      if (deleteError) throw deleteError;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("formulas_v2")
      .insert({
        location_id: locationId,
        product_id: productIdStr,
        formula_key: key,
        formula: formulaPayload,
        description: description ?? null,
      })
      .select("product_id, formula_key, formula, description")
      .single();

    if (insertError) throw insertError;
    return mapRowToDbFormulaRow({ ...(inserted as unknown as Parameters<typeof mapRowToDbFormulaRow>[0]), products_v2: null });
  },

  async deleteFormulaByProductId(productId: string): Promise<void> {
    const locationId = await getLocationId();
    const { error } = await supabase
      .from("formulas_v2")
      .delete()
      .eq("location_id", locationId)
      .eq("product_id", productId);

    if (error) throw error;
  },

  /** Get formula for a product from formulas_v2 (read-only). Returns null if none. */
  async getFormulaByProductId(productId: string): Promise<DbFormulaRow | null> {
    const locationId = await getLocationId();
    const { data, error } = await supabase
      .from("formulas_v2")
      .select("product_id, formula_key, formula, description, products_v2(name)")
      .eq("location_id", locationId)
      .eq("product_id", productId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    const row = mapRowToDbFormulaRow(data as unknown as Parameters<typeof mapRowToDbFormulaRow>[0]);
    return row.expression ? row : null;
  },
};
