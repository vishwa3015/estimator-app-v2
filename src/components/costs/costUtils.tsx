
import React from 'react';
import { Hammer, Users, Briefcase, CircleDot, DollarSign, Megaphone } from "lucide-react";
import { ExpenseType } from "@/types/ghl";

export const EXPENSE_TYPES: ExpenseType[] = [
  'Materials',
  'Labor',
  'Subcontractor',
  'Misc',
  'Commission',
  'Marketing'
];

export const TYPE_ICONS: Record<ExpenseType, React.ReactNode> = {
  'Materials': <Hammer className="h-4 w-4" />,
  'Labor': <Users className="h-4 w-4" />,
  'Subcontractor': <Briefcase className="h-4 w-4" />,
  'Misc': <CircleDot className="h-4 w-4" />,
  'Commission': <DollarSign className="h-4 w-4" />,
  'Marketing': <Megaphone className="h-4 w-4" />
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};
