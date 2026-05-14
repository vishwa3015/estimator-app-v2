
// Custom database type definitions
export interface EstimateItem {
  id: string;
  location_id: string;
  opportunity_id: string;
  description: string;
  amount: number;
  type: string;
  category?: string;
  notes?: string;
  sales_person_id?: string;
  payment_method?: string;
  created_at: string;
  created_by?: string;
}

export interface FinancialReportView {
  opportunity_id: string;
  created_at: string;
  expense_item_count?: number;
  total_expenses?: number;
  expenses_by_type?: Record<string, number>;
  id?: string;
  location_id?: string;
  description?: string;
  amount?: number;
  type?: string;
  category?: string;
  notes?: string;
  payment_method?: string;
  sales_person_id?: string;
  created_by?: string;
  date?: string;
}
