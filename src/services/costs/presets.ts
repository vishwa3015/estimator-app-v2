
import { CostItem, ExpenseType } from "@/types/ghl";
import { v4 as uuidv4 } from "uuid";

interface PresetGenerator {
  getPresetItems: (jobValue: number) => CostItem[];
}

export const presetGenerator: PresetGenerator = {
  getPresetItems: (jobValue: number): CostItem[] => {
    const currentDate = new Date().toISOString();
    
    return [
      {
        id: "overhead",
        description: "Overhead Expenses",
        amount: jobValue * 0.06,
        date: currentDate,
        type: "Misc" as ExpenseType,
        notes: "General overhead costs (6% of job value)"
      },
      {
        id: "profit",
        description: "Profit Margin",
        amount: 0,
        date: currentDate,
        type: "Misc" as ExpenseType,
        notes: "Profit margin (15% of job value)"
      },
      {
        id: "project-manager",
        description: "Project Manager",
        amount: 200,
        date: currentDate,
        type: "Labor" as ExpenseType,
        notes: "Project management costs"
      },
      {
        id: "dump-fee",
        description: "Dump Fee",
        amount: 0,
        date: currentDate,
        type: "Misc" as ExpenseType,
        notes: "Waste disposal fees"
      },
      {
        id: "roof-measurement",
        description: "Roof Measurement Report",
        amount: 28,
        date: currentDate,
        type: "Misc" as ExpenseType,
        notes: "Professional roof measurement and assessment"
      },
      {
        id: "materials",
        description: "Material Costs",
        amount: 0,
        date: currentDate,
        type: "Materials" as ExpenseType,
        notes: "Primary materials (30% of job value)"
      },
      {
        id: "labor",
        description: "Labor Costs",
        amount: 0,
        date: currentDate,
        type: "Labor" as ExpenseType,
        notes: "Labor for installation/construction (25% of job value)"
      },
      {
        id: "equipment",
        description: "Equipment Costs",
        amount: 0,
        date: currentDate,
        type: "Misc" as ExpenseType,
        notes: "Equipment rental and usage"
      },
      {
        id: "disposal",
        description: "Disposal Costs",
        amount: 0,
        date: currentDate,
        type: "Misc" as ExpenseType,
        notes: "Material disposal and cleanup"
      },
      {
        id: "unexpected",
        description: "Hidden/Unexpected Costs",
        amount: 0,
        date: currentDate,
        type: "Misc" as ExpenseType,
        notes: "Contingency for unexpected issues (5% of job value)"
      },
      {
        id: "additional-services",
        description: "Additional Services Costs",
        amount: 0,
        date: currentDate,
        type: "Misc" as ExpenseType,
        notes: "Placeholder for additional services"
      },
      {
        id: "change-orders",
        description: "Change Orders",
        amount: 0,
        date: currentDate,
        type: "Misc" as ExpenseType,
        notes: "Placeholder for future change orders"
      },
      {
        id: "structural-repairs",
        description: "Structural repairs",
        amount: 0,
        date: currentDate,
        type: "Misc" as ExpenseType,
        notes: "Placeholder for structural repairs if needed"
      },
      {
        id: "gutters",
        description: "Gutters",
        amount: 0,
        date: currentDate,
        type: "Materials" as ExpenseType,
        notes: "Placeholder for gutter costs if needed"
      },
      {
        id: "skylight",
        description: "Skylight",
        amount: 0,
        date: currentDate,
        type: "Materials" as ExpenseType,
        notes: "Placeholder for skylight costs if needed"
      },
      {
        id: "customer-acquisition",
        description: "Customer Acquisition Costs",
        amount: 0,
        date: currentDate,
        type: "Marketing" as ExpenseType,
        notes: "Sales and marketing expenses (8% of job value)"
      }
    ];
  }
};
