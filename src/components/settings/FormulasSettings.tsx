import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Calculator } from "lucide-react";
import { measurementTypes } from "@/data/measurement-types";
import ExpressionTokenPicker from "@/components/settings/ExpressionTokenPicker";
import { productService, Product } from "@/services/products/product-service";
import { formulaService } from "@/services/formulas/formula-service";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";

const MEASUREMENT_OPTIONS = measurementTypes.filter((m) => m.usedInManual && !m.locationIds);
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
export const WASTE_PERCENTAGE_KEY = "waste_percentage";

type TokenType = "operand" | "binary_op" | "open" | "close";

interface ProductFormulaRow {
  productId: string;
  productName: string;
  key: string;
  expression: string;
  description?: string;
}

const defaultForm = {
  productId: "",
  description: "",
};

function getTokenType(token: string): TokenType {
  if (token === "(") return "open";
  if (token === ")") return "close";
  if (BINARY_OPS.includes(token as typeof BINARY_OPS[number])) return "binary_op";
  return "operand";
}

function lastType(tokens: string[]): TokenType | null {
  if (tokens.length === 0) return null;
  return getTokenType(tokens[tokens.length - 1]);
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
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "") || "formula";

const numberRegex = /^-?\d+(\.\d+)?$/;

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

const FormulasSettings = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [rows, setRows] = useState<ProductFormulaRow[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFormula, setEditingFormula] = useState<ProductFormulaRow | null>(null);
  const [formData, setFormData] = useState(defaultForm);
  const [expressionTokens, setExpressionTokens] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasHandledInitialSearchEffect = useRef(false);
  const isMountedRef = useRef(true);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const addToken = (token: string) => {
    setExpressionTokens((prev) => {
      const type = getTokenType(token);
      if (type === "operand") return addOperand(prev, token);
      if (type === "binary_op") return canAddBinaryOp(prev) ? [...prev, token] : prev;
      if (type === "open") return canAddOpen(prev) ? [...prev, token] : prev;
      if (type === "close") return canAddClose(prev) ? [...prev, token] : prev;
      return prev;
    });
  };

  const loadData = async (search = "") => {
    setIsLoading(true);
    try {
      const productsData = await productService.getProducts();
      const formulaResult = await formulaService.getFormulasFromDb({
        search,
        page: 1,
        pageSize: 1000,
      });
      setProducts(productsData);
      setRows(
        formulaResult.rows
          .map((row) => ({
            productId: row.productId,
            productName: row.productName,
            key: row.key,
            expression: row.expression,
            description: row.description,
          }))
          .sort((a, b) => a.productName.localeCompare(b.productName))
      );
    } catch (error) {
      toast.error("Failed to load formulas: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!hasHandledInitialSearchEffect.current) {
      hasHandledInitialSearchEffect.current = true;
      return;
    }
    const timeoutId = window.setTimeout(() => {
      loadData(searchQuery);
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  const openCreate = () => {
    setEditingFormula(null);
    setFormData(defaultForm);
    setExpressionTokens([]);
    setIsDialogOpen(true);
  };

  const otherFormulaKeys = useMemo(() => {
    const excludeProductId = editingFormula?.productId || formData.productId;
    return new Set(rows.filter((f) => f.productId !== excludeProductId).map((f) => f.key));
  }, [rows, editingFormula?.productId, formData.productId]);

  const otherFormulas = useMemo(
    () => rows.filter((f) => f.productId !== (editingFormula?.productId || formData.productId)),
    [rows, editingFormula?.productId, formData.productId]
  );

  const openEdit = (f: ProductFormulaRow) => {
    setEditingFormula(f);
    setFormData({
      productId: f.productId,
      description: f.description ?? "",
    });
    setExpressionTokens(parseExpression(f.expression, new Set(rows.filter((x) => x.productId !== f.productId).map((x) => x.key))));
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingFormula(null);
    setFormData(defaultForm);
    setExpressionTokens([]);
  };

  const ensureUniqueKey = (baseKey: string, excludeProductId?: string) => {
    let key = baseKey;
    let n = 1;
    while (rows.some((f) => f.key === key && f.productId !== excludeProductId)) {
      key = `${baseKey}_${n}`;
      n++;
    }
    return key;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const productId = formData.productId;
    const expression = expressionTokens.join(" ").trim();
    const description = formData.description.trim() || undefined;

    if (!productId || !expression) return;
    const targetProduct = products.find((p) => p.id === productId);
    if (!targetProduct) return;

    const targetHasFormula = rows.some((r) => r.productId === targetProduct.id);
    const isMovingToAnotherProduct = Boolean(editingFormula && editingFormula.productId !== targetProduct.id);

    if (!editingFormula && targetHasFormula) {
      toast.error(`Product "${targetProduct.name}" already has a formula.`);
      return;
    }

    if (isMovingToAnotherProduct && targetHasFormula) {
      toast.error(`Product "${targetProduct.name}" already has a formula.`);
      return;
    }

    const baseKey = editingFormula?.key ?? slugify(targetProduct.name);
    const formulaKey = ensureUniqueKey(baseKey, targetProduct.id);

    setIsSubmitting(true);
    try {
      if (editingFormula && editingFormula.productId !== targetProduct.id) {
        await formulaService.deleteFormulaByProductId(editingFormula.productId);
      }

      await formulaService.upsertFormula({
        productId: targetProduct.id,
        key: formulaKey,
        expression,
        description,
      });

      if (isMountedRef.current) {
        toast.success(editingFormula ? "Formula updated successfully" : "Formula created successfully");
        closeDialog();
        await loadData(searchQuery);
      }
    } catch (error) {
      if (isMountedRef.current) {
        const message = error instanceof Error ? error.message : typeof error === "string" ? error : "Failed to save formula";
        toast.error("Failed to save formula: " + message);
      }
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("Delete this formula? This cannot be undone.")) return;

    try {
      await formulaService.deleteFormulaByProductId(productId);
      if (isMountedRef.current) {
        toast.success("Formula deleted successfully");
        await loadData(searchQuery);
      }
    } catch (error) {
      if (isMountedRef.current) {
        toast.error("Failed to delete formula: " + (error instanceof Error ? error.message : String(error)));
      }
    }
  };

  const sortedFormulas = [...rows].sort((a, b) => a.productName.localeCompare(b.productName));

  const totalPages = Math.ceil(sortedFormulas.length / itemsPerPage);

  const paginatedFormulas = sortedFormulas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formulaTokenOptions = React.useMemo(
    () =>
      otherFormulas.map((f) => ({
        key: f.key,
        label: f.productName,
        description: f.key,
        group: "Existing formulas",
      })),
    [otherFormulas]
  );

  const operatorOptions = React.useMemo(
    () =>
      BINARY_OPS.map((op) => ({
        key: op,
        label: op,
        description:
          op === "+"
            ? "Add"
            : op === "-"
              ? "Subtract"
              : op === "*"
                ? "Multiply"
                : "Divide",
      })),
    []
  );

  const bracketOptions = React.useMemo(
    () => [
      { key: "(", label: "(", description: "Open bracket" },
      { key: ")", label: ")", description: "Close bracket" },
    ],
    []
  );

  const getTokenTypeClass = (token: string): string => {
    if (MEASUREMENT_KEYS.has(token)) {
      return "bg-primary/15 text-primary";
    }
    if (token === WASTE_PERCENTAGE_KEY) {
      return "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800";
    }
    if (otherFormulaKeys.has(token)) {
      return "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800";
    }
    if (OPERATOR_SET.has(token)) {
      return "bg-muted border border-border text-foreground font-mono";
    }
    return "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono border border-blue-200 dark:border-blue-800";
  };

  const tokenClassName = (token: string) => getTokenTypeClass(token);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Formulas</h2>
        <p className="text-muted-foreground mt-1">
          Formulas are applied automatically in quote details.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Formulas
              </CardTitle>
              <CardDescription className="mt-1">
                Select a product and define expression with measurements/operators.
              </CardDescription>
            </div>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add formula
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product, formula key, or expression"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Formula Key</TableHead>
                <TableHead>Expression</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Loading formulas...
                  </TableCell>
                </TableRow>
              ) : sortedFormulas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No formulas yet. Add one to compute quantities from measurements.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedFormulas.map((f) => (
                  <TableRow key={f.productId}>
                    <TableCell className="font-medium">{f.productName}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{f.key}</code>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded break-all">{f.expression}</code>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                      {f.description ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(f)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(f.productId)} title="Delete">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFormula ? "Edit formula" : "Add formula"}</DialogTitle>
            <DialogDescription>
              Expression is saved on the selected product.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Product *</Label>
                <SearchableSelect
                  options={products.map((p) => ({ value: p.id, label: p.name }))}
                  value={formData.productId}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, productId: value }))}
                  placeholder="Select product"
                  searchPlaceholder="Search product..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="formula-description">Description (optional)</Label>
                <Textarea
                  id="formula-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Valley metal with 10% waste"
                  rows={2}
                />
              </div>

              <div className="space-y-3">
                <Label>Expression *</Label>
                <ExpressionTokenPicker
                  tokens={expressionTokens}
                  onTokensChange={(nextTokens) => {
                    const nextToken = nextTokens[nextTokens.length - 1];
                    if (nextTokens.length === expressionTokens.length + 1 && nextToken) {
                      addToken(nextToken);
                      return;
                    }
                    setExpressionTokens(nextTokens);
                  }}
                  measurementOptions={MEASUREMENT_TOKEN_OPTIONS}
                  formulaOptions={formulaTokenOptions}
                  wasteOption={{
                    key: WASTE_PERCENTAGE_KEY,
                    label: "waste_percentage",
                    description: "Product waste percentage",
                    group: "Waste %",
                  }}
                  operatorOptions={operatorOptions}
                  bracketOptions={bracketOptions}
                  canAddOperand={canAddOperand}
                  canAddBinaryOp={canAddBinaryOp}
                  canAddOpen={canAddOpen}
                  canAddClose={canAddClose}
                  tokenClassName={tokenClassName}
                  placeholder="Search measurements, formulas, operators, or type a number"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={!formData.productId || expressionTokens.length === 0 || isSubmitting}>
                {editingFormula ? (isSubmitting ? "Updating..." : "Update") : (isSubmitting ? "Creating..." : "Create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="flex justify-between items-center p-4">
        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>

          <select
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
  );
};

export default FormulasSettings;
