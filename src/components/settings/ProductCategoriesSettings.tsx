import React, { useState, useEffect, useMemo } from "react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown, Search, X, Tag } from "lucide-react";
import { productService, buildCategoryTree } from "@/services/products/product-service";
import type { ProductCategory, CategoryTreeNode } from "@/types/product";
import { toast } from "sonner";

const isGlobalCategory = (cat: ProductCategory): boolean =>
  !cat.location_id || cat.location_id.trim() === "";

function filterTree(nodes: CategoryTreeNode[], query: string): CategoryTreeNode[] {
  const q = query.toLowerCase();

  function filterNode(node: CategoryTreeNode): CategoryTreeNode | null {
    const selfMatch =
      node.name.toLowerCase().includes(q) ||
      (node.description ?? "").toLowerCase().includes(q);

    const filteredChildren = node.children
      .map(filterNode)
      .filter(Boolean) as CategoryTreeNode[];

    if (selfMatch || filteredChildren.length > 0) {
      return { ...node, children: filteredChildren };
    }
    return null;
  }

  return nodes.map(filterNode).filter(Boolean) as CategoryTreeNode[];
}

const CategoryRow = ({
  node,
  depth = 0,
  onEdit,
  onDelete,
}: {
  node: CategoryTreeNode;
  depth?: number;
  onEdit: (cat: ProductCategory) => void;
  onDelete: (id: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children.length > 0;
  const isGlobal = isGlobalCategory(node);

  return (
    <>
      <TableRow key={node.id}>
        <TableCell className="font-medium">
          <div
            className="flex items-center"
            style={{ paddingLeft: `${depth * 20}px` }}
          >
            {hasChildren ? (
              <button
                onClick={() => setExpanded((p) => !p)}
                className="mr-1 text-muted-foreground"
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <span className="mr-1 w-5 inline-block" />
            )}
            <span
              className={
                depth === 0
                  ? "font-semibold"
                  : depth === 1
                    ? "font-medium"
                    : "text-muted-foreground text-sm"
              }
            >
              {node.name}
            </span>
            {hasChildren && (
              <span className="ml-2 text-xs text-muted-foreground">
                ({node.children.length})
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground">
          {node.description || "-"}
        </TableCell>
        <TableCell className="text-muted-foreground text-sm capitalize">
          {depth === 0 ? "Root" : depth === 1 ? "Sub" : "Sub-sub"}
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
                      onClick={() => !isGlobal && onEdit(node)}
                      disabled={isGlobal}
                      className={isGlobal ? "opacity-40 cursor-not-allowed" : ""}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                {isGlobal && (
                  <TooltipContent>
                    <p>Global categories cannot be edited</p>
                  </TooltipContent>
                )}
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => !isGlobal && onDelete(node.id)}
                      disabled={isGlobal}
                      className={isGlobal ? "opacity-40 cursor-not-allowed" : ""}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </span>
                </TooltipTrigger>
                {isGlobal && (
                  <TooltipContent>
                    <p>Global categories cannot be deleted</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </TooltipProvider>
        </TableCell>
      </TableRow>
      {expanded &&
        node.children.map((child) => (
          <CategoryRow
            key={child.id}
            node={child}
            depth={depth + 1}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
    </>
  );
};

const ProductCategoriesSettings = () => {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    parent_id: null as string | null,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await productService.getCategories();
      setCategories(data);
    } catch (error) {
      toast.error("Failed to load categories: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await productService.updateCategory(editingCategory.id, formData);
        toast.success("Category updated successfully");
      } else {
        await productService.createCategory(formData);
        toast.success("Category created successfully");
      }
      setIsDialogOpen(false);
      resetForm();
      loadCategories();
    } catch (error) {
      toast.error("Failed to save category: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleEdit = (category: ProductCategory) => {
    if (isGlobalCategory(category)) return;
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      parent_id: category.parent_id ?? null,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const categoryToDelete = categories.find((c) => c.id === id);
    if (!categoryToDelete || isGlobalCategory(categoryToDelete)) return;

    const hasChildren = categories.some((c) => c.parent_id === id);

    const confirmMsg = hasChildren
      ? "This category has subcategories. They will be moved up to the parent level. Are you sure?"
      : "Are you sure you want to delete this category? Products in this category will become uncategorized.";

    if (!confirm(confirmMsg)) return;

    try {
      if (hasChildren) {
        const children = categories.filter((c) => c.parent_id === id);
        for (const child of children) {
          await productService.updateCategory(child.id, {
            parent_id: categoryToDelete?.parent_id ?? null,
          });
        }
      }

      await productService.deleteCategory(id);
      toast.success("Category deleted successfully");
      loadCategories();
    } catch (error) {
      toast.error("Failed to delete category: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", parent_id: null });
    setEditingCategory(null);
  };

  const tree = useMemo(() => buildCategoryTree(categories), [categories]);
  const isSearching = searchQuery.trim().length > 0;

  const displayTree = useMemo(() => {
    if (!isSearching) return tree;
    return filterTree(tree, searchQuery.trim());
  }, [tree, searchQuery, isSearching]);

  const totalPages = Math.max(1, Math.ceil(displayTree.length / itemsPerPage));

  const paginatedTree = useMemo(
    () => displayTree.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [displayTree, currentPage, itemsPerPage]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Product Categories</h2>
          <p className="text-muted-foreground mt-1">
            Organize your products into categories
          </p>
        </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Categories
              </CardTitle>
              <CardDescription className="mt-1">
                Nest categories up to multi-levels deep. Global categories are read-only.
              </CardDescription>
            </div>

            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {isSearching && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Level</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Loading categories...
                  </TableCell>
                </TableRow>
              ) : paginatedTree.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    {isSearching
                      ? `No categories found for "${searchQuery}"`
                      : "No categories yet. Add your first category to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTree.map((node) => (
                  <CategoryRow
                    key={node.id}
                    node={node}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex justify-between items-center pt-4">
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
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

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
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Edit Category" : "Add New Category"}
              </DialogTitle>
              <DialogDescription>
                {editingCategory
                  ? "Update the category details below."
                  : "Create a new category for organizing products."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingCategory ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
    </div>
  );
};

export default ProductCategoriesSettings;
