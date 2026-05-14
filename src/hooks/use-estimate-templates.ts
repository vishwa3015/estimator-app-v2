
import { useState } from 'react';
import { EstimateTemplate } from '@/types/estimate-items';

export const useEstimateTemplates = () => {
  const [templates] = useState<EstimateTemplate[]>([
    {
      id: "default",
      name: "Default Template",
      taxRate: 8.25,
      createdAt: new Date().toISOString()
    },
    {
      id: "professional",
      name: "Professional Template",
      logoUrl: "/placeholder.svg",
      headerHtml: "<h1>Professional Estimate</h1>",
      footerHtml: "<p>Thank you for your business!</p>",
      terms: "Payment due within 30 days.",
      taxRate: 8.25,
      createdAt: new Date().toISOString()
    }
  ]);

  return { templates };
};
