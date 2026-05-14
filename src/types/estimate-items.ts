export interface EstimateLineItem {
  id: string;
  item: string;
  description: string;
  quantity: number;
  rate: number;
  total: number;
  taxable: boolean;
}

export interface EstimateTemplate {
  id: string;
  name: string;
  primaryImageUrl?: string;
  certificationLogoUrl?: string;
  contactInfo?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  logoUrl?: string;
  headerHtml?: string;
  footerHtml?: string;
  terms?: string;
  taxRate: number;
  createdAt: string;
  sections?: {
    introduction?: boolean;
    roofComponents?: boolean;
    topReasonsCertainteed?: boolean;
    inspection?: boolean;
    quoteDetails?: boolean;
    authorizationPage?: boolean;
    warranty?: boolean;
    termsAndConditions?: boolean;
    landmarkProMaxDef?: boolean;
    ctWarranty?: boolean;
    ctAlgaeWarranty?: boolean;
    termsAndConditions2?: boolean;
    workmanshipWarranty?: boolean;
    coi?: boolean;
    financingOptions?: boolean;
  };
  sectionPdfs?: {
    [key: string]: string;
  };
}

export interface PricingOption {
  id: string;
  label: string;
  lineItems: EstimateLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  profitMargin: number;
  costTotal: number;
}

export interface EstimateDocument {
  id: string;
  opportunityId: string;
  contactId?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  title: string;
  number: string;
  date: string;
  expirationDate?: string;
  lineItems: EstimateLineItem[];
  notes?: string;
  terms?: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  templateId?: string;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'change_request';
  acceptedAt?: string;
  acceptedBy?: string;
  acceptanceNotes?: string;
  signature?: string;
  createdAt: string;
  updatedAt: string;
  introductionEmailBody?: string;
  pricingOptions?: PricingOption[];

  // V2 fields
  config_data?: {
    sections?: SectionConfig[];
    title?: string;
    [key: string]: unknown;
  };
  form_data?: FormValues;
  selected_opportunity_id?: string;
  user_id?: string;
  change_request_reason?: string;

  // New fields for enhanced estimate structure (non-breaking additions)
  reportType?: string;
  reportDate?: string; // mirrors or complements `date`
  primaryImageDataUrl?: string;
  certificationLogoDataUrl?: string;

  // Extended contact details
  contactFirstName?: string;
  contactLastName?: string;
  companyName?: string;
  contactCity?: string;
  contactState?: string;
  contactZip?: string;

  // Introduction (rich text)
  introductionRichText?: string; // HTML string

  // Inspection sections
  inspectionSections?: Array<{
    id: string;
    style: 'standard' | 'side-by-side' | 'wide' | 'full';
    inputs: Array<
      | { id: string; type: 'file'; fileName?: string; fileType?: string; dataUrl: string; caption?: string }
      | { id: string; type: 'richtext'; html: string }
    >;
  }>;

  // Quote details (example Tab: CertainTeed Landmark)
  quoteDetails?: {
    landmark: {
      includeFromEstimateId?: string;
      description?: string;
      sections: Array<{
        id: string;
        title: string;
        items: Array<{ id: string; item: string; quantity: number; price: number; total: number }>;
        sectionTotal: number;
      }>;
      profitMargin: number; // 1-99
      subtotal: number;
      total: number;
      notes?: string;
    };
  };

  // Authorization page
  authorizationPage?: {
    disclaimerText?: string;
    section: {
      title: string;
      items: Array<{ id: string; item: string; quantity: number; price: number; total: number }>;
      profitMargin: number; // 1-99
    };
    productSelections: Array<{ item?: string; selection?: string }>; // typically 3 pairs
    signers: Array<{ firstName: string; lastName: string; email: string }>; // at least 1 required in UI
    footerNotes?: string;
  };

  // Warranty
  warranty?: {
    startDate?: string;
    projectCompletedDate?: string; // typically same as reportDate/date
  };

  // EagleView Measurements Report (stored in form_data)
  eagleViewReportId?: number;
  eagleViewOrderId?: number;

  // Unified sections structure with sorting
  sections?: Array<{
    id: string;
    type: 'details' | 'introduction' | 'inspection' | 'quoteDetails' | 'authorizationPage' | 'warranty' | 'custom';
    title: string;
    enabled: boolean;
    order: number;
    // For custom pages
    customPageData?: {
      requireAcknowledgement: boolean;
      pageType: 'myPdfs' | 'sharedPdfs' | 'singleUsePdf' | 'text';
      pdfId?: string;
      pdfFileDataUrl?: string;
      textHtml?: string;
    };
  }>;

  // Legacy custom pages field for backward compatibility
  customPages?: Array<{
    id: string;
    requireAcknowledgement: boolean;
    type: 'myPdfs' | 'sharedPdfs' | 'singleUsePdf' | 'text';
    title?: string;
    pdfId?: string; // for My PDFs / Shared PDFs selections
    pdfFileDataUrl?: string; // for single-use upload
    textHtml?: string; // for text page
  }>;
}

