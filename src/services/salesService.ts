
import { v4 as uuidv4 } from "uuid";
import { SalesPerson, PaymentMethod } from "@/types/ghl";

// In a real app, this would be connected to a backend
// For now, we'll use localStorage to persist data
export const salesService = {
  getAllSalesPeople: (): SalesPerson[] => {
    const storedSalesPeople = localStorage.getItem("ghl-sales-people");
    return storedSalesPeople ? JSON.parse(storedSalesPeople) : [];
  },

  saveSalesPeople: (salesPeople: SalesPerson[]): void => {
    localStorage.setItem("ghl-sales-people", JSON.stringify(salesPeople));
  },

  getSalesPersonById: (id: string): SalesPerson | null => {
    const allSalesPeople = salesService.getAllSalesPeople();
    return allSalesPeople.find(person => person.id === id) || null;
  },

  createSalesPerson: (name: string, email?: string, phone?: string, paymentMethod: PaymentMethod = 'GrossProfit', commissionRate: number = 10): SalesPerson => {
    const allSalesPeople = salesService.getAllSalesPeople();
    
    const newSalesPerson: SalesPerson = {
      id: uuidv4(),
      name,
      email,
      phone,
      paymentMethod,
      commissionRate,
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    allSalesPeople.push(newSalesPerson);
    salesService.saveSalesPeople(allSalesPeople);
    
    return newSalesPerson;
  },

  updateSalesPerson: (person: SalesPerson): SalesPerson => {
    const allSalesPeople = salesService.getAllSalesPeople();
    const index = allSalesPeople.findIndex(p => p.id === person.id);
    
    if (index === -1) {
      throw new Error("Sales person not found");
    }
    
    person.updatedAt = new Date().toISOString();
    allSalesPeople[index] = person;
    
    salesService.saveSalesPeople(allSalesPeople);
    return person;
  },

  deleteSalesPerson: (id: string): void => {
    const allSalesPeople = salesService.getAllSalesPeople();
    const filteredPeople = allSalesPeople.filter(person => person.id !== id);
    
    salesService.saveSalesPeople(filteredPeople);
  }
};
