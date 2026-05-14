
import { useState, useEffect } from "react";
import { CostItem } from "@/types/ghl";
import { costService } from "@/services/costs";

export const usePresetItems = (jobValue: number, isPresetsDialogOpen: boolean) => {
  const [presetItems, setPresetItems] = useState<Array<CostItem & { selected: boolean }>>([]);
  const [selectAllPresets, setSelectAllPresets] = useState(true);

  useEffect(() => {
    if (isPresetsDialogOpen) {
      const items = costService.getPresetItems(jobValue).map(item => ({
        ...item,
        selected: selectAllPresets
      }));
      setPresetItems(items);
    }
  }, [isPresetsDialogOpen, jobValue, selectAllPresets]);

  const handleToggleAllPresets = () => {
    const newSelectAll = !selectAllPresets;
    setSelectAllPresets(newSelectAll);
    setPresetItems(presetItems.map(item => ({
      ...item,
      selected: newSelectAll
    })));
  };

  const handleTogglePresetItem = (itemId: string) => {
    const updatedItems = presetItems.map(item => 
      item.id === itemId ? { ...item, selected: !item.selected } : item
    );
    setPresetItems(updatedItems);
    setSelectAllPresets(updatedItems.every(item => item.selected));
  };

  return {
    presetItems,
    selectAllPresets,
    handleToggleAllPresets,
    handleTogglePresetItem,
    setPresetItems,
    setSelectAllPresets
  };
};
