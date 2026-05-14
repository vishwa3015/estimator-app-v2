import { Session, User } from "@supabase/supabase-js";

// GHL API Types
export interface GHLCredentials {
  pit: string;
  companyId: string;
  apikey: string;
}

export interface AuthData {
  user: User;
  session: Session | null;
}

export interface GHLContact {
  id: string;
  name: string;
  contactName?: string;
  firstName?: string;
  lastName?: string;
  fullNameLowerCase?: string;
  email?: string;
  phone?: string;
  address?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  companyName?: string;
  location?: {
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  tags?: string[];
  user?: GHLUser;
  assignedTo?: string;
  locationId?: string;
  customField?: Array<{
    id: string;
    key?: string;
    value: string;
  }>;
}

export interface GHLUser {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  roles?: Record<string, string | boolean | string[]>;
  scopes?: string[];
}

export interface GHLOpportunity {
  id: string;
  name: string;
  value: number;
  monetaryValue?: number;
  status: string;
  contactId: string;
  contactName?: string;
  pipelineId?: string;
  stageId?: string;
  createdAt: string;
  updatedAt: string;
  contact?: GHLContact;
  user?: GHLUser;
  assignedTo?: string;
  pipelineName?: string;
  stageName?: string;
}

// Sales Person Types
export interface SalesPerson {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  paymentMethod: PaymentMethod;
  commissionRate: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'GrossProfit' | 'GrossSales';

// Cost Tracking Types
export type ExpenseType = 'Materials' | 'Labor' | 'Subcontractor' | 'Misc' | 'Commission' | 'Marketing';

export interface CostItem {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: ExpenseType;
  category?: string;
  notes?: string;
  salesPersonId?: string;
  paymentMethod?: PaymentMethod;
}

export interface JobCost {
  opportunityId: string;
  jobValue: number;
  costItems: CostItem[];
  totalCost: number;
  profit: number;
  marginPercent: number;
  lastUpdated: string;
  isJobValueManuallyModified?: boolean;
  jobValueManuallyModifiedDate?: string;
}

// Application State Types
export interface AppState {
  isConnected: boolean;
  credentials: GHLCredentials | null;
  opportunities: GHLOpportunity[];
  selectedOpportunity: GHLOpportunity | null;
  jobCosts: Record<string, JobCost>;
}
