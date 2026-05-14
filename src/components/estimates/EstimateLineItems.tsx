
import React from "react";
import { v4 as uuidv4 } from "uuid";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EstimateLineItem as EstimateLineItemType, EstimateDocument } from "@/types/estimate-items";
import EstimateLineItem from "./EstimateLineItem";
import { formatCurrency } from "@/utils/formatters";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

type EstimateForLineItems = Pick<EstimateDocument, 'notes' | 'terms' | 'taxRate'>;

interface EstimateLineItemsProps {
  lineItems: EstimateLineItemType[];
  onLineItemsChange: (lineItems: EstimateLineItemType[]) => void;
  estimate: EstimateForLineItems;
  setEstimate: (estimate: EstimateForLineItems) => void;
  taxRate: number;
  showTaxOption: boolean;
  enableTax: boolean;
  setEnableTax: (enable: boolean) => void;
}

const EstimateLineItems: React.FC<EstimateLineItemsProps> = ({
  lineItems,
  onLineItemsChange,
  estimate,
  setEstimate,
  taxRate,
  showTaxOption,
  enableTax,
  setEnableTax
}) => {
  const addLineItem = () => {
    const newItem: EstimateLineItemType = {
      id: uuidv4(),
      item: "",
      description: "",
      quantity: 1,
      rate: 0,
      total: 0,
      taxable: true
    };
    onLineItemsChange([...lineItems, newItem]);
  };

  const updateLineItem = (updatedItem: EstimateLineItemType) => {
    const updatedItems = lineItems.map(item =>
      item.id === updatedItem.id ? updatedItem : item
    );
    onLineItemsChange(updatedItems);
  };

  const deleteLineItem = (id: string) => {
    const updatedItems = lineItems.filter(item => item.id !== id);
    onLineItemsChange(updatedItems);
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const taxableAmount = lineItems
    .filter(item => item.taxable)
    .reduce((sum, item) => sum + item.total, 0);
  const taxAmount = taxableAmount * (taxRate / 100);
  const total = subtotal + taxAmount;

  return (
    <div className="space-y-4">
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-semibold">Estimate Items</CardTitle>
            <Button onClick={addLineItem} className="gap-1" size="sm">
              <Plus size={16} />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-2">
          {lineItems.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No items added to this estimate yet. Click "Add Item" to get started.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[3fr_4fr_1.2fr_1.8fr_1.5fr_0.5fr] gap-2 mb-2 text-sm font-semibold">
                <div>Item</div>
                <div>Description</div>
                <div className="text-center">Qty</div>
                <div className="text-right pr-4">Rate</div>
                <div className="text-right">Total</div>
                <div className="flex justify-center">
                  {showTaxOption ? "Tax" : ""}
                </div>
              </div>

              {lineItems.map(item => (
                <EstimateLineItem
                  key={item.id}
                  item={item}
                  onUpdate={updateLineItem}
                  onDelete={deleteLineItem}
                  showTaxOption={showTaxOption}
                />
              ))}

              <div className="border-t mt-4 pt-4 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="font-medium">Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>

                {showTaxOption && (
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">Tax ({taxRate}%):</span>
                    <span>{formatCurrency(taxAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-base font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quote Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="estimate-notes">Notes (Optional)</Label>
            <Textarea
              id="estimate-notes"
              placeholder="Add any notes or special instructions..."
              value={estimate.notes || ""}
              onChange={(e) => setEstimate({...estimate, notes: e.target.value})}
              className="h-20 resize-none"
            />
          </div>

          <div>
            <Label htmlFor="estimate-terms">Terms & Conditions</Label>
            <Textarea
              id="estimate-terms"
              placeholder="Enter terms and conditions..."
              value={estimate.terms || ""}
              onChange={(e) => setEstimate({...estimate, terms: e.target.value})}
              className="h-20 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 flex items-center">
              <Switch
                id="enable-tax"
                checked={enableTax}
                onCheckedChange={setEnableTax}
              />
              <Label htmlFor="enable-tax" className="mb-0 cursor-pointer">
                Enable Tax
              </Label>
            </div>

            {enableTax && (
              <div>
                <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                <Input
                  id="tax-rate"
                  type="number"
                  min={0}
                  step={0.01}
                  value={estimate.taxRate}
                  onChange={(e) => setEstimate({
                    ...estimate, 
                    taxRate: Number(e.target.value)
                  })}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EstimateLineItems;
