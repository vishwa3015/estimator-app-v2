
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CostItem } from "@/types/ghl";
import { Check } from "lucide-react";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PresetItemsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  presetItems: Array<CostItem & { selected: boolean }>;
  selectAllPresets: boolean;
  onToggleAllPresets: () => void;
  onTogglePresetItem: (itemId: string) => void;
  getSalesPersonName: (id?: string) => string;
  formatCurrency: (amount: number) => string;
}

const PresetItemsDialog: React.FC<PresetItemsDialogProps> = ({
  isOpen,
  onClose,
  onApply,
  presetItems,
  selectAllPresets,
  onToggleAllPresets,
  onTogglePresetItem,
  getSalesPersonName,
  formatCurrency,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Apply Preset Cost Items</DialogTitle>
          <DialogDescription>
            Select the preset cost items you want to add to your job.
          </DialogDescription>
        </DialogHeader>
        
        <div className="px-6 py-2">
          <div className="flex items-center space-x-2 mb-4">
            <Checkbox
              id="select-all"
              checked={selectAllPresets}
              onCheckedChange={onToggleAllPresets}
            />
            <Label
              htmlFor="select-all"
              className="font-medium cursor-pointer text-sm"
            >
              Select All Items
            </Label>
          </div>
        </div>
        
        <ScrollArea className="h-[50vh] px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Select</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {presetItems.map((item) => (
                <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onTogglePresetItem(item.id)}>
                  <TableCell>
                    <Checkbox
                      checked={item.selected}
                      onCheckedChange={() => onTogglePresetItem(item.id)}
                      className="data-[state=checked]:bg-primary"
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>
                      {item.description}
                      {item.notes && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {item.notes}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{item.type}</TableCell>
                  <TableCell>{formatCurrency(item.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
        
        <DialogFooter className="p-6 pt-4">
          <div className="flex w-full items-center justify-between sm:justify-end sm:space-x-2">
            <div className="text-sm text-muted-foreground mr-auto">
              {presetItems.filter(item => item.selected).length} of {presetItems.length} items selected
            </div>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={onApply}>Apply Selected</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PresetItemsDialog;
