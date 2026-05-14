
import React from "react";
import QuotationTemplate from "./components/pdf/QuoteTemplate";
import { CustomTemplate } from "./components/pdf/CustomTemplate";
import { HiredGunCustomTemplate } from "./components/pdf/HiredGunsCustomTemplate";
import { FormValues, LocationDetails, SectionConfig } from "./types/estimate-items";
import { GHLContact } from "./types/ghl";

export interface TemplateComponentProps {
  formValues: FormValues;
  sectionUpdates: SectionConfig[];
  locDetails: LocationDetails;
  contact: GHLContact | null;
  locationId: string;
}

export const TEMPLATE_REGISTRY: Record<
  string,
  React.ComponentType<TemplateComponentProps>
> = {
  standard: QuotationTemplate,
  custom: CustomTemplate,
  hired_guns: HiredGunCustomTemplate as unknown as React.ComponentType<TemplateComponentProps>,
};

export const DEFAULT_RENDERER_KEY = "standard";

/**
 * Returns the React component for the given renderer_key.
 * Falls back to 'standard' if key is unknown or missing.
 */
export const getTemplateComponent = (
  rendererKey: string | null | undefined
): React.ComponentType<TemplateComponentProps> => {
  if (!rendererKey) return TEMPLATE_REGISTRY[DEFAULT_RENDERER_KEY];
  return TEMPLATE_REGISTRY[rendererKey] ?? TEMPLATE_REGISTRY[DEFAULT_RENDERER_KEY];
};

/**
 * Returns true if the renderer_key is registered in code.
 * Useful for warnings in dev mode.
 */
export const isRendererKeyRegistered = (rendererKey: string): boolean => {
  return rendererKey in TEMPLATE_REGISTRY;
};