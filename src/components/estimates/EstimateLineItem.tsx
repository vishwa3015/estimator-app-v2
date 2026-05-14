
import React from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { EstimateLineItem as EstimateLineItemType } from "@/types/estimate-items";
import { formatCurrency } from "@/utils/formatters";

interface EstimateLineItemProps {
  item: EstimateLineItemType;
  onUpdate: (updatedItem: EstimateLineItemType) => void;
  onDelete: (id: string) => void;
  showTaxOption: boolean;
}

const EstimateLineItem: React.FC<EstimateLineItemProps> = ({
  item,
  onUpdate,
  onDelete,
  showTaxOption
}) => {
  const handleChange = (field: keyof EstimateLineItemType, value: EstimateLineItemType[keyof EstimateLineItemType]) => {
    const updatedItem = { ...item, [field]: value };
    
    // Recalculate total when quantity or rate changes
    if (field === 'quantity' || field === 'rate') {
      const quantity = field === 'quantity' ? Number(value) : item.quantity;
      const rate = field === 'rate' ? Number(value) : item.rate;
      updatedItem.total = quantity * rate;
    }
    
    onUpdate(updatedItem);
  };

  return (
    <div className="grid grid-cols-[3fr_4fr_1.2fr_1.8fr_1.5fr_0.5fr] gap-2 mb-2 items-center">
      <div>
        <Input
          value={item.item}
          onChange={(e) => handleChange('item', e.target.value)}
          placeholder="Item"
          className="w-full"
        />
      </div>
      <div>
        <Input
          value={item.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Description"
          className="w-full"
        />
      </div>
      <div>
        <Input
          type="number"
          value={item.quantity}
          onChange={(e) => handleChange('quantity', Number(e.target.value))}
          placeholder="Qty"
          className="w-full text-center"
          min={0}
          step={1}
        />
      </div>
      <div>
        <Input
          type="number"
          value={item.rate}
          onChange={(e) => handleChange('rate', Number(e.target.value))}
          placeholder="Rate"
          className="w-full text-right"
          min={0}
          step={0.01}
        />
      </div>
      <div className="text-right">
        <span className="font-medium">{formatCurrency(item.total)}</span>
      </div>
      <div className="flex items-center justify-center">
        {showTaxOption ? (
          <Checkbox
            id={`taxable-${item.id}`}
            checked={item.taxable}
            onCheckedChange={(checked) => handleChange('taxable', !!checked)}
            className="mr-1"
          />
        ) : null}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(item.id)}
          className="h-8 w-8 text-destructive"
        >
          <Trash2 size={16} />
        </Button>
      </div>
    </div>
  );
};

export default EstimateLineItem;
