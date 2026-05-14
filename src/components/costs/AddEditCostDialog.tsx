
import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { CircleAlert, Percent } from "lucide-react";
import { CostItem, ExpenseType, PaymentMethod } from "@/types/ghl";
import SalesPersonSelector from "@/components/sales/SalesPersonSelector";
import { EXPENSE_TYPES, TYPE_ICONS } from './costUtils';
import { toast } from "sonner";

interface AddEditCostDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (costItem: Omit<CostItem, "id"> | CostItem) => void;
  editingItem?: CostItem;
  jobValue: number;
  formatCurrency: (amount: number) => string;
}

const AddEditCostDialog: React.FC<AddEditCostDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  editingItem,
  jobValue,
  formatCurrency,
}) => {
  const [showTypeValidation, setShowTypeValidation] = useState(false);
  const [isEditingPercentage, setIsEditingPercentage] = useState(false);
  const [editingPercentage, setEditingPercentage] = useState(10);
  
  const [formData, setFormData] = useState<{
    description: string;
    amount: string;
    notes: string;
    type: ExpenseType | "";
    isPercentage: boolean;
    percentage: number;
    salesPersonId?: string;
    paymentMethod?: PaymentMethod;
  }>({
    description: "",
    amount: "",
    notes: "",
    type: "",
    isPercentage: false,
    percentage: 10,
    salesPersonId: undefined,
    paymentMethod: undefined
  });

  useEffect(() => {
    if (editingItem) {
      const percentageMatch = editingItem.notes?.match(/\((\d+(\.\d+)?)% of job value\)/);
      setIsEditingPercentage(!!percentageMatch);
      if (percentageMatch) {
        setEditingPercentage(parseFloat(percentageMatch[1]));
      }
      
      setFormData({
        description: editingItem.description,
        amount: editingItem.amount.toString(),
        notes: editingItem.notes?.replace(/\((\d+(\.\d+)?)% of job value\)/g, "") || "",
        type: editingItem.type,
        isPercentage: !!percentageMatch,
        percentage: percentageMatch ? parseFloat(percentageMatch[1]) : 10,
        salesPersonId: editingItem.salesPersonId,
        paymentMethod: editingItem.paymentMethod
      });
    } else {
      // Reset form data when opening to add a new item
      setFormData({
        description: "",
        amount: "",
        notes: "",
        type: "",
        isPercentage: false,
        percentage: 10,
        salesPersonId: undefined,
        paymentMethod: undefined
      });
      setIsEditingPercentage(false);
      setEditingPercentage(10);
    }
  }, [editingItem, isOpen]);

  useEffect(() => {
    if (formData.isPercentage) {
      const calculatedAmount = (jobValue * formData.percentage / 100).toFixed(2);
      setFormData(prev => ({
        ...prev,
        amount: calculatedAmount
      }));
    }
  }, [formData.percentage, formData.isPercentage, jobValue]);

  const handleSave = () => {
    if (!formData.type) {
      setShowTypeValidation(true);
      return;
    }

    if (formData.type === 'Commission' && !formData.salesPersonId) {
      toast("Please select a sales person for commission", {
        description: "A sales person must be selected for commission costs."
      });
      return;
    }

    const amount = parseFloat(formData.amount);
    if (!formData.description || isNaN(amount) || amount < 0) {
      toast("Invalid form data", {
        description: "Please ensure all required fields are filled correctly."
      });
      return;
    }

    const finalNotes = formData.notes + (formData.isPercentage ? ` (${formData.percentage}% of job value)` : "");
    
    const newItem = {
      ...(editingItem ? { id: editingItem.id } : {}),
      description: formData.description,
      amount,
      type: formData.type,
      notes: finalNotes,
      date: editingItem?.date || new Date().toISOString(),
      salesPersonId: formData.salesPersonId,
      paymentMethod: formData.paymentMethod
    };

    try {
      onSave(newItem);
      onClose();
    } catch (error) {
      console.error('Error saving cost item:', error);
      toast("Error saving cost item", {
        description: "There was an error saving your cost item. Please try again."
      });
    }
  };

  const handleSalesPersonSelect = (personId: string, paymentMethod: PaymentMethod) => {
    setFormData(prev => ({
      ...prev,
      salesPersonId: personId,
      paymentMethod: paymentMethod
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingItem ? 'Edit' : 'Add'} Cost Item</DialogTitle>
          <DialogDescription>
            {editingItem ? 'Update the details of this cost item.' : 'Add a new cost item to track expenses for this job.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="type" className="flex items-center">
                Expense Type 
                {showTypeValidation && (
                  <CircleAlert className="h-4 w-4 text-destructive ml-2" />
                )}
              </Label>
            </div>
            <Select
              value={formData.type}
              onValueChange={(value: ExpenseType) => {
                setFormData(prev => ({...prev, type: value}));
                setShowTypeValidation(false);
              }}
            >
              <SelectTrigger className={showTypeValidation ? "border-2 border-destructive" : ""}>
                <SelectValue placeholder={showTypeValidation ? "Please select a type" : "Select expense type"} />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    <div className="flex items-center">
                      <span className="mr-2">{TYPE_ICONS[type]}</span>
                      {type}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showTypeValidation && (
              <p className="text-xs text-destructive mt-1">
                Please select an expense type to continue
              </p>
            )}
          </div>

          {formData.type && (
            <>
              {formData.type === 'Commission' ? (
                <div className="space-y-2">
                  <SalesPersonSelector
                    selectedPersonId={formData.salesPersonId}
                    paymentMethod={formData.paymentMethod}
                    onSelectPerson={handleSalesPersonSelect}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Enter description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Label htmlFor="isPercentage" className="flex items-center space-x-2 cursor-pointer">
                  <span>Calculate as percentage of job value</span>
                  <Switch
                    id="isPercentage"
                    checked={formData.isPercentage}
                    onCheckedChange={(checked) => setFormData(prev => ({...prev, isPercentage: checked}))}
                  />
                </Label>
              </div>

              {formData.isPercentage ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="percentage">Percentage (%)</Label>
                    <span className="text-sm font-medium">{formData.percentage}%</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Percent className="h-4 w-4 text-muted-foreground" />
                    <Slider
                      id="percentage"
                      value={[formData.percentage]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={(value) => setFormData(prev => ({...prev, percentage: value[0]}))}
                      className="flex-1"
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Amount: {formatCurrency(parseFloat(formData.amount) || 0)}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({...prev, amount: e.target.value}))}
                    className="number-input"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({...prev, notes: e.target.value}))}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>{editingItem ? 'Update' : 'Add'} Cost Item</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddEditCostDialog;
