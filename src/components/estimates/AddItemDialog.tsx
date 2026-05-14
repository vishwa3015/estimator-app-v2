import React, { useEffect, useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Product, ProductCategory, productService, ProductSupplier, SupplierVariantOption, } from "@/services/products/product-service";

interface AddItemDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (type: 'custom' | 'catalog', selectedItems?: SelectedCatalogItem[], selectedSupplierId?: string) => void;suppliers?: ProductSupplier[];}

export interface SelectedCatalogItem {
    productId: string;
    variantId?: string;
    supplierId?: string;
    price: number;
    sku?: string | null;
    unitOfMeasure?: string | null;
}

const ALL_VALUE = "__all__";

type SelectionKey = string;

const makeVariantKey = (productId: string, variantId: string): SelectionKey => `${productId}::${variantId}`;
const makeSupplierKey = (productId: string, supplierId: string): SelectionKey => `${productId}::${supplierId}`;

const splitKey = (key: SelectionKey): [string, string] => {
    const idx = key.indexOf("::");
    return [key.slice(0, idx), key.slice(idx + 2)];
};

export const AddItemDialog: React.FC<AddItemDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    suppliers = [],
}) => {
    const { toast } = useToast();
    const [selectedType, setSelectedType] = useState<'custom' | 'catalog'>('custom');
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<ProductCategory[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>(ALL_VALUE);
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>(ALL_VALUE);
    const [searchQuery, setSearchQuery] = useState<string>("");

    const [selectedVariantKeys, setSelectedVariantKeys] = useState<Set<SelectionKey>>(new Set());
    const [selectedSupplierRows, setSelectedSupplierRows] = useState<Set<SelectionKey>>(new Set());
    const [selectedRowVariants, setSelectedRowVariants] = useState<Record<SelectionKey, string>>({});

    useEffect(() => {
        if (!isOpen) return;
        (async () => {
            try {
                const [productsList, categoriesList] = await Promise.all([
                    productService.getProducts(),
                    productService.getCategories(),
                ]);

                setProducts(productsList);
                setCategories(categoriesList);
            } catch (error) {
                console.error("Error loading catalog data:", error);
                toast({
                    title: "Error",
                    description: error instanceof Error ? error.message : "Failed to load catalog data",
                    variant: "destructive",
                });
            }
        })();
    }, [isOpen, toast]);

    const isAllSuppliers = selectedSupplierId === ALL_VALUE;
    const activeSuppliers = suppliers.filter(s => s.is_active !== false);

    const searchActive = searchQuery.trim().length >= 3;

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const catOk =
                selectedCategoryId === ALL_VALUE ? true
                    : selectedCategoryId === "uncategorized" ? !p.category_id
                        : p.category_id === selectedCategoryId;

            const supOk =
                isAllSuppliers ? true
                    : (p.product_suppliers ?? []).some(sp => sp.supplier_id === selectedSupplierId);

            const searchOk = searchActive
                ? p.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
                : true;

            return catOk && supOk && searchOk;
        });
    }, [products, selectedCategoryId, selectedSupplierId, isAllSuppliers, searchQuery, searchActive]);

    const showProductList = searchActive;

    const getSupplierName = (supplierId: string) =>
        activeSuppliers.find(s => s.id === supplierId)?.name ?? supplierId;

    const getSupplierVariants = (product: Product): SupplierVariantOption[] => {
        if (isAllSuppliers) return [];
        return (product.product_suppliers ?? []).find(sp => sp.supplier_id === selectedSupplierId)?.variants ?? [];
    };

    const toggleVariantKey = (key: SelectionKey) =>
        setSelectedVariantKeys(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });

    const toggleSupplierRow = (key: SelectionKey) =>
        setSelectedSupplierRows(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });

    const setVariantForRow = (rowKey: SelectionKey, variantId: string) => {
        setSelectedRowVariants(prev => ({ ...prev, [rowKey]: variantId }));
        setSelectedSupplierRows(prev => new Set([...prev, rowKey]));
    };

    const totalSelected = isAllSuppliers ? selectedSupplierRows.size : selectedVariantKeys.size;

    const handleConfirm = () => {
        if (selectedType === "catalog" && totalSelected === 0) {
            toast({
                title: "No Products Selected",
                description: "Please select at least one product",
                variant: "destructive",
            });
            return;
        }

        let items: SelectedCatalogItem[];

        if (isAllSuppliers) {
            items = Array.from(selectedSupplierRows).map(key => {
                const [productId, rest] = splitKey(key);
                const product = products.find(p => p.id === productId)!;
                const hasPipe = rest.includes("||");
                const supplierId = hasPipe ? rest.split("||")[0] : rest;
                const variantId = hasPipe ? rest.split("||")[1] : undefined;
                if (!supplierId) {
                    return { productId, price: product.price, sku: null, unitOfMeasure: null };
                }
                const sp = (product.product_suppliers ?? []).find(s => s.supplier_id === supplierId);
                const variant = variantId ? (sp?.variants ?? []).find(v => v.id === variantId) ?? null : null;
                const price = variant?.price ?? sp?.price ?? product.price;
                return { productId, variantId: variant?.id, supplierId, price, sku: variant?.sku ?? null, unitOfMeasure: variant?.unit_of_measure ?? null };
            });
        } else {
            items = Array.from(selectedVariantKeys).map(key => {
                const [productId, variantId] = splitKey(key);
                const product = products.find(p => p.id === productId)!;
                const sp = (product.product_suppliers ?? []).find(s => s.supplier_id === selectedSupplierId);
                const variant = variantId ? (sp?.variants ?? []).find(v => v.id === variantId) ?? null : null;
                const price = variant?.price ?? sp?.price ?? product.price;
                return {
                    productId,
                    variantId: variant?.id ?? undefined,
                    supplierId: selectedSupplierId !== ALL_VALUE ? selectedSupplierId : undefined,
                    price,
                    sku: variant?.sku ?? null,
                    unitOfMeasure: variant?.unit_of_measure ?? null,
                };
            });
        }

        onConfirm(selectedType, items, isAllSuppliers ? "" : selectedSupplierId);
        handleClose();
    };

    // Handle close and reset
    const handleClose = () => {
        setSelectedType('custom');
        setSelectedCategoryId(ALL_VALUE);
        setSelectedSupplierId(ALL_VALUE);
        setSearchQuery("");
        setSelectedVariantKeys(new Set());
        setSelectedSupplierRows(new Set());
        setSelectedRowVariants({});
        onClose();
    };

    const Checkbox = ({ checked }: { checked: boolean }) => (
        <input
            type="checkbox"
            checked={checked}
            readOnly
            className="mt-0.5 cursor-pointer h-4 w-4 shrink-0 appearance-none border border-red-500 rounded-sm
                       checked:bg-red-500 checked:border-red-500
                       relative before:content-['✓'] before:absolute before:text-white before:text-[12px]
                       before:font-bold before:top-[-3px] before:left-[2px] before:hidden checked:before:block"
        />
    );

    const VariantMetaRow = ({
        price,
        sku,
        unitOfMeasure,
        variantName,
        variantType,
        supplierName,
        isSupplierPrice = true,
    }: {
        price: number;
        sku?: string | null;
        unitOfMeasure?: string | null;
        variantName?: string | null;
        variantType?: string | null;
        supplierName?: string | null;
        isSupplierPrice?: boolean;
    }) => (
        <div className="space-y-0.5 mt-0.5">
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-gray-700">${price.toFixed(2)}</span>
                <span className={cn("text-xs font-medium", isSupplierPrice ? "text-green-600" : "text-muted-foreground")}>
                    {isSupplierPrice ? "supplier price" : "default price"}
                </span>
            </div>
            {(sku || unitOfMeasure || variantName || variantType) && (
                <div className="flex items-center gap-3 flex-wrap">
                    {sku && (
                        <span className="text-xs text-muted-foreground">
                            SKU: <span className="font-mono text-gray-700">{sku}</span>
                        </span>
                    )}
                    {unitOfMeasure && (
                        <span className="text-xs text-muted-foreground">
                            UOM: <span className="text-gray-700">{unitOfMeasure}</span>
                        </span>
                    )}
                    {variantName && (
                        <span className="text-xs text-muted-foreground">
                            Variant: <span className="text-gray-700">{variantName}</span>
                        </span>
                    )}
                    {variantType && (
                        <span className="text-xs text-muted-foreground">
                            Type: <span className="text-gray-700">{variantType}</span>
                        </span>
                    )}
                    {supplierName && (
                        <span className="text-xs text-muted-foreground">
                            Supplier: <span className="text-gray-700">{supplierName}</span>
                        </span>
                    )}
                </div>
            )}
        </div>
    );

    const renderSpecificSupplierProductList = () => {
        if (filteredProducts.length === 0) {
            return (
                <div className="p-6 text-center text-sm text-muted-foreground">
                    No products found for the selected filters
                </div>
            );
        }

        return filteredProducts.map(product => {
            const sp = (product.product_suppliers ?? []).find(s => s.supplier_id === selectedSupplierId);
            const variants = getSupplierVariants(product);

            if (variants.length === 0) {
                const key = makeVariantKey(product.id, "");
                const isSelected = selectedVariantKeys.has(key);
                const price = sp?.price ?? product.price;
                return (
                    <div
                        key={key}
                        className={cn("p-3 cursor-pointer flex items-start gap-3 transition-colors", isSelected && "bg-gray-50")}
                        onClick={() => toggleVariantKey(key)}
                    >
                        <Checkbox checked={isSelected} />
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{product.name}</p>
                            <VariantMetaRow
                                price={price}
                                isSupplierPrice={!!sp}
                                variantName={sp?.variant_name}
                                variantType={sp?.variant_type}
                            />
                        </div>
                    </div>
                );
            }

            if (variants.length === 1) {
                const v = variants[0];
                const key = makeVariantKey(product.id, v.id);
                const isSelected = selectedVariantKeys.has(key);
                return (
                    <div
                        key={key}
                        className={cn("p-3 cursor-pointer flex items-start gap-3 transition-colors", isSelected && "bg-gray-50")}
                        onClick={() => toggleVariantKey(key)}
                    >
                        <Checkbox checked={isSelected} />
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{product.name}</p>
                            <VariantMetaRow
                                price={v.price}
                                sku={v.sku}
                                unitOfMeasure={v.unit_of_measure}
                                variantName={v.variant_name}
                                variantType={v.variant_type}
                            />
                        </div>
                    </div>
                );
            }

            return (
                <div key={product.id} className="divide-y divide-dashed">
                    <div className="px-3 pt-2.5 pb-1 bg-gray-50/80">
                        <p className="font-semibold text-sm text-gray-800">{product.name}</p>
                    </div>
                    {variants.map(v => {
                        const key = makeVariantKey(product.id, v.id);
                        const isSelected = selectedVariantKeys.has(key);
                        return (
                            <div
                                key={key}
                                className={cn("px-3 py-2.5 cursor-pointer flex items-start gap-3 transition-colors", isSelected && "bg-red-50/40")}
                                onClick={() => toggleVariantKey(key)}
                            >
                                <Checkbox checked={isSelected} />
                                <div className="flex-1 min-w-0">
                                    <VariantMetaRow
                                        price={v.price}
                                        sku={v.sku}
                                        unitOfMeasure={v.unit_of_measure}
                                        variantName={v.variant_name}
                                        variantType={v.variant_type}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        });
    };

    const renderAllSuppliersProductList = () => {
        if (filteredProducts.length === 0) {
            return (
                <div className="p-6 text-center text-sm text-muted-foreground">
                    No products found for the selected filters
                </div>
            );
        }

        return filteredProducts.map(product => {
            const supplierPrices = product.product_suppliers ?? [];

            if (supplierPrices.length === 0) {
                const key = makeSupplierKey(product.id, "");
                const isSelected = selectedSupplierRows.has(key);
                return (
                    <div
                        key={product.id}
                        className={cn("p-3 cursor-pointer flex items-start gap-3 transition-colors", isSelected && "bg-gray-50")}
                        onClick={() => toggleSupplierRow(key)}
                    >
                        <Checkbox checked={isSelected} />
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{product.name}</p>
                            <VariantMetaRow price={product.price} isSupplierPrice={false} />
                        </div>
                    </div>
                );
            }

            type SupplierVariantRow = {
                rowKey: SelectionKey;
                supplierId: string;
                price: number;
                sku?: string | null;
                unitOfMeasure?: string | null;
                variantName?: string | null;
                variantType?: string | null;
                variantId?: string;
            };

            const allRows: SupplierVariantRow[] = [];

            for (const sp of supplierPrices) {
                const variants = sp.variants ?? [];

                if (variants.length === 0) {
                    const rowKey = makeSupplierKey(product.id, sp.supplier_id);
                    const firstVariant = (sp.variants ?? [])[0];
                    allRows.push({
                        rowKey,
                        supplierId: sp.supplier_id,
                        price: sp.price,
                        variantName: firstVariant?.variant_name ?? null,
                        variantType: firstVariant?.variant_type ?? null,
                        sku: firstVariant?.sku ?? null,
                        unitOfMeasure: firstVariant?.unit_of_measure ?? null,
                    });
                } else {
                    for (const v of variants) {
                        const rowKey = `${product.id}::${sp.supplier_id}||${v.id}`;
                        allRows.push({
                            rowKey,
                            supplierId: sp.supplier_id,
                            price: v.price,
                            sku: v.sku,
                            unitOfMeasure: v.unit_of_measure,
                            variantName: v.variant_name,
                            variantType: v.variant_type,
                            variantId: v.id,
                        });
                    }
                }
            }

            const totalRows = allRows.length;

            if (totalRows === 1) {
                const row = allRows[0];
                const isSelected = selectedSupplierRows.has(row.rowKey);
                return (
                    <div
                        key={product.id}
                        className={cn("p-3 cursor-pointer flex items-start gap-3 transition-colors", isSelected && "bg-gray-50")}
                        onClick={() => toggleSupplierRow(row.rowKey)}
                    >
                        <Checkbox checked={isSelected} />
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{product.name}</p>
                            <VariantMetaRow
                                price={row.price}
                                sku={row.sku}
                                unitOfMeasure={row.unitOfMeasure}
                                variantName={row.variantName}
                                variantType={row.variantType}
                                supplierName={getSupplierName(row.supplierId)}
                            />
                        </div>
                    </div>
                );
            }

            return (
                <div key={product.id} className="divide-y divide-dashed">
                    <div className="px-3 pt-2.5 pb-1 bg-gray-50/80">
                        <p className="font-semibold text-sm text-gray-800">{product.name}</p>
                    </div>

                    {allRows.map(row => {
                        const isSelected = selectedSupplierRows.has(row.rowKey);
                        return (
                            <div
                                key={row.rowKey}
                                className={cn("px-3 py-2.5 cursor-pointer flex items-start gap-3 transition-colors", isSelected && "bg-red-50/40")}
                                onClick={() => toggleSupplierRow(row.rowKey)}
                            >
                                <Checkbox checked={isSelected} />
                                <div className="flex-1 min-w-0">
                                    <VariantMetaRow
                                        price={row.price}
                                        sku={row.sku}
                                        unitOfMeasure={row.unitOfMeasure}
                                        variantName={row.variantName}
                                        variantType={row.variantType}
                                        supplierName={getSupplierName(row.supplierId)}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl overflow-visible">
                <DialogHeader>
                    <DialogTitle>Add Item</DialogTitle>
                </DialogHeader>

                {/* Type Selection */}
                <div className="grid grid-cols-1 gap-3 mt-4">
                    <div
                        onClick={() => setSelectedType("custom")}
                        className={`w-full border rounded-lg px-4 py-2 cursor-pointer ${selectedType === "custom" ? "border-red-500" : "border-gray-300"
                            }`}
                    >
                        <p className="font-medium">Custom</p>
                    </div>

                    <div
                        onClick={() => setSelectedType("catalog")}
                        className={`w-full border rounded-lg px-4 py-2 cursor-pointer ${selectedType === "catalog" ? "border-red-500" : "border-gray-300"
                            }`}
                    >
                        <p className="font-medium">From Catalog</p>
                    </div>
                </div>

                {/* Catalog Selection UI */}
                {selectedType === "catalog" && (
                    <div className="space-y-2">


                        {/* Filters */}
                        <div className="grid grid-cols-1 gap-3">
                            <div className="space-y-1.5">
                                <Label>
                                    Category{" "}
                                    <span className="text-muted-foreground font-normal ml-1 text-xs">(optional)</span>
                                </Label>
                                <Select
                                    value={selectedCategoryId}
                                    onValueChange={v => {
                                        setSelectedCategoryId(v);
                                        setSelectedVariantKeys(new Set());
                                        setSelectedSupplierRows(new Set());
                                    }}
                                >
                                    <SelectTrigger className="w-full"><SelectValue placeholder="All Categories" /></SelectTrigger>
                                    <SelectContent className="z-50 bg-background">
                                        <SelectItem value={ALL_VALUE}>All Categories</SelectItem>
                                        <SelectItem value="uncategorized">Uncategorized</SelectItem>
                                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            {activeSuppliers.length > 0 && (
                                <div className="space-y-1.5">
                                    <Label>
                                        Supplier{" "}
                                        <span className="text-muted-foreground font-normal ml-1 text-xs">(optional)</span>
                                    </Label>
                                    <Select
                                        value={selectedSupplierId}
                                        onValueChange={v => {
                                            setSelectedSupplierId(v);
                                            setSelectedVariantKeys(new Set());
                                            setSelectedSupplierRows(new Set());
                                            setSelectedRowVariants({});
                                        }}
                                    >
                                        <SelectTrigger className="w-full"><SelectValue placeholder="All Suppliers" /></SelectTrigger>
                                        <SelectContent className="z-50 bg-background">
                                            <SelectItem value={ALL_VALUE}>All Suppliers</SelectItem>
                                            {activeSuppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        {/* Search */}
                        <div className="space-y-1.5">
                            <Label>Search Products</Label>
                            <div className="relative">
                                <svg
                                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                                </svg>
                                <Input
                                    className="pl-9 pr-4"
                                    placeholder="Type at least 3 characters to search..."
                                    value={searchQuery}
                                    onChange={e => {
                                        setSearchQuery(e.target.value);
                                        setSelectedVariantKeys(new Set());
                                        setSelectedSupplierRows(new Set());
                                    }}
                                />
                                {searchQuery.length > 0 && searchQuery.length < 3 && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                        {3 - searchQuery.length} more
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Product list */}
                        {showProductList ? (
                            <div className="space-y-2">
                                <Label>
                                    Products
                                    {filteredProducts.length > 0 && (
                                        <span className="text-muted-foreground font-normal ml-2 text-xs">
                                            ({filteredProducts.length} found)
                                        </span>
                                    )}
                                </Label>
                                <div className="border rounded-md max-h-52 overflow-y-auto divide-y">
                                    {isAllSuppliers
                                        ? renderAllSuppliersProductList()
                                        : renderSpecificSupplierProductList()}
                                </div>
                                {totalSelected > 0 && (
                                    <p className="text-sm text-muted-foreground">{totalSelected} item(s) selected</p>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-2">
                                {searchQuery.length > 0 && searchQuery.length < 3
                                    ? `Type ${3 - searchQuery.length} more character${3 - searchQuery.length > 1 ? "s" : ""} to search`
                                    : "Search by name or select a category / supplier above to browse products"}
                            </p>
                        )}
                    </div>
                )}

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleConfirm} disabled={selectedType === "catalog" && totalSelected === 0}>
                        Add
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};