import React, { useMemo, useState, useRef, useEffect } from "react";
import { Card } from "../ui/card";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Product, ProductCategory, ProductSupplier } from "@/services/products/product-service";
import { TrashIcon } from "../estimates-v2/EstimatesContainer";
import { InfoIcon } from "lucide-react";

function useTruncatedText<T extends HTMLElement>(deps: unknown[] = []) {
    const ref = useRef<T>(null);
    const [expanded, setExpanded] = useState(false);
    const [truncated, setTruncated] = useState(false);

    useEffect(() => {
        if (!ref.current || expanded) return;

        const el = ref.current;

        const checkTruncation = () => {
            setTruncated(el.scrollWidth > el.clientWidth);
        };

        checkTruncation();

        const resizeObserver = new ResizeObserver(checkTruncation);
        resizeObserver.observe(el);

        return () => resizeObserver.disconnect();
    }, [expanded, ...deps]);

    return {
        ref,
        expanded,
        truncated,
        expand: () => setExpanded(true),
        collapse: () => setExpanded(false),
    };
}

interface ProductCardProps {
    itemId: string;
    productData: {
        text: string;
        price: number;
        quantity: number;
        wastage_percentage: number;
        description?: string;
        catalog_product_id: string;
        catalog_supplier_id?: string | null;
        catalog_variant_id?: string | null;
        sku?: string | null;
        unit_of_measure?: string | null; 
        formula_expression?: string;
    };
    catalogProduct?: Product;
    categories: ProductCategory[];
    suppliers: ProductSupplier[];
    onQuantityChange: (value: string) => void;
    onDelete: () => void;
    className?: string;
    isManuallyEdited?: boolean;
    sectionTitle?: string;
    /** Extra fields (e.g. richtext) to render below the main content */
    children?: React.ReactNode;
}

const isLaborSection = (sectionTitle?: string): boolean => {
    if (!sectionTitle) return false;
    return sectionTitle.trim().toLowerCase().includes("labor") ||
        sectionTitle.trim().toLowerCase().includes("labour");
};