export interface FieldConfig {
    name: string;
    value: unknown;
    type: string;
    label?: string;
    default?: unknown;
    placeholder?: string;
    multiple?: boolean;
    allowedTypes?: string[];
    options?: { value: string; label?: string; name?: string }[];
    min?: number;
    max?: number;
    step?: number;
    fields?: FieldConfig[];
    inputsInRow?: number;
    colSpan?: number;
    conditionalFields?: { [key: string]: FieldConfig[] };
    validation?: {
        required?: boolean;
        minLength?: number;
        maxLength?: number;
        min?: number;
        max?: number;
        pattern?: string;
        customRules?: string[];
    };
};

export interface FieldPath {
    parentFieldName?: string;
    itemId?: string;
    grandParentFieldName?: string;
    parentItemId?: string;
};

// Add these types to your existing types
export interface QuoteItem {
  text?: string;
  description?: string;
  quantity?: number | string;
  price?: number | string;
  wastage_percentage?: number | string;
  wastage?: number;
  is_catalog_item?: boolean;
  catalog_product_id?: string;
  catalog_supplier_id?: string | null;
  catalog_variant_id?: string | null;
  sku?: string | null;
  unit_of_measure?: string | null;
  formula_expression?: string;
  sortOrder?: number;
}

export interface QuoteSectionData {
  section_title?: string;
  sortOrder?: number;
  Tax?: boolean;
  Margin?: boolean;
  items?: Record<string, QuoteItem>;
}

export interface QuoteTabData {
  description?: string;
  profit_margin?: number;
  tax_rate?: number;
  arrays?: {
    sections?: Record<string, QuoteSectionData>;
    warranty?: Record<string, QuoteItem & { Tax?: boolean; Margin?: boolean }>;
  };
  deleted_catalog_items?: string[];
  [key: string]: unknown;
}

export interface TabValues {
  [tabId: string]: QuoteTabData;
};

export interface TabConfig {
  id:  number | string;
  title: string;
  sortOrder: number;
  useTemplate: boolean;
  fields?: FieldConfig[];
};

export interface SectionConfig {
  id: number | string;
  title: string;
  type: string;
  enabled: boolean;
  allowNewTabs?: boolean;
  maxAllowedTabs?: number;
  template?: TemplateSectionConfig[];
  sections?: SectionPartConfig[];
  tabs?: TabConfig[];
  [key: string]: unknown;
}

export interface FormValues {
  [sectionId: string | number]: {
    [fieldName: string]: unknown;
    arrays?: {
      [arrayPath: string]: Record<string, unknown>;
    };
    tabs?: TabValues;
  };
}
export interface SectionPartConfig {
  sortOrder?: number;
  title?: string;
  description?: string;
  fields: FieldConfig[];
}

export interface TemplateSectionConfig {
  sortOrder?: number;
  title?: string;
  description?: string;
  fields?: FieldConfig[];
}
export interface UserInfo {
  name?: string;
  email?: string;
  [key: string]: unknown;
}

export type FieldPrimitiveValue = string | number | boolean | null | undefined;

export type FieldType =
  | "text" | "textarea" | "number" | "select" | "multiselect"
  | "checkbox" | "radio" | "file" | "richtext" | "date" | "array" | "group"
  | string;

export interface FieldOption {
  value: string;
  label: string;
}

export interface EstimateConfigData {
  sections: SectionConfig[];
  title?: string;
  [key: string]: unknown;
}

export interface ComponentConfig {
  componentType: string;
  props?: Record<string, string | number | boolean | string[]>;
  defaultValue?: FieldPrimitiveValue;
}

export interface ValidationRuleConfig {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  customRules?: string[];
}

export interface QuoteLineItem {
  id: string;
  item: string;
  quantity: number;
  price: number;
  total: number;
}

export interface QuoteWarrantyItem extends QuoteItem {
  Tax?: boolean;
  Margin?: boolean;
}

export type CustomPageType = "myPdfs" | "sharedPdfs" | "singleUsePdf" | "text";

export type EstimateSectionType =
  | "details" | "introduction" | "inspection" | "quoteDetails"
  | "authorizationPage" | "warranty" | "custom";

export interface InspectionFileInput {
  id: string; type: "file";
  fileName?: string; fileType?: string; dataUrl: string; caption?: string;
}

export interface InspectionRichTextInput {
  id: string; type: "richtext"; html: string;
}

export type FormFieldValue =
  | FieldPrimitiveValue
  | FieldPrimitiveValue[]
  | Record<string, unknown>
  | Record<string, unknown>[];


  export interface LocationBusiness {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  state?: string;
  city?: string;
  postalCode?: string;
}

export interface LocationDetails {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  state?: string;
  city?: string;
  postalCode?: string;
  business?: LocationBusiness;
}