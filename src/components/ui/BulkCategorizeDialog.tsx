import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Tag } from "lucide-react";
import { ProductCategory } from "@/services/products/product-service";

interface BulkCategorizeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedCount: number;
    categories: ProductCategory[];
    onConfirm: (categoryId: string | null) => Promise<void>;
    loading?: boolean;
}

export const BulkCategorizeDialog: React.FC<BulkCategorizeDialogProps> = ({
    open,
    onOpenChange,
    selectedCount,
    categories,
    onConfirm,
    loading = false,
}) => {
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("NA");

    const handleConfirm = async () => {
        await onConfirm(selectedCategoryId === "NA" ? null : selectedCategoryId);
        setSelectedCategoryId("NA");
    };

    const handleOpenChange = (nextOpen: boolean) => {
        if (!loading) {
            onOpenChange(nextOpen);
            if (!nextOpen) setSelectedCategoryId("NA");
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-xl overflow-visible">
                <DialogHeader>
                    <DialogTitle className="flex items-center">
                        <Tag className="h-5 w-5 text-primary mr-2" />
                        Bulk Assign Category
                    </DialogTitle>
                    <DialogDescription>
                        Assign a category to{" "}
                        <span className="font-semibold text-foreground">
                            {selectedCount} selected product{selectedCount !== 1 ? "s" : ""}
                        </span>
                        . This will overwrite their existing categories.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-3">
                    <Label htmlFor="bulk-category">Category</Label>
                    <div className="relative">
                        <SearchableSelect
                            options={[
                                { value: "NA", label: "Uncategorized" },
                                ...categories.map((c) => ({ value: c.id, label: c.name })),
                            ]}
                            value={selectedCategoryId}
                            onValueChange={setSelectedCategoryId}
                            placeholder="Select a category"
                            searchPlaceholder="Search categories…"
                            emptyText="No category found."
                        />
                    </div>
                    {selectedCategoryId === "NA" && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                            ⚠ Selecting "Uncategorized" will remove the category from all selected products.
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => handleOpenChange(false)}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={loading}>
                        {loading
                            ? `Updating ${selectedCount} product${selectedCount !== 1 ? "s" : ""}…`
                            : `Apply to ${selectedCount} product${selectedCount !== 1 ? "s" : ""}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};