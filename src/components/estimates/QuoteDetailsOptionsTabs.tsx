
import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EstimateDocument, EstimateLineItem, PricingOption } from "@/types/estimate-items";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import EstimateLineItems from "./EstimateLineItems";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/currency";

interface QuoteDetailsOptionsTabsProps {
  options: PricingOption[];
  onOptionsChange: (options: PricingOption[]) => void;
}

const defaultTabLabels = ["Option 1", "Option 2", "Option 3"];

const QuoteDetailsOptionsTabs: React.FC<QuoteDetailsOptionsTabsProps> = ({
  options,
  onOptionsChange,
}) => {
  const [tab, setTab] = React.useState(options[0]?.id ?? "option-1");

  // Update line items etc for current tab
  const handleLineItemsChange = (updatedItems: EstimateLineItem[]) => {
    onOptionsChange(
      options.map(opt =>
        opt.id === tab
          ? {
              ...opt,
              lineItems: updatedItems,
              subtotal: updatedItems.reduce((sum, i) => sum + i.total, 0),
              costTotal: updatedItems.reduce((sum, i) => sum + (i.rate * i.quantity), 0),
              profitMargin:
                updatedItems.reduce((sum, i) => sum + i.total, 0) > 0
                  ? ((updatedItems.reduce((sum, i) => sum + i.total, 0) -
                    updatedItems.reduce((sum, i) => sum + (i.rate * i.quantity), 0)
                  ) / updatedItems.reduce((sum, i) => sum + i.total, 0)) * 100
                  : 0
            }
          : opt
      )
    );
  };

  const handleInputChange = (field: keyof PricingOption, value: number) => {
    onOptionsChange(
      options.map(opt =>
        opt.id === tab
          ? { ...opt, [field]: value }
          : opt
      )
    );
  };
  
  // Handle updating tab label
  const handleLabelChange = (value: string) => {
    onOptionsChange(
      options.map(opt =>
        opt.id === tab
          ? { ...opt, label: value }
          : opt
      )
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Pricing Options</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4">
            {options.map((opt, i) => (
              <TabsTrigger key={opt.id} value={opt.id} className="w-32">
                {opt.label || defaultTabLabels[i]}
              </TabsTrigger>
            ))}
          </TabsList>
          {options.map((opt, idx) => (
            <TabsContent key={opt.id} value={opt.id}>
              <div className="space-y-6">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <Label htmlFor={`option-label-${opt.id}`}>Option Name</Label>
                    <Input
                      id={`option-label-${opt.id}`}
                      value={opt.label || defaultTabLabels[idx]}
                      onChange={e => handleLabelChange(e.target.value)}
                      placeholder="Option name"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <Label className="mb-1 inline-block">Profit Margin (%)</Label>
                  <Input
                    type="number"
                    value={opt.profitMargin}
                    min={0}
                    max={100}
                    onChange={e =>
                      handleInputChange("profitMargin", Number(e.target.value))
                    }
                    className="w-40"
                  />
                </div>
                
                <EstimateLineItems
                  lineItems={opt.lineItems}
                  onLineItemsChange={handleLineItemsChange}
                  estimate={{
                    ...opt,
                    notes: "",
                    terms: "",
                    taxRate: opt.taxRate,
                  }}
                  setEstimate={() => {}}
                  taxRate={opt.taxRate}
                  showTaxOption={true}
                  enableTax={true}
                  setEnableTax={() => {}}
                />

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label>Cost Total</Label>
                    <Input
                      type="number"
                      value={opt.costTotal}
                      min={0}
                      onChange={e =>
                        handleInputChange("costTotal", Number(e.target.value))
                      }
                    />
                  </div>
                  <div>
                    <Label>Total Revenue</Label>
                    <div className="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm flex items-center">
                      {formatCurrency(opt.subtotal)}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default QuoteDetailsOptionsTabs;

