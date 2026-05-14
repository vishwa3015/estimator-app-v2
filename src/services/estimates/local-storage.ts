
import { EstimateDocument, EstimateTemplate } from "@/types/estimate-items";

// Constants for local storage keys
export const ESTIMATES_STORAGE_KEY = 'smart_roofing_estimates';
export const TEMPLATES_STORAGE_KEY = 'smart_roofing_estimate_templates';

export const localStorageService = {
  // Get all estimates from local storage
  getEstimates: (): EstimateDocument[] => {
    const localData = localStorage.getItem(ESTIMATES_STORAGE_KEY);
    if (localData) {
      try {
        return JSON.parse(localData);
      } catch (e) {
        console.error('Error parsing local estimates cache:', e);
      }
    }
    return [];
  },

  // Save estimates to local storage
  saveEstimates: (estimates: EstimateDocument[]): void => {
    localStorage.setItem(ESTIMATES_STORAGE_KEY, JSON.stringify(estimates));
  },

  // Get all templates from local storage
  getTemplates: (): EstimateTemplate[] => {
    const localData = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (localData) {
      try {
        return JSON.parse(localData);
      } catch (e) {
        console.error('Error parsing local templates cache:', e);
      }
    }
    return [];
  },

  // Save templates to local storage
  saveTemplates: (templates: EstimateTemplate[]): void => {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  },

};
