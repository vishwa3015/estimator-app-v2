import { EstimateConfigV2 } from "./config-service-v2";

export interface FieldValidation {
  type?: 'string' | 'number' | 'email';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  customRules?: string[];
}

export interface FormFieldConfig {
  name: string;
  label: string;
  type: string;
  default?: unknown;
  placeholder?: string;
  required?: boolean;
  validation?: FieldValidation;
  options?: Array<{ name: string; value: string }>;
  rows?: number;
  min?: number;
  max?: number;
  step?: number;
  allowedTypes?: string[];
  fields?: FormFieldConfig[];
  [key: string]: unknown;
}

export interface FormSectionConfig {
  id: string;
  label: string;
  icon?: string;
  type: 'default' | 'custom';
  enabled: boolean;
  sortOrder: number;
  allowLogo?: boolean;
  description?: string;
  fields?: FormFieldConfig[];
  template?: string;
}

export interface FormData {
  [fieldName: string]: unknown;
}

interface FieldTypeConfig {
  component: string;
  props: Record<string, unknown>;
}

interface ValidationRuleResult {
  isValid: boolean;
  message?: string;
}


type ValidationRuleFunction = (value: unknown, field: FormFieldConfig) => ValidationRuleResult;
export class FormEngineV2 {
  private config: EstimateConfigV2;
  private customFieldTypes: Map<string, FieldTypeConfig> = new Map();
  private validationRules: Map<string, ValidationRuleFunction> = new Map();

  constructor(config: EstimateConfigV2) {
    this.config = config;
    this.initializeBuiltInFieldTypes();
  }

  private initializeBuiltInFieldTypes() {
    // Register built-in field types
    this.customFieldTypes.set('text', {
      component: 'Input',
      props: { type: 'text' }
    });
    
    this.customFieldTypes.set('textarea', {
      component: 'Textarea',
      props: {}
    });
    
    this.customFieldTypes.set('number', {
      component: 'Input',
      props: { type: 'number' }
    });
    
    this.customFieldTypes.set('date', {
      component: 'DatePicker',
      props: {}
    });
    
    this.customFieldTypes.set('email', {
      component: 'Input',
      props: { type: 'email' }
    });
    
    this.customFieldTypes.set('upload', {
      component: 'FileUpload',
      props: {}
    });
    
    this.customFieldTypes.set('richtext', {
      component: 'RichTextEditor',
      props: {}
    });
    
    this.customFieldTypes.set('radio', {
      component: 'RadioGroup',
      props: {}
    });
    
    this.customFieldTypes.set('switch', {
      component: 'Switch',
      props: {}
    });
    
    this.customFieldTypes.set('slider', {
      component: 'Slider',
      props: {}
    });
    
    this.customFieldTypes.set('dropdown', {
      component: 'Select',
      props: {}
    });
    
    this.customFieldTypes.set('array', {
      component: 'ArrayField',
      props: {}
    });
  }

  // Get all sections from configuration
  getSections(): FormSectionConfig[] {
    const configData = this.config.config_data as {
      layout?: {
        leftPanel?: {
          sections?: FormSectionConfig[];
        };
      };
      customSections?: Record<string, FormSectionConfig>;
    };

    if (!configData || !configData.layout || !configData.layout.leftPanel) {
      return [];
    }

    const sections = configData.layout.leftPanel.sections || [];
    const customSections = configData.customSections || {};

    // Combine default and custom sections
    const allSections = [
      ...sections,
      ...Object.values(customSections)
    ];

    return allSections.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  // Get section configuration by ID
  getSectionConfig(sectionId: string): FormSectionConfig | null {
    const sections = this.getSections();
    return sections.find(section => section.id === sectionId) || null;
  }

  // Get field configuration for a section
  getSectionFields(sectionId: string): FormFieldConfig[] {
    const configData = this.config.config_data;
    if (!configData || !configData.sections) {
      return [];
    }

    const sectionConfig = configData.sections[sectionId];
    if (!sectionConfig || !sectionConfig.fields) {
      return [];
    }

    return sectionConfig.fields;
  }

  // Validate form data for a section
  validateSection(sectionId: string, formData: FormData): { isValid: boolean; errors: string[] } {
    const fields = this.getSectionFields(sectionId);
    const errors: string[] = [];

    for (const field of fields) {
      const value = formData[field.name];
      
      // Check required fields
      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field.label} is required`);
        continue;
      }

      // Apply validation rules
      if (field.validation && value !== undefined && value !== null && value !== '') {
        const validationResult = this.validateField(field, value);
        if (!validationResult.isValid) {
          errors.push(...validationResult.errors);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate individual field
  public validateField(field: FormFieldConfig, value: unknown): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const validation = field.validation;

    if (!validation) {
      return { isValid: true, errors: [] };
    }

    // Built-in validation rules
    if (validation.type === 'string') {
      const strValue = String(value);
      if (validation.minLength && strValue.length < validation.minLength) {
        errors.push(`${field.label} must be at least ${validation.minLength} characters`);
      }
      if (validation.maxLength && strValue.length > validation.maxLength) {
        errors.push(`${field.label} must be no more than ${validation.maxLength} characters`);
      }
    }

    if (validation.type === 'number') {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        errors.push(`${field.label} must be a valid number`);
      } else {
        if (validation.min !== undefined && numValue < validation.min) {
          errors.push(`${field.label} must be at least ${validation.min}`);
        }
        if (validation.max !== undefined && numValue > validation.max) {
          errors.push(`${field.label} must be no more than ${validation.max}`);
        }
      }
    }

    if (validation.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(value))) {
        errors.push(`${field.label} must be a valid email address`);
      }
    }

    // Custom validation rules
    if (validation.customRules) {
      for (const ruleName of validation.customRules) {
        const rule = this.validationRules.get(ruleName);
        if (rule) {
          try {
            const result = rule(value, field);
            if (!result.isValid) {
              errors.push(result.message || `${field.label} is invalid`);
            }
          } catch (error) {
            console.error(`Error executing validation rule ${ruleName}:`, error);
            errors.push(`Validation error for ${field.label}`);
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Register custom field type
  registerFieldType(typeName: string, config: FieldTypeConfig): void {
    this.customFieldTypes.set(typeName, config);
  }

  // Register custom validation rule
  registerValidationRule(ruleName: string, ruleFunction: ValidationRuleFunction): void {
    this.validationRules.set(ruleName, ruleFunction);
  }

  // Get field type configuration
  getFieldTypeConfig(typeName: string): FieldTypeConfig | undefined {
    return this.customFieldTypes.get(typeName);
  }

  // Get all available field types
  getAvailableFieldTypes(): string[] {
    return Array.from(this.customFieldTypes.keys());
  }

  // Generate default form data for a section
  generateDefaultFormData(sectionId: string): FormData {
    const fields = this.getSectionFields(sectionId);
    const formData: FormData = {};

    for (const field of fields) {
      if (field.default !== undefined) {
        formData[field.name] = field.default;
      } else {
        // Set sensible defaults based on field type
        switch (field.type) {
          case 'text':
          case 'textarea':
          case 'email':
            formData[field.name] = '';
            break;
          case 'number':
            formData[field.name] = 0;
            break;
          case 'switch':
            formData[field.name] = false;
            break;
          case 'array':
            formData[field.name] = [];
            break;
          case 'date':
            formData[field.name] = new Date().toISOString();
            break;
          default:
            formData[field.name] = '';
        }
      }
    }

    return formData;
  }

  // Update configuration
  updateConfig(newConfig: EstimateConfigV2) {
    this.config = newConfig;
  }
}