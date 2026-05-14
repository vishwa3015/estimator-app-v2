
import { useState, useEffect } from "react";
import { salesService } from "@/services/salesService";
import { setLocationContext } from "@/hooks/use-location-context";
import { toast } from "@/hooks/use-toast";

export const useCostItems = () => {
  const [salesPeople, setSalesPeople] = useState([]);
  const [localIsLoading, setLocalIsLoading] = useState(false);

  useEffect(() => {
    const people = salesService.getAllSalesPeople();
    setSalesPeople(people);
  }, []);

  useEffect(() => {
    const setInitialContext = async () => {
      try {
        const credentials = localStorage.getItem("smartroofing_credentials");
        if (!credentials) return;
        
        const { companyId: locationId } = JSON.parse(credentials);
        console.log('Setting initial location context in CostItemList:', locationId);
        await setLocationContext(locationId);
      } catch (error) {
        console.error('Error setting initial location context in CostItemList:', error);
      }
    };
    
    setInitialContext();
  }, []);

  const handleCostItemOperation = async (operation: () => Promise<void>, successMessage: string) => {
    setLocalIsLoading(true);
    try {
      const credentials = localStorage.getItem("smartroofing_credentials");
      if (!credentials) {
        throw new Error("No credentials found");
      }
      
      const { companyId: locationId } = JSON.parse(credentials);
      await setLocationContext(locationId);
      
      await operation();
      toast({
        title: "Success",
        description: successMessage
      });
    } catch (error) {
      console.error("Error performing operation:", error);
      toast({
        title: "Error",
        description: "Operation failed. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLocalIsLoading(false);
    }
  };

  const getSalesPersonName = (id?: string) => {
    if (!id) return 'None';
    const person = salesPeople.find(p => p.id === id);
    return person ? person.name : 'Unknown';
  };

  return {
    salesPeople,
    localIsLoading,
    handleCostItemOperation,
    getSalesPersonName
  };
};
