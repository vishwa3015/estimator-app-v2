import { FileText, BookOpen, ClipboardCheck, DollarSign, Shield, FileCheck, Settings, Plus } from "lucide-react";
import { ComponentType } from "react";

export const SECTION_CONFIGS = [
  { id: 'details', label: 'Details', icon: FileText, allowLogo: true, type: 'details' as const, includeInPdf: true },
  { id: 'introduction', label: 'Introduction', icon: BookOpen, allowLogo: true, type: 'introduction' as const, includeInPdf: true },
  { id: 'inspection', label: 'Inspection', icon: ClipboardCheck, allowLogo: false, type: 'inspection' as const, includeInPdf: true },
  { id: 'quoteDetails', label: 'Quote Details', icon: DollarSign, allowLogo: false, type: 'quoteDetails' as const, includeInPdf: true },
  { id: 'authorizationPage', label: 'Authorization Page', icon: Shield, allowLogo: false, type: 'authorizationPage' as const, includeInPdf: true },
  { id: 'warranty', label: 'Warranty', icon: FileCheck, allowLogo: false, type: 'warranty' as const, includeInPdf: true }
] as const;

export type SectionType = typeof SECTION_CONFIGS[number]['type'] | 'custom';

export interface SectionConfig {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  allowLogo: boolean;
  type: SectionType;
  includeInPdf: boolean;
}
