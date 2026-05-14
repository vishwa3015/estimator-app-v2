
import { useState, useEffect } from "react";
import { SalesPerson, PaymentMethod } from "@/types/ghl";
import { salesService } from "@/services/salesService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, User } from "lucide-react";

interface SalesPersonSelectorProps {
  selectedPersonId?: string;
  paymentMethod?: PaymentMethod;
  onSelectPerson: (personId: string, paymentMethod: PaymentMethod) => void;
}

const SalesPersonSelector = ({ 
  selectedPersonId, 
  paymentMethod = 'GrossProfit',
  onSelectPerson 
}: SalesPersonSelectorProps) => {
  const [salesPeople, setSalesPeople] = useState<SalesPerson[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(paymentMethod);
  const [newSalesPersonDialogOpen, setNewSalesPersonDialogOpen] = useState(false);
  const [newSalesPerson, setNewSalesPerson] = useState({
    name: "",
    email: "",
    phone: "",
    paymentMethod: 'GrossProfit' as PaymentMethod,
    commissionRate: 10
  });

  useEffect(() => {
    // Load sales people from service
    const people = salesService.getAllSalesPeople();
    setSalesPeople(people);
  }, []);

  useEffect(() => {
    if (paymentMethod) {
      setSelectedMethod(paymentMethod);
    }
  }, [paymentMethod]);

  const handleSelectPerson = (personId: string) => {
    onSelectPerson(personId, selectedMethod);
  };

  const handlePaymentMethodChange = (value: PaymentMethod) => {
    setSelectedMethod(value);
    if (selectedPersonId) {
      onSelectPerson(selectedPersonId, value);
    }
  };

  const handleAddSalesPerson = () => {
    if (!newSalesPerson.name.trim()) return;

    const created = salesService.createSalesPerson(
      newSalesPerson.name,
      newSalesPerson.email,
      newSalesPerson.phone,
      newSalesPerson.paymentMethod,
      newSalesPerson.commissionRate
    );

    setSalesPeople(prev => [...prev, created]);
    setNewSalesPersonDialogOpen(false);
    onSelectPerson(created.id, created.paymentMethod);

    // Reset form
    setNewSalesPerson({
      name: "",
      email: "",
      phone: "",
      paymentMethod: 'GrossProfit',
      commissionRate: 10
    });
  };

  const getSelectedPersonName = () => {
    if (!selectedPersonId) return undefined;
    const person = salesPeople.find(p => p.id === selectedPersonId);
    return person ? person.name : undefined;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Sales Person</Label>
          <div className="flex gap-2">
            <Select 
              value={selectedPersonId} 
              onValueChange={handleSelectPerson}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select sales person" />
              </SelectTrigger>
              <SelectContent>
                {salesPeople.map(person => (
                  <SelectItem key={person.id} value={person.id}>
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      {person.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Dialog open={newSalesPersonDialogOpen} onOpenChange={setNewSalesPersonDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Sales Person</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name*</Label>
                    <Input
                      id="name"
                      value={newSalesPerson.name}
                      onChange={(e) => setNewSalesPerson({...newSalesPerson, name: e.target.value})}
                      placeholder="Sales Person Name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (Optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newSalesPerson.email}
                      onChange={(e) => setNewSalesPerson({...newSalesPerson, email: e.target.value})}
                      placeholder="email@example.com"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone (Optional)</Label>
                    <Input
                      id="phone"
                      value={newSalesPerson.phone}
                      onChange={(e) => setNewSalesPerson({...newSalesPerson, phone: e.target.value})}
                      placeholder="(123) 456-7890"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select
                      value={newSalesPerson.paymentMethod}
                      onValueChange={(value: PaymentMethod) => 
                        setNewSalesPerson({...newSalesPerson, paymentMethod: value})
                      }
                    >
                      <SelectTrigger id="paymentMethod">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GrossProfit">Gross Profit</SelectItem>
                        <SelectItem value="GrossSales">Gross Sales</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="commissionRate">Default Commission Rate (%)</Label>
                    <Input
                      id="commissionRate"
                      type="number"
                      min="0"
                      max="100"
                      value={newSalesPerson.commissionRate}
                      onChange={(e) => setNewSalesPerson({
                        ...newSalesPerson, 
                        commissionRate: Number(e.target.value)
                      })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setNewSalesPersonDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAddSalesPerson}>Add Person</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {selectedPersonId && (
          <div className="space-y-2">
            <Label>Payment Calculation Method</Label>
            <RadioGroup 
              value={selectedMethod}
              onValueChange={(value: PaymentMethod) => handlePaymentMethodChange(value)}
              className="flex flex-col gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="GrossProfit" id="gross-profit" />
                <Label htmlFor="gross-profit">Pay from Gross Profit</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="GrossSales" id="gross-sales" />
                <Label htmlFor="gross-sales">Pay from Gross Sales</Label>
              </div>
            </RadioGroup>
          </div>
        )}
      </div>

      {selectedPersonId && (
        <div className="text-sm text-muted-foreground">
          {`${getSelectedPersonName()} will be paid commission based on ${
            selectedMethod === 'GrossProfit' ? 'Gross Profit' : 'Gross Sales'
          }`}
        </div>
      )}
    </div>
  );
};

export default SalesPersonSelector;
