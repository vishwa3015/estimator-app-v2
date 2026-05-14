export interface TitleSectionValues {
  company_name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  date?: string;
  report_type?: string;
  first_name?: string;
  last_name?: string;
  primary_image?: {
    file_storage_path?: string;
    _preview_url?: string;
  };
  certification?: { file_storage_path?: string };
}

export interface IntroSectionValues {
  introduction?: string;
}

export interface GalleryInput {
  text?: string;
  image?: { file_storage_path?: string };
}

export interface GallerySectionEntry {
  style?: string;
  inputs?: Record<string, GalleryInput>;
  section_title?: string;
}

export interface GallerySectionValues {
  arrays?: {
    sections?: Record<string, GallerySectionEntry>;
  };
}

export interface TabSectionEntry {
  section_title?: string;
  sortOrder?: number;
  items?: Record<string, SectionItem>;
}

export interface TabData {
  description?: string;
  arrays?: {
    sections?: Record<string, TabSectionEntry>;
  };
}

export interface QuoteSectionValues {
  tabs?: Record<string, TabData>;
}

export interface AuthSectionValues {
  disclaimer?: string;
  footer_notes?: string;
}

export interface WarrantySectionValues {
  name?: string;
  date?: string;
  description?: string;
}

export interface TermsSectionValues {
  terms?: string;
}

export interface CustomSectionValues {
  textHtml?: string;
  content_type?: string;
  file_storage_path?: string;
}

export interface SectionItem {
  quantity?: number | string;
  text?: string;
  description?: string;
  price?: number | string;
  image?: {
    file_storage_path?: string;
    _preview_url?: string;
  };
  id?: string;
  sectionId?: string;
  catalog_product_id?: string;
}

export interface TabSection {
  section_title?: string;
  sortOrder?: number;
  style?: string;
  inputs?: Record<string, SectionInput>;
  items: Record<string, SectionItem>;
}

export interface SectionInput {
  text?: string;
  image?: {
    file_storage_path?: string;
  };
}

export interface TabFormValues {
  arrays?: {
    sections?: Record<string, {
      items?: Record<string, {
        quantity?: number;
        text?: string;
      }>;
    }>;
  };
}