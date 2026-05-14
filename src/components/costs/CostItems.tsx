import React, { useState } from "react";
import { CostItem, JobCost } from "@/types/ghl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import AddEditCostDialog from "./AddEditCostDialog";
import PresetItemsDialog from "./PresetItemsDialog";
import CostItemTable from "./CostItemTable";
import CostItemsHeader from "./CostItemsHeader";
import CostItemsLoading from "./CostItemsLoading";
import { usePresetItems } from "@/hooks/use-preset-items";
import { useCostItems } from "@/hooks/use-cost-items";
import { costService } from "@/services/costs";
import { formatCurrency } from "@/utils/currency";

interface CostItemsProps {
  jobCost: JobCost;
  onAddCostItem: (costItem: Omit<CostItem, "id">) => void;
  onUpdateCostItem: (costItem: CostItem) => void;
  onDeleteCostItem: (costItemId: string) => void;
  isLoading?: boolean;
}

const CostItems: React.FC<CostItemsProps> = ({
  jobCost,
  onAddCostItem,
  onUpdateCostItem,
  onDeleteCostItem,
  isLoading = false
}) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isPresetsDialogOpen, setIsPresetsDialogOpen] = useState(false);
  const [editingCostItem, setEditingCostItem] = useState<CostItem | null>(null);

  const {
    presetItems,
    selectAllPresets,
    handleToggleAllPresets,
    handleTogglePresetItem
  } = usePresetItems(jobCost.jobValue, isPresetsDialogOpen);

  const {
    localIsLoading,
    handleCostItemOperation,
    getSalesPersonName
  } = useCostItems();

  const handleAddCostItem = (item: Omit<CostItem, "id">) => {
    handleCostItemOperation(
      async () => await onAddCostItem(item),
      "Cost item added successfully"
    );
    setIsAddDialogOpen(false);
  };

  const handleUpdateCostItem = (item: CostItem) => {
    handleCostItemOperation(
      async () => await onUpdateCostItem(item),
      "Cost item updated successfully"
    );
    setEditingCostItem(null);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CostItemsHeader
          onAddClick={() => setIsAddDialogOpen(true)}
          onPresetsClick={() => setIsPresetsDialogOpen(true)}
          isLoading={isLoading}
          localIsLoading={localIsLoading}
        />
      </CardHeader>
      <CardContent>
        {(isLoading || localIsLoading) ? (
          <CostItemsLoading />
        ) : (
          <div className="overflow-x-auto">
            <CostItemTable
              costItems={jobCost.costItems}
              onEditItem={setEditingCostItem}
              onDeleteItem={(itemId) => {
                handleCostItemOperation(
                  async () => await onDeleteCostItem(itemId),
                  "Cost item deleted successfully"
                );
              }}
              getSalesPersonName={getSalesPersonName}
              formatCurrency={formatCurrency}
            />
          </div>
        )}
      </CardContent>

      <AddEditCostDialog
        isOpen={isAddDialogOpen || !!editingCostItem}
        onClose={() => {
          setIsAddDialogOpen(false);
          setEditingCostItem(null);
        }}
        onSave={(item) => {
          if ('id' in item) {
            handleUpdateCostItem(item as CostItem);
          } else {
            handleAddCostItem(item);
          }
        }}
        editingItem={editingCostItem}
        jobValue={jobCost.jobValue}
        formatCurrency={formatCurrency}
      />

      <PresetItemsDialog
        isOpen={isPresetsDialogOpen}
        onClose={() => setIsPresetsDialogOpen(false)}
        onApply={async () => {
          const selectedPresetIds = presetItems
            .filter(item => item.selected)
            .map(item => item.id);
          handleCostItemOperation(
            async () => {
              await costService.applyPresets(jobCost.opportunityId, selectedPresetIds);
            },
            "Selected preset cost items have been applied successfully"
          );
          setIsPresetsDialogOpen(false);
        }}
        presetItems={presetItems}
        selectAllPresets={selectAllPresets}
        onToggleAllPresets={handleToggleAllPresets}
        onTogglePresetItem={handleTogglePresetItem}
        getSalesPersonName={getSalesPersonName}
        formatCurrency={formatCurrency}
      />
    </Card>
  );
};

export default CostItems;