export const ProductCard: React.FC<ProductCardProps> = ({
    itemId,
    productData,
    catalogProduct,
    categories,
    suppliers,
    onQuantityChange,
    onDelete,
    className = "",
    isManuallyEdited,
    sectionTitle,
    children,
}) => {
    const isLabor = isLaborSection(sectionTitle);

    const categoryName = useMemo(() => {
        if (!catalogProduct?.category_id) return "Uncategorized";
        const category = categories.find(cat => cat.id === catalogProduct.category_id);
        return category?.name || "Unknown Category";
    }, [catalogProduct?.category_id, categories]);

    const supplierDisplay = useMemo(() => {
        if (productData.catalog_supplier_id) {
            const supplier = suppliers.find(s => s.id === productData.catalog_supplier_id);
            return supplier?.name || "Unknown Supplier";
        }

        const sps = catalogProduct?.product_suppliers ?? [];
        if (sps.length > 0) {
            return sps
                .map(ps => suppliers.find(s => s.id === ps.supplier_id)?.name || "Unknown Supplier")
                .join(", ");
        }
        return "No suppliers";
    }, [productData.catalog_supplier_id, catalogProduct?.product_suppliers, suppliers]);

    const unitOfMeasure = useMemo(() => {
        if (productData.unit_of_measure) return productData.unit_of_measure;

        const allSps = catalogProduct?.product_suppliers ?? [];

        if (productData.catalog_variant_id) {
            for (const sp of allSps) {
                const v = (sp.variants ?? []).find(v => v.id === productData.catalog_variant_id);
                if (v?.unit_of_measure) return v.unit_of_measure;
            }
        }

        if (productData.catalog_supplier_id) {
            const sp = allSps.find(s => s.supplier_id === productData.catalog_supplier_id);
            if (sp) {
                const pref = (sp.variants ?? []).find(v => v.is_preferred) ?? sp.variants?.[0];
                if (pref?.unit_of_measure) return pref.unit_of_measure;
            }
        }

        for (const sp of allSps) {
            const pref = (sp.variants ?? []).find(v => v.is_preferred) ?? sp.variants?.[0];
            if (pref?.unit_of_measure) return pref.unit_of_measure;
        }

        if (catalogProduct?.unit_of_measure) return catalogProduct.unit_of_measure;

        return "N/A";
    }, [
        productData.unit_of_measure,
        productData.catalog_variant_id,
        productData.catalog_supplier_id,
        catalogProduct?.product_suppliers,
        catalogProduct?.unit_of_measure,
    ]);

    const sku = useMemo(() => {
        if (productData.sku) return productData.sku;

        const allSps = catalogProduct?.product_suppliers ?? [];

        if (productData.catalog_variant_id) {
            for (const sp of allSps) {
                const v = (sp.variants ?? []).find(v => v.id === productData.catalog_variant_id);
                if (v?.sku) return v.sku;
            }
        }

        if (productData.catalog_supplier_id) {
            const sp = allSps.find(s => s.supplier_id === productData.catalog_supplier_id);
            if (sp) {
                const pref = (sp.variants ?? []).find(v => v.is_preferred) ?? sp.variants?.[0];
                if (pref?.sku) return pref.sku;
            }
        }

        return null;
    }, [productData.sku, productData.catalog_variant_id, productData.catalog_supplier_id, catalogProduct?.product_suppliers]);

    const variantName = useMemo(() => {
        const allSps = catalogProduct?.product_suppliers ?? [];

        if (productData.catalog_variant_id) {
            for (const sp of allSps) {
                const v = (sp.variants ?? []).find(v => v.id === productData.catalog_variant_id);
                if (v?.variant_name) return v.variant_name;
            }
        }

        if (productData.catalog_supplier_id) {
            const sp = allSps.find(s => s.supplier_id === productData.catalog_supplier_id);
            if (sp) {
                const pref = (sp.variants ?? []).find(v => v.is_preferred) ?? sp.variants?.[0];
                if (pref?.variant_name) return pref.variant_name;
            }
        }

        return null;
    }, [productData.catalog_variant_id, productData.catalog_supplier_id, catalogProduct?.product_suppliers]);

    const variantType = useMemo(() => {
        const allSps = catalogProduct?.product_suppliers ?? [];

        if (productData.catalog_variant_id) {
            for (const sp of allSps) {
                const v = (sp.variants ?? []).find(v => v.id === productData.catalog_variant_id);
                if (v?.variant_type && v.variant_type !== "default") return v.variant_type;
            }
        }

        if (productData.catalog_supplier_id) {
            const sp = allSps.find(s => s.supplier_id === productData.catalog_supplier_id);
            if (sp) {
                const pref = (sp.variants ?? []).find(v => v.is_preferred) ?? sp.variants?.[0];
                if (pref?.variant_type && pref.variant_type !== "default") return pref.variant_type;
            }
        }

        return null;
    }, [productData.catalog_variant_id, productData.catalog_supplier_id, catalogProduct?.product_suppliers]);

    const descriptionText = productData.description || "No description available";
    const displayPrice = productData.price;
    const formulaExpression = (
      catalogProduct?.formula_v2?.expression ?? productData.formula_expression ?? ""
    ).trim();

    /* Truncation hooks */
    const description = useTruncatedText<HTMLSpanElement>([descriptionText]);
    const category = useTruncatedText<HTMLSpanElement>([categoryName]);

    return (
        <Card className={`mb-3 px-4 py-2 bg-gray-50 min-w-0 ${className}`}>
            <div className="flex items-start justify-between mb-2 border-b border-gray-300">
                <h3 className="text-base font-semibold text-gray-900">
                    {productData.text || "Untitled Product"}
                </h3>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 -mt-1"
                    onClick={onDelete}
                >
                    <TrashIcon className="h-5 w-5" />
                </Button>
            </div>

            {isLabor ? (
                <div className="grid grid-cols-3 items-center gap-2 mb-2">
                    <div className="flex items-center gap-2">
                        <Label htmlFor={`quantity-${itemId}`}>Qty:</Label>
                        <Input
                            id={`quantity-${itemId}`}
                            type="number"
                            min="0"
                            value={productData.quantity || "0"}
                            onChange={(e) => onQuantityChange(e.target.value)}
                            className={`w-16 h-6 !p-2 ${isManuallyEdited ? "border-[#ef4444] focus-visible:ring-[#ef4444]" : ""}`}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Label>Price:</Label>
                        <span className="text-sm">${displayPrice?.toFixed(2) || "0.00"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium shrink-0">Formula:</Label>
                        <code className={`text-xs px-1.5 py-0.5 rounded break-all ${formulaExpression ? "bg-muted text-foreground" : "bg-muted text-muted-foreground"}`}>
                            {formulaExpression || "-"}
                        </code>
                    </div>
                </div>
            ) : (
            <div className="grid grid-cols-12 items-start gap-2 mb-2">
                <div className="flex items-start gap-2 col-span-2">
                    <Label className="mt-1" htmlFor={`quantity-${itemId}`}>Qty:</Label>
                    <Input
                        id={`quantity-${itemId}`}
                        type="number"
                        min="0"
                        value={productData.quantity || "0"}
                        onChange={(e) => onQuantityChange(e.target.value)}
                        className={`w-16 h-6 !p-2 ${isManuallyEdited ? "border-[#ef4444] focus-visible:ring-[#ef4444]" : ""}`}
                    />
                </div>

                <div className="flex items-start col-span-3 min-w-0">
                    <Label className="shrink-0 w-12 leading-5">UOM:</Label>
                    <span className="text-sm leading-5 break-words">{unitOfMeasure.replace("/", "/\u200B")}</span>
                </div>

                <div className="flex items-center gap-2 col-span-2">
                    <Label>Wastage:</Label>
                    <span className="text-sm">{productData.wastage_percentage || 0}%</span>
                </div>

                <div className="flex items-center gap-2 col-span-2">
                    <Label>Price:</Label>
                    <span className="text-sm">
                        ${displayPrice?.toFixed(2) || "0.00"}
                    </span>
                </div>

                     {/* Suppliers*/}
                <div className=" flex gap-2 items-start col-span-3 min-w-0">
                    <Label className="shrink-0 text-sm leading-5">Suppliers:</Label>
                    <span className="text-sm leading-5 break-words">{supplierDisplay.replace("/", "/\u200B")}</span>
                    </div>
            </div>
            )}

            <div className="grid grid-cols-12 items-center gap-2 mb-2">
                <div className="flex items-center gap-2 col-span-2">
                    <Label>SKU:</Label>
                    <span className="text-sm font-mono text-gray-700">{sku ?? "No-SKU"}</span>
                </div>
                <div className="flex items-center gap-2 col-span-4">
                    <Label>Variant:</Label>
                    <span className="text-sm text-gray-700">{variantName ?? "No-Variant-name"}</span>
                </div>
                <div className="flex items-center gap-2 col-span-4">
                    <Label>Type:</Label>
                    <span className="text-sm text-gray-700 capitalize">{variantType ?? "No-Variant-type"}</span>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-2">
                {!isLabor && catalogProduct && (
                    <div className="col-span-12 flex gap-2 items-start">
                        <Label className="shrink-0 text-sm font-medium leading-5">Formula:</Label>
                        <code className={`text-xs px-1.5 py-0.5 rounded break-all ${formulaExpression ? "bg-muted text-foreground" : "bg-muted text-muted-foreground"}`}>
                            {formulaExpression || "-"}
                        </code>
                    </div>
                )}
                {/* Description */}
                <div className={`${isLabor ? "col-span-12" : "col-span-6"} flex gap-2 items-start`}>
                    <Label className="shrink-0 text-sm font-medium leading-5">Description:</Label>
                    <div className="flex-1 min-w-0">
                        {description.expanded ? (
                            <div className="text-sm text-gray-600 leading-5">
                                {descriptionText}{" "}
                                <button
                                    onClick={description.collapse}
                                    className="inline-flex items-center align-text-bottom -mt-0.5"
                                >
                                    <InfoIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center">
                                <span
                                    ref={description.ref}
                                    className="truncate flex-1 text-sm text-gray-600 leading-5"
                                >
                                    {descriptionText}
                                </span>
                                {description.truncated && (
                                    <button
                                        onClick={description.expand}
                                        className="inline-flex items-center align-text-bottom -mt-0.5"
                                    >
                                        <InfoIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Category*/}
                {!isLabor && (
                <div className="col-span-6 flex gap-2 items-start">
                    <Label className="shrink-0 text-sm font-medium leading-5">Category:</Label>
                    <div className="flex-1 min-w-0">
                        {category.expanded ? (
                            <div className="text-sm text-gray-600">
                                {categoryName}{" "}
                                <button onClick={category.collapse}>
                                    <InfoIcon className="w-4 h-4 inline" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center">
                                <span
                                    ref={category.ref}
                                    className="truncate flex-1 text-sm text-gray-600"
                                >
                                    {categoryName}
                                </span>
                                {category.truncated && (
                                    <button onClick={category.expand}>
                                        <InfoIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                )}
            </div>

            {children && (
                <div className="mt-3 pt-3 border-t border-gray-200 min-w-0 overflow-x-auto">
                    {children}
                </div>
            )}
        </Card>
    );
};