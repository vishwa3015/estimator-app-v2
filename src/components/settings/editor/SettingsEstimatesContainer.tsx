/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useState } from "react";
import { Button } from "../../ui/button";
import { DatePicker } from "../../ui/date-picker";
import FileDropzone from "../../ui/file-dropzone";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import RichTextEditor from "../../ui/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Slider } from "../../ui/slider";
import { Textarea } from "../../ui/textarea";
import { RadioGroup, RadioGroupItem } from "../../ui/radio-group";
import { v4 as uuidv4 } from "uuid";
import { Switch } from "../../ui/switch";
import { fileUploadService } from "@/services/estimates/file-upload-service";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Check, Pencil, ChevronDown, ChevronRight, ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { useEstimateData } from "@/hooks/use-estimate-data";
import QuotationTemplate from "../../pdf/QuoteTemplate";
import { useParams } from "react-router-dom";
import { Product, ProductCategory, productService, ProductSupplier } from "@/services/products/product-service";
import { AddItemDialog, SelectedCatalogItem } from "@/components/estimates/AddItemDialog";
import { FieldConfig, FieldPath, TabConfig, SectionConfig, FormValues, QuoteTabData, QuoteItem } from "@/types/estimate-items";
import { ProductCard } from "@/components/ui/ProductCard";
import { Card } from "@/components/ui/card";
import { TemplateControls } from "@/components/estimates/TemplateControls";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TrashIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
    />
  </svg>
);

type TabSectionAssignment = { tab_id: string; section_id: string };
type SupplierTabSectionsMap = Record<string, TabSectionAssignment[]>;

function normaliseSupplierTabSections(raw: unknown): SupplierTabSectionsMap {
  if (!raw || typeof raw !== "object") return {};
  const result: SupplierTabSectionsMap = {};

  for (const [supplierId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      result[supplierId] = value.filter(
        (a: unknown) => a && typeof a === "object" && "tab_id" in a
      );
    } else if (value && typeof value === "object" && "tab_id" in value) {
      const legacy = value as { tab_id: string; section_id: string };
      result[supplierId] = legacy.tab_id ? [legacy] : [];
    }
  }

  return result;
}
interface SettingsEstimatesContainerProps {
  activeSection: number | string;
  setSectionUpdates: React.Dispatch<React.SetStateAction<SectionConfig[]>>;
  sectionUpdates: SectionConfig[];
  locationId: string | null;
  setActiveSection: (id: number | string) => void;
  formValues: FormValues;
  setFormValues: React.Dispatch<React.SetStateAction<FormValues>>;
  /** Called after template update to persist config. */
  onSaveRequested?: () => void;
}

export default function EstimatesContainer({
  activeSection,
  setSectionUpdates,
  sectionUpdates,
  locationId,
  setActiveSection,
  formValues, //: externalFormValues,
  setFormValues, // : setExternalFormValues,
  onSaveRequested,
}: SettingsEstimatesContainerProps) {
  const { contactId } = useParams();
  // const { estimate } = useEstimateData();
  // const [formValues, setFormValues] = useState<FormValues>(
  //   externalFormValues || {}
  // );
  const [uuids, setUuids] = useState<{ [key: string]: string[] }>({});

  const section = sectionUpdates?.find((sec) => sec.id === activeSection) ?? null;

  type TextTemplate = Pick<
    Database["public"]["Tables"]["estimate_text_templates"]["Row"],
    "id" | "name" | "html"
  >;

  const [textTemplates, setTextTemplates] = useState<TextTemplate[]>([]);
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [pendingTemplateHtml, setPendingTemplateHtml] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedTemplateIdx, setSelectedTemplateIdx] = useState<string>("");
  const [isTemplateSelectOpen, setIsTemplateSelectOpen] = useState(false);

  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(section?.title || "");
  const [products, setProducts] = useState<Product[]>([]);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<FieldConfig | null>(null);
  const [currentPath, setCurrentPath] = useState<FieldPath | null>(null);
  const [currentTabIndex, setCurrentTabIndex] = useState<number | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [sectionPropagation, setSectionPropagation] = useState<Record<string, boolean>>({});
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [suppliers, setSuppliers] = useState<ProductSupplier[]>([]);
  const QuoteID = 6;
  // useEffect(() => {
  //   if (estimate && estimate.id) {
  //     setSectionUpdates(estimate?.config_data?.sections || []);
  //     setFormValues(estimate?.form_data || {});
  //   }
  // }, [estimate]);
  useEffect(() => {
    if (section?.title) {
      setTitle(section.title);
    }
  }, [section]);

  const { toast } = useToast();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const [productsList, categoriesList, suppliersList] = await Promise.all([
          productService.getProducts(),
          productService.getCategories(),
          productService.getSuppliers(),
        ]);

        setProducts(productsList);
        setCategories(categoriesList);
        setSuppliers(suppliersList);
      } catch (error: unknown) {
        console.error("Error fetching catalog data:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load products catalog",
          variant: "destructive",
        });
      }
    };

    fetchProducts();
  }, [toast]);

  useEffect(() => {
    // Generate default values in formValues before render
    const defaultFormValues = generateDefaultFormValues(sectionUpdates);
    // console.log(defaultFormValues, " <== default value..");
    if (!(formValues && Object.keys(formValues).length)) {
      setFormValues(defaultFormValues);
    }
  }, []);

  // Sync internal form values with external state
  // React.useEffect(() => {
  //   if (setExternalFormValues) {
  //     setExternalFormValues(formValues);
  //   }
  // }, [formValues, setExternalFormValues]);

  const generateDefaultFormValues = (sectionUpdates: SectionConfig[]): FormValues => {
    const defaultFormValues: FormValues = {};

    sectionUpdates.forEach((section, sectionIndex) => {
      const sectionId = section.id;  // Assuming sections are 1-indexed
      defaultFormValues[sectionId] = {};

      // Process regular fields in the section
      // console.log(section, " <=== section.fields checking here...");
      if (section.sections && section.sections.length > 0) {
        section.sections
          .flatMap((sec) => sec.fields)
          .forEach((field) => {
            const defaultValue = getFieldDefaultValue(field);
            defaultFormValues[sectionId][field.name] = defaultValue || null;
          });
      }

      // Process arrays in the section
      const arrayFields =
        section.sections?.flatMap((sec) => sec.fields)?.filter((field) => field.type === "array") || [];
      if (arrayFields.length > 0) {
        defaultFormValues[sectionId].arrays = {};
        arrayFields.forEach((arrayField) => {
          defaultFormValues[sectionId].arrays[arrayField.name] = {};
        });
      }

      // Process tabs in the section
      if (section.tabs && section.tabs.length > 0) {
        defaultFormValues[sectionId].tabs = {};

        section.tabs.forEach((tab) => {
          defaultFormValues[sectionId].tabs[tab.id] = {};

          // Process regular fields in the tab
          // console.log(section.template, " <=== sections..");
          if (section.template && section.template.length > 0) {
            section.template
              .flatMap((sec) => sec.fields)
              .forEach((field) => {
                const defaultValue = getFieldDefaultValue(field);
                defaultFormValues[sectionId].tabs[tab.id][field.name] = defaultValue || null;
              });
          }

          // Process arrays in the tab
          const tabArrayFields = tab.fields?.filter((field) => field.type === "array") || [];
          if (tabArrayFields.length > 0) {
            defaultFormValues[sectionId].tabs[tab.id].arrays = {};
            tabArrayFields.forEach((arrayField) => {
              defaultFormValues[sectionId].tabs[tab.id].arrays[arrayField.name] = {};
            });
          }
        });
      }
    });

    return defaultFormValues;
  };

  const getFieldDefaultValue = (field: FieldConfig): unknown => {
    // Return the field's default value if it exists
    if (field.default !== undefined) {
      return field.default;
    }

    // Return appropriate default values based on field type
    switch (field.type) {
      case "text":
      case "email":
      case "textarea":
      case "richtext":
        return "";

      case "number":
      case "slider":
        return field.min || 0;

      case "date":
        return new Date().toISOString();

      case "dropdown":
      case "radio":
        return field.options?.[0]?.value || "";

      case "switch":
        return false;

      case "upload":
        return field.multiple ? [] : "";

      case "array":
        return {}; // Arrays start empty, items are added dynamically

      default:
        return undefined;
    }
  };

  const getFieldValue = (config: FieldConfig, path: FieldPath, tabIndex: number | null) => {
    if (!formValues[activeSection]) {
      return config.default;
    }
    const tabId = sectionUpdates.find((sec) => sec.id === activeSection)?.tabs?.[tabIndex]?.id;
    if (tabIndex !== null && !formValues[activeSection]?.tabs?.[tabId]) {
      return config.default;
    }
    // Handle nested array fields
    if (path.parentFieldName) {
      if (tabIndex !== null) {
        return path.grandParentFieldName
          ? formValues[activeSection]?.tabs?.[tabId]?.arrays?.[path.grandParentFieldName]?.[path.parentItemId]?.[
              path.parentFieldName
            ]?.[path.itemId]?.[config.name]
          : formValues[activeSection]?.tabs?.[tabId]?.arrays?.[path.parentFieldName]?.[path.itemId]?.[config.name];
      }
      return !path.grandParentFieldName
        ? formValues[activeSection]?.arrays?.[path.parentFieldName]?.[path.itemId]?.[config.name]
        : formValues[activeSection]?.arrays?.[path.grandParentFieldName]?.[path.parentItemId]?.[path.parentFieldName]?.[
            path.itemId
          ]?.[config.name];
    }

    // Handle regular fields
    return tabIndex !== null
      ? formValues[activeSection]?.tabs?.[tabId]?.[config.name]
      : formValues[activeSection]?.[config.name];
  };

  const getFieldValueForAccordion = (fieldName, path, tabIndex) => {
    if (!formValues[activeSection]) {
      return "";
    }

    const tabId =
      tabIndex !== null ? sectionUpdates.find((sec) => sec.id === activeSection)?.tabs?.[tabIndex]?.id : null;

    // sectionUpdates?.[activeSection - 1]?.tabs?.[tabIndex]?.id

    if (tabIndex !== null && tabId) {
      if (path.grandParentFieldName) {
        return (
          formValues[activeSection]?.tabs?.[tabId]?.arrays?.[path.grandParentFieldName]?.[path.parentItemId]?.[
            path.parentFieldName
          ]?.[path.itemId]?.[fieldName] || ""
        );
      } else if (path.parentFieldName) {
        return (
          formValues[activeSection]?.tabs?.[tabId]?.arrays?.[path.parentFieldName]?.[path.itemId]?.[fieldName] || ""
        );
      }
    } else {
      if (path.grandParentFieldName) {
        return (
          formValues[activeSection]?.arrays?.[path.grandParentFieldName]?.[path.parentItemId]?.[path.parentFieldName]?.[
            path.itemId
          ]?.[fieldName] || ""
        );
      } else if (path.parentFieldName) {
        return formValues[activeSection]?.arrays?.[path.parentFieldName]?.[path.itemId]?.[fieldName] || "";
      }
    }

    return "";
  };
  const handleFieldChange = (fieldName: string, value: unknown, path: FieldPath = {}, tabIndex: number | null) => {
    setFormValues((prev) => {
      const sectionValues = prev[activeSection] || {};

      // ⚡ Quote Details Cross-Tab Propagation Logic
      // When updating quantity/price for items in Quote Details section (id=6),
      // propagate the same change to matching items across all tabs (Good/Better/Best)
      // Only if propagation is enabled for the specific section (parentItemId)
      const isPropagationEnabled = path.parentItemId
        ? sectionPropagation[path.parentItemId] !== false // Default to true
        : true;

      const shouldPropagate =
        activeSection === QuoteID &&
        tabIndex !== null &&
        isPropagationEnabled &&
        (fieldName === "quantity" || fieldName === "price") &&
        path.grandParentFieldName === "sections" &&
        path.parentFieldName === "items";

      if (path.parentFieldName) {
        if (tabIndex !== null) {
          const tabId = sectionUpdates.find((sec) => sec.id === activeSection)?.tabs?.[tabIndex]?.id;
          const tab = sectionValues?.tabs?.[tabId] || {};

          // ✅ Handle nested array fields inside a specific tab
          if (path.grandParentFieldName && path.parentItemId) {
            // First, update the current tab
            const updatedTabs = { ...sectionValues.tabs };

            updatedTabs[tabId] = {
              ...tab,
              arrays: {
                ...tab.arrays,
                [path.grandParentFieldName]: {
                  ...tab.arrays?.[path.grandParentFieldName],
                  [path.parentItemId]: {
                    ...tab.arrays?.[path.grandParentFieldName]?.[path.parentItemId],
                    [path.parentFieldName]: {
                      ...tab.arrays?.[path.grandParentFieldName]?.[path.parentItemId]?.[path.parentFieldName],
                      [path.itemId]: {
                        ...tab.arrays?.[path.grandParentFieldName]?.[path.parentItemId]?.[path.parentFieldName]?.[
                          path.itemId
                        ],
                        [fieldName]: value,
                      },
                    },
                  },
                },
              },
            };

            // Propagate to other tabs in Quote Details section if needed
            if (shouldPropagate) {
              const section = sectionUpdates.find((sec) => sec.id === activeSection);
              if (section?.tabs) {
                console.log(
                  `[Propagation] Updating ${fieldName} to "${value}" for item ${path.itemId} in section ${path.parentItemId}`,
                );

                section.tabs.forEach((tabConfig, idx) => {
                  if (idx !== tabIndex) {
                    const otherTabId = tabConfig.id;
                    const otherTabData = sectionValues?.tabs?.[otherTabId];

                    // Check if the item exists in the other tab
                    if (
                      otherTabData?.arrays?.[path.grandParentFieldName]?.[path.parentItemId]?.[path.parentFieldName]?.[
                        path.itemId
                      ]
                    ) {
                      console.log(`  ✓ Propagating to tab ${idx} (${tabConfig.title || otherTabId})`);
                      updatedTabs[otherTabId] = {
                        ...otherTabData,
                        arrays: {
                          ...otherTabData.arrays,
                          [path.grandParentFieldName]: {
                            ...otherTabData.arrays[path.grandParentFieldName],
                            [path.parentItemId]: {
                              ...otherTabData.arrays[path.grandParentFieldName][path.parentItemId],
                              [path.parentFieldName]: {
                                ...otherTabData.arrays[path.grandParentFieldName][path.parentItemId][
                                  path.parentFieldName
                                ],
                                [path.itemId]: {
                                  ...otherTabData.arrays[path.grandParentFieldName][path.parentItemId][
                                    path.parentFieldName
                                  ][path.itemId],
                                  [fieldName]: value,
                                },
                              },
                            },
                          },
                        },
                      };
                    }
                  }
                });
              }
            }

            return {
              ...prev,
              [activeSection]: {
                ...sectionValues,
                tabs: updatedTabs,
              },
            };
          }

          // ✅ Handle single-level array fields inside a specific tab
          return {
            ...prev,
            [activeSection]: {
              ...sectionValues,
              tabs: {
                ...sectionValues.tabs,
                [tabId]: {
                  ...tab,
                  arrays: {
                    ...tab.arrays,
                    [path.parentFieldName]: {
                      ...tab.arrays?.[path.parentFieldName],
                      [path.itemId]: {
                        ...tab.arrays?.[path.parentFieldName]?.[path.itemId],
                        [fieldName]: value,
                      },
                    },
                  },
                },
              },
            },
          };
        }

        // ✅ Handle nested array fields directly under section
        if (path.grandParentFieldName && path.parentItemId) {
          return {
            ...prev,
            [activeSection]: {
              ...sectionValues,
              arrays: {
                ...sectionValues.arrays,
                [path.grandParentFieldName]: {
                  ...sectionValues.arrays?.[path.grandParentFieldName],
                  [path.parentItemId]: {
                    ...sectionValues.arrays?.[path.grandParentFieldName]?.[path.parentItemId],
                    [path.parentFieldName]: {
                      ...sectionValues.arrays?.[path.grandParentFieldName]?.[path.parentItemId]?.[path.parentFieldName],
                      [path.itemId]: {
                        ...sectionValues.arrays?.[path.grandParentFieldName]?.[path.parentItemId]?.[
                          path.parentFieldName
                        ]?.[path.itemId],
                        [fieldName]: value,
                      },
                    },
                  },
                },
              },
            },
          };
        }

        // ✅ Handle single-level array fields directly under section
        return {
          ...prev,
          [activeSection]: {
            ...sectionValues,
            arrays: {
              ...sectionValues.arrays,
              [path.parentFieldName]: {
                ...sectionValues.arrays?.[path.parentFieldName],
                [path.itemId]: {
                  ...sectionValues.arrays?.[path.parentFieldName]?.[path.itemId],
                  [fieldName]: value,
                },
              },
            },
          },
        };
      }

      // ✅ Handle regular fields
      const tabId = sectionUpdates.find((sec) => sec.id === activeSection)?.tabs?.[tabIndex]?.id;
      const tab = sectionValues?.tabs?.[tabId] || {};
      return tabIndex !== null
        ? {
            ...prev,
            [activeSection]: {
              ...prev[activeSection],
              tabs: {
                ...prev[activeSection]?.tabs,
                [tabId]: {
                  ...tab,
                  [fieldName]: value,
                },
              },
            },
          }
        : {
            ...prev,
            [activeSection]: {
              ...sectionValues,
              [fieldName]: value,
            },
          };
    });
  };

  // console.log(formValues, " <=== Form values in each update...");

  const getArrayItems = (fieldName: string, parentPath?: FieldPath, tabIndex?: number | null) => {
    const uuid = uuidv4();

    // Helper function to sort items by sortOrder
    const sortItemsByOrder = (itemsObj: Record<string, { sortOrder?: number }>, itemKeys: string[]) => {
      return itemKeys.sort((a, b) => {
        const orderA = itemsObj[a]?.sortOrder ?? Number.MAX_SAFE_INTEGER;
        const orderB = itemsObj[b]?.sortOrder ?? Number.MAX_SAFE_INTEGER;
        return orderA - orderB;
      });
    };

    if (tabIndex !== null) {
      const tabId = sectionUpdates.find((sec) => sec.id === activeSection)?.tabs[tabIndex]?.id;
      if (parentPath.parentFieldName) {
        const itemsObj =
          formValues[activeSection]?.tabs?.[tabId]?.arrays?.[parentPath.parentFieldName]?.[parentPath.itemId]?.[
            fieldName
          ] || {};
        const items = Object.keys(itemsObj);
        return items.length > 0 ? sortItemsByOrder(itemsObj, items) : [uuid];
      } else {
        const itemsObj = formValues[activeSection]?.tabs?.[tabId]?.arrays?.[fieldName] || {};
        const items = Object.keys(itemsObj);
        return items.length > 0 ? sortItemsByOrder(itemsObj, items) : [uuid];
      }
    } else {
      if (parentPath.parentFieldName) {
        const itemsObj =
          formValues[activeSection]?.arrays?.[parentPath.parentFieldName]?.[parentPath.itemId]?.[fieldName] || {};
        const items = Object.keys(itemsObj);
        return items.length > 0 ? sortItemsByOrder(itemsObj, items) : [uuid];
      } else {
        const itemsObj = formValues[activeSection]?.arrays?.[fieldName] || {};
        const items = Object.keys(itemsObj);
        return items.length > 0 ? sortItemsByOrder(itemsObj, items) : [uuid];
      }
    }
  };

  const handleArrayAdd = (
    field: FieldConfig,
    parentPath?: FieldPath,
    tabIndex?: number | null,
    initialValues: Record<string, unknown> = {},
    explicitItemId?: string,
  ) => {
    const newItemId = explicitItemId || uuidv4();
    const arrayPath = parentPath?.parentFieldName
      ? `${parentPath.parentFieldName}.${parentPath.itemId}.${field.name}`
      : field.name;

    // Update UUIDs
    setUuids((prev) => ({
      ...prev,
      [`${activeSection}${tabIndex !== null ? `.${tabIndex}` : ""}.${arrayPath}`]: [
        ...(prev[`${activeSection}${tabIndex !== null ? `.${tabIndex}` : ""}.${arrayPath}`] || []),
        newItemId,
      ],
    }));

    // Update configuration in sectionUpdates (only structure)
    setSectionUpdates((prev) => {
      const newSections = prev ? JSON.parse(JSON.stringify(prev)) : JSON.parse(JSON.stringify(sectionUpdates));
      const sectionIndex = newSections.findIndex((s) => s.id === activeSection);

      if (sectionIndex === -1) return prev || sectionUpdates;

      let targetField;
      if (parentPath?.parentFieldName) {
        // Nested array
        let parentField;
        if (tabIndex !== null) {
          parentField = newSections[sectionIndex].template
            .flatMap((sec) => sec.fields)
            .find((f) => f.name === parentPath.parentFieldName);
        } else {
          parentField = newSections[sectionIndex].sections
            .flatMap((sec) => sec.fields)
            .find((f) => f.name === parentPath.parentFieldName);
        }

        if (parentField?.value) {
          const parentItem = parentField.value.find((item) => item.id === parentPath.itemId);

          if (parentItem) {
            targetField = parentField.fields?.find((f) => f.name === field.name);
          }
        }
      } else {
        // Top-level array
        if (tabIndex !== null) {
          targetField = newSections[sectionIndex].template //.sections
            .flatMap((sec) => sec.fields)
            .find((f) => f.name === field.name);
        } else {
          targetField = newSections[sectionIndex].sections
            .flatMap((sec) => sec.fields)
            .find((f) => f.name === field.name);
        }
      }

      if (targetField) {
        if (!targetField.value) {
          targetField.value = [];
        }
      }

      return newSections;
    });

    const uuid = newItemId;
    const fieldName = field.name;

    // Helper function to get the next sortOrder value
    const getNextSortOrder = (itemsObj: Record<string, { sortOrder?: number }>) => {
      const sortOrders = Object.values(itemsObj || {})
        .map((item) => item?.sortOrder)
        .filter((order): order is number => typeof order === "number");
      return sortOrders.length > 0 ? Math.max(...sortOrders) + 1 : 1;
    };

    if (tabIndex !== null) {
      const tabId = sectionUpdates.find((sec) => sec.id === activeSection)?.tabs[tabIndex]?.id;
      if (parentPath.parentFieldName) {
        setFormValues((prev) => {
          const existingItems =
            prev?.[activeSection]?.tabs?.[tabId]?.arrays?.[parentPath.parentFieldName]?.[parentPath.itemId]?.[
              fieldName
            ];
          const nextSortOrder = getNextSortOrder(existingItems);

          return {
            ...prev,
            [activeSection]: {
              ...prev?.[activeSection],
              tabs: {
                ...prev?.[activeSection].tabs,
                [tabId]: {
                  ...prev?.[activeSection]?.tabs?.[tabId],
                  arrays: {
                    ...prev?.[activeSection]?.tabs?.[tabId]?.arrays,
                    [parentPath.parentFieldName]: {
                      ...prev?.[activeSection]?.tabs?.[tabId]?.arrays?.[parentPath.parentFieldName],
                      [parentPath.itemId]: {
                        ...prev?.[activeSection]?.tabs?.[tabId]?.arrays?.[parentPath.parentFieldName]?.[
                          parentPath.itemId
                        ],
                        [fieldName]: {
                          ...prev?.[activeSection]?.tabs?.[tabId]?.arrays?.[parentPath.parentFieldName]?.[
                            parentPath.itemId
                          ]?.[fieldName],
                          [uuid]: { ...initialValues, sortOrder: nextSortOrder },
                        },
                      },
                    },
                  },
                },
              },
            },
          };
        });
      } else {
        setFormValues((prev) => {
          const existingItems = prev?.[activeSection]?.tabs?.[tabId]?.arrays?.[fieldName];
          const nextSortOrder = getNextSortOrder(existingItems);

          return {
            ...prev,
            [activeSection]: {
              ...prev?.[activeSection],
              tabs: {
                ...prev?.[activeSection].tabs,
                [tabId]: {
                  ...prev?.[activeSection]?.tabs?.[tabId],
                  arrays: {
                    ...prev?.[activeSection]?.tabs?.[tabId]?.arrays,
                    [fieldName]: {
                      ...prev?.[activeSection]?.tabs?.[tabId]?.arrays?.[fieldName],
                      [uuid]: { ...initialValues, sortOrder: nextSortOrder },
                    },
                  },
                },
              },
            },
          };
        });
      }
    } else {
      if (parentPath.parentFieldName) {
        setFormValues((prev) => {
          const existingItems =
            prev?.[activeSection]?.arrays?.[parentPath.parentFieldName]?.[parentPath.itemId]?.[fieldName];
          const nextSortOrder = getNextSortOrder(existingItems);

          return {
            ...prev,
            [activeSection]: {
              ...prev?.[activeSection],

              arrays: {
                ...prev?.[activeSection]?.arrays,
                [parentPath.parentFieldName]: {
                  ...prev?.[activeSection]?.arrays?.[parentPath.parentFieldName],
                  [parentPath.itemId]: {
                    ...prev?.[activeSection]?.arrays?.[parentPath.parentFieldName]?.[parentPath.itemId],
                    [fieldName]: {
                      ...prev?.[activeSection]?.arrays?.[parentPath.parentFieldName]?.[parentPath.itemId]?.[fieldName],
                      [uuid]: { ...initialValues, sortOrder: nextSortOrder },
                    },
                  },
                },
              },
            },
          };
        });
      } else {
        setFormValues((prev) => {
          const existingItems = prev?.[activeSection]?.arrays?.[fieldName];
          const nextSortOrder = getNextSortOrder(existingItems);

          return {
            ...prev,
            [activeSection]: {
              ...prev?.[activeSection],
              arrays: {
                ...prev?.[activeSection]?.arrays,
                [fieldName]: {
                  ...prev?.[activeSection]?.arrays?.[fieldName],
                  [uuid]: { ...initialValues, sortOrder: nextSortOrder },
                },
              },
            },
          };
        });
      }
    }
  };

  const handleArrayRemove = (field: FieldConfig, itemId: string, parentPath?: FieldPath, tabIndex?: number | null) => {
    const fieldName = field.name;

    const isQuoteSection =
      activeSection === QuoteID &&
      field.name === "sections" &&
      tabIndex !== null;

    if (isQuoteSection) {
      setFormValues((prev) => ({
        ...prev,
        [activeSection]: {
          ...prev[activeSection],
          permanently_deleted_sections: [
            ...(prev[activeSection]?.permanently_deleted_sections || []),
            itemId,
          ],
        },
      }));
    }

    if (tabIndex !== null) {
      const tabId = sectionUpdates.find((sec) => sec.id === activeSection)?.tabs[tabIndex]?.id;

      if (parentPath?.parentFieldName) {
        // Nested inside another array field within a tab
        setFormValues((prev) => {
          const itemToRemove =
            prev?.[activeSection]?.tabs?.[tabId]?.arrays?.[parentPath.parentFieldName]?.[parentPath.itemId]?.[
              fieldName
            ]?.[itemId];

          const updatedArray = {
            ...prev?.[activeSection]?.tabs?.[tabId]?.arrays?.[parentPath.parentFieldName]?.[parentPath.itemId]?.[
              fieldName
            ],
          };
          delete updatedArray[itemId];
          // Track deleted catalog items
          const deletedCatalogItems = prev?.[activeSection]?.tabs?.[tabId]?.deleted_catalog_items || [];
          const updatedDeletedItems =
            itemToRemove?.is_catalog_item && itemToRemove?.catalog_product_id
              ? [...deletedCatalogItems, itemToRemove.catalog_product_id]
              : deletedCatalogItems;

          return {
            ...prev,
            [activeSection]: {
              ...prev?.[activeSection],
              tabs: {
                ...prev?.[activeSection].tabs,
                [tabId]: {
                  ...prev?.[activeSection]?.tabs?.[tabId],
                  deleted_catalog_items: updatedDeletedItems,
                  arrays: {
                    ...prev?.[activeSection]?.tabs?.[tabId]?.arrays,
                    [parentPath.parentFieldName]: {
                      ...prev?.[activeSection]?.tabs?.[tabId]?.arrays?.[parentPath.parentFieldName],
                      [parentPath.itemId]: {
                        ...prev?.[activeSection]?.tabs?.[tabId]?.arrays?.[parentPath.parentFieldName]?.[
                          parentPath.itemId
                        ],
                        [fieldName]: updatedArray,
                      },
                    },
                  },
                },
              },
            },
          };
        });
      } else {
        // Direct array field inside a tab
        setFormValues((prev) => {
          const itemToRemove = prev?.[activeSection]?.tabs?.[tabId]?.arrays?.[fieldName]?.[itemId];

          const updatedArray = {
            ...prev?.[activeSection]?.tabs?.[tabId]?.arrays?.[fieldName],
          };
          delete updatedArray[itemId];

          // Track deleted catalog items
          const deletedCatalogItems = prev?.[activeSection]?.tabs?.[tabId]?.deleted_catalog_items || [];
          const updatedDeletedItems =
            itemToRemove?.is_catalog_item && itemToRemove?.catalog_product_id
              ? [...deletedCatalogItems, itemToRemove.catalog_product_id]
              : deletedCatalogItems;

          return {
            ...prev,
            [activeSection]: {
              ...prev?.[activeSection],
              tabs: {
                ...prev?.[activeSection].tabs,
                [tabId]: {
                  ...prev?.[activeSection]?.tabs?.[tabId],
                  deleted_catalog_items: updatedDeletedItems,
                  arrays: {
                    ...prev?.[activeSection]?.tabs?.[tabId]?.arrays,
                    [fieldName]: updatedArray,
                  },
                },
              },
            },
          };
        });
      }
    } else {
      if (parentPath?.parentFieldName) {
        // Nested inside another array field outside tab
        setFormValues((prev) => {
          const itemToRemove =
            prev?.[activeSection]?.arrays?.[parentPath.parentFieldName]?.[parentPath.itemId]?.[fieldName]?.[itemId];

          const updatedArray = {
            ...prev?.[activeSection]?.arrays?.[parentPath.parentFieldName]?.[parentPath.itemId]?.[fieldName],
          };
          delete updatedArray[itemId];

          // Track deleted catalog items
          const deletedCatalogItems = prev?.[activeSection]?.deleted_catalog_items || [];
          const updatedDeletedItems =
            itemToRemove?.is_catalog_item && itemToRemove?.catalog_product_id
              ? [...deletedCatalogItems, itemToRemove.catalog_product_id]
              : deletedCatalogItems;

          return {
            ...prev,
            [activeSection]: {
              ...prev?.[activeSection],
              deleted_catalog_items: updatedDeletedItems,
              arrays: {
                ...prev?.[activeSection]?.arrays,
                [parentPath.parentFieldName]: {
                  ...prev?.[activeSection]?.arrays?.[parentPath.parentFieldName],
                  [parentPath.itemId]: {
                    ...prev?.[activeSection]?.arrays?.[parentPath.parentFieldName]?.[parentPath.itemId],
                    [fieldName]: updatedArray,
                  },
                },
              },
            },
          };
        });
      } else {
        // Direct array field outside tab
        setFormValues((prev) => {
          const itemToRemove = prev?.[activeSection]?.arrays?.[fieldName]?.[itemId];

          const updatedArray = {
            ...prev?.[activeSection]?.arrays?.[fieldName],
          };
          delete updatedArray[itemId];

          // Track deleted catalog items
          const deletedCatalogItems = prev?.[activeSection]?.deleted_catalog_items || [];
          const updatedDeletedItems =
            itemToRemove?.is_catalog_item && itemToRemove?.catalog_product_id
              ? [...deletedCatalogItems, itemToRemove.catalog_product_id]
              : deletedCatalogItems;

          return {
            ...prev,
            [activeSection]: {
              ...prev?.[activeSection],
              deleted_catalog_items: updatedDeletedItems,
              arrays: {
                ...prev?.[activeSection]?.arrays,
                [fieldName]: updatedArray,
              },
            },
          };
        });
      }
    }
  };

  const handleArrayRemoveOld = (
    field: FieldConfig,
    itemId: string,
    parentPath?: FieldPath,
    tabIndex?: number | null,
  ) => {
    const arrayPath = parentPath?.parentFieldName
      ? `${parentPath.parentFieldName}.${parentPath.itemId}.${field.name}`
      : field.name;

    // Update UUIDs
    setUuids((prev) => ({
      ...prev,
      [`${activeSection}${tabIndex !== null ? `.${tabIndex}` : ""}.${arrayPath}`]: (
        prev[`${activeSection}${tabIndex !== null ? `.${tabIndex}` : ""}.${arrayPath}`] || []
      ).filter((id) => id !== itemId),
    }));

    // Remove form values for the array item
    setFormValues((prev) => {
      const sectionValues = prev[activeSection] || {};

      if (tabIndex !== null) {
        const tabId = sectionUpdates?.[activeSection]?.tabs?.[tabIndex]?.id;

        // ✅ Delete from arrays inside a specific tab
        const tab = sectionValues.tabs[tabId];
        const updatedArray = { ...(tab.arrays[arrayPath] || {}) };
        delete updatedArray[itemId];
        const tabs = {
          ...sectionValues.tabs,
          [tabId]: {
            ...tab,
            arrays: {
              ...tab.arrays,
              [arrayPath]: updatedArray,
            },
          },
        };

        return {
          ...prev,
          [activeSection]: {
            ...sectionValues,
            tabs,
          },
        };
      }

      // ✅ Delete from arrays directly under section
      if (!sectionValues.arrays?.[arrayPath]) return prev;

      const updatedArray = { ...sectionValues.arrays[arrayPath] };
      delete updatedArray[itemId];

      return {
        ...prev,
        [activeSection]: {
          ...sectionValues,
          arrays: {
            ...sectionValues.arrays,
            [arrayPath]: updatedArray,
          },
        },
      };
    });
  };

  useEffect(() => {
    const fetchTemplates = async () => {
      const { data, error } = await supabase
        .from("estimate_text_templates")
        .select("id,name,html")
        .eq("scope", "custom_page_text")
        .order("created_at", { ascending: true });
      if (!error && data) {
        setTextTemplates(
          (data as TextTemplate[]).map((t) => ({
            id: t.id,
            name: t.name || "",
            html: t.html || "",
          })),
        );
      } else if (error) {
        console.warn("Failed to load templates from Supabase", error);
        toast({
          title: "Could not load templates",
          description: error.message,
          variant: "destructive",
        });
      }
    };
    fetchTemplates();
  }, [toast]);

  // Normalize HTML for comparison (editors may produce slightly different markup)
  const normalizeHtml = useCallback((s: string) => {
    return (s || "")
      .trim()
      .replace(/\s+/g, " ")
      .replace(/>\s+</g, "><");
  }, []);

  // Keep dropdown selection in sync with selected id/content.
  useEffect(() => {
    if (textTemplates.length === 0) {
      if (selectedTemplateId) setSelectedTemplateId(null);
      if (selectedTemplateIdx) setSelectedTemplateIdx("");
      return;
    }

    // Prefer explicit selected id whenever available.
    if (selectedTemplateId) {
      const selectedIdx = textTemplates.findIndex((t) => t.id === selectedTemplateId);
      if (selectedIdx !== -1) {
        const nextIdx = String(selectedIdx);
        if (selectedTemplateIdx !== nextIdx) setSelectedTemplateIdx(nextIdx);
        return;
      }
      // Selected template no longer exists (e.g. deleted elsewhere).
      setSelectedTemplateId(null);
    }

    const currentHtml: string = formValues?.[activeSection]?.textHtml || "";
    if (!currentHtml) {
      if (selectedTemplateIdx) setSelectedTemplateIdx("");
      return;
    }

    const n = normalizeHtml(currentHtml);
    const idx = textTemplates.findIndex((t) => {
      const th = t.html || "";
      return th === currentHtml || normalizeHtml(th) === n;
    });
    if (idx === -1) {
      if (selectedTemplateIdx) setSelectedTemplateIdx("");
      return;
    }

    const t = textTemplates[idx];
    if (!t?.id) return;

    setSelectedTemplateId(t.id);
    const nextIdx = String(idx);
    if (selectedTemplateIdx !== nextIdx) setSelectedTemplateIdx(nextIdx);
  }, [activeSection, formValues, textTemplates, normalizeHtml, selectedTemplateId, selectedTemplateIdx]);

  useEffect(() => {
    if (activeSection !== 6) return;

    const section = sectionUpdates?.find((sec) => sec.id === activeSection);
    if (!section?.tabs || section.tabs.length === 0) return;

    const populateProductsInSections = () => {
      const updates: Record<string, QuoteTabData> = {};
      let hasChanges = false;

      section.tabs.forEach((tab, tabIndex) => {
        const tabId = tab.id;
        const deletedCatalogItems = formValues[activeSection]?.tabs?.[tabId]?.deleted_catalog_items || [];

        // ── Products assigned via the legacy product.tab array ──
        const legacyTabProducts = products.filter(
          (product) => product.tab && product.tab.includes(tabId)
        );

        const supplierTabProducts = products.filter((product) => {
          if (product.tab && product.tab.includes(tabId)) return false;
          const rawSts = product.calculation?.supplier_tab_sections;
          if (!rawSts) return false;
          const sts = normaliseSupplierTabSections(rawSts);
          return Object.values(sts).some((assignments) =>
            assignments.some((a) => a.tab_id === tabId)
          );
        });

        const allTabProducts = [...legacyTabProducts, ...supplierTabProducts];
        if (allTabProducts.length === 0) return;

        if (!updates[tabId]) {
          updates[tabId] = {
            ...formValues[activeSection]?.tabs?.[tabId],
            arrays: {
              ...formValues[activeSection]?.tabs?.[tabId]?.arrays,
              sections: {
                ...formValues[activeSection]?.tabs?.[tabId]?.arrays?.sections,
              },
            },
          };
        }

        allTabProducts.forEach((product) => {
          if (deletedCatalogItems.includes(product.id)) return;

          const isLegacy = product.tab && product.tab.includes(tabId);

          if (isLegacy) {
            const tabIndexInProduct = product.tab!.indexOf(tabId);
            const targetSectionId = product.sections?.[tabIndexInProduct];
            if (!targetSectionId) return;

            const deletedSections = formValues[activeSection]?.permanently_deleted_sections || [];
            if (deletedSections.includes(targetSectionId)) return;

            const existingItems =
              formValues[activeSection]?.tabs?.[tabId]?.arrays?.sections?.[targetSectionId]?.items || {};
            const productExists = Object.values(existingItems).some(
              (item: QuoteItem) => item.catalog_product_id === product.id
            );
            if (productExists) return;

            const sps = product.product_suppliers ?? [];
            const preferred = sps.find((sp) =>
              (sp.variants ?? []).some((v) => v.is_preferred)
            );
            const resolvedSp = preferred ?? sps[0];
            const resolvedVariant =
              (resolvedSp?.variants ?? []).find((v) => v.is_preferred) ??
              resolvedSp?.variants?.[0];

            if (!updates[tabId].arrays.sections[targetSectionId]) {
              updates[tabId].arrays.sections[targetSectionId] = {
                ...formValues[activeSection]?.tabs?.[tabId]?.arrays?.sections?.[targetSectionId],
                items: {
                  ...formValues[activeSection]?.tabs?.[tabId]?.arrays?.sections?.[targetSectionId]?.items,
                },
              };
            }

            updates[tabId].arrays.sections[targetSectionId].items[product.id] = {
              text: product.name,
              price: resolvedVariant?.price ?? product.price ?? 0,
              quantity: product.quantity || 0,
              description: product.description || "",
              wastage_percentage: product.wastage_percentage || 0,
              is_catalog_item: true,
              catalog_product_id: product.id,
              catalog_supplier_id: resolvedSp?.supplier_id ?? null,
              catalog_variant_id: resolvedVariant?.id ?? null,
              unit_of_measure: resolvedVariant?.unit_of_measure ?? product.unit_of_measure ?? null,
              sku: resolvedVariant?.sku ?? null,
            };

            hasChanges = true;

          } else {
            const rawSts = product.calculation?.supplier_tab_sections;
            const sts = normaliseSupplierTabSections(rawSts);

            for (const [supplierId, assignments] of Object.entries(sts)) {
              const matchingAssignments = assignments.filter((a) => a.tab_id === tabId);
              if (matchingAssignments.length === 0) continue;

              const resolvedSp = (product.product_suppliers ?? []).find(
                (sp) => sp.supplier_id === supplierId
              );
              const resolvedVariant =
                (resolvedSp?.variants ?? []).find((v) => v.is_preferred) ??
                resolvedSp?.variants?.[0];

              matchingAssignments.forEach((assignment) => {
                const targetSectionId = assignment.section_id;
                if (!targetSectionId) return;

                const deletedSections = formValues[activeSection]?.permanently_deleted_sections || [];
                if (deletedSections.includes(targetSectionId)) return;
                const itemKey = `${product.id}::${supplierId}::${targetSectionId}`;

          const existingItems =
            formValues[activeSection]?.tabs?.[tabId]?.arrays?.sections?.[targetSectionId]?.items || {};

                const productExists = Object.entries(existingItems).some(([k, item]: [string, QuoteItem]) => {
                  if (k === itemKey) return true;
                  return (
                    item.catalog_product_id === product.id &&
                    item.catalog_supplier_id === supplierId
                  );
                });
          if (productExists) return;

          if (!updates[tabId].arrays.sections[targetSectionId]) {
            updates[tabId].arrays.sections[targetSectionId] = {
              ...formValues[activeSection]?.tabs?.[tabId]?.arrays?.sections?.[targetSectionId],
              items: {
                ...formValues[activeSection]?.tabs?.[tabId]?.arrays?.sections?.[targetSectionId]?.items,
              },
            };
          }

                updates[tabId].arrays.sections[targetSectionId].items[itemKey] = {
                  text: product.name,
                  price: resolvedVariant?.price ?? product.price ?? 0,
                  quantity: product.quantity || 0,
                  description: product.description || "",
                  wastage_percentage: product.wastage_percentage || 0,
                  is_catalog_item: true,
                  catalog_product_id: product.id,
                  catalog_supplier_id: supplierId,
                  catalog_variant_id: resolvedVariant?.id ?? null,
                  unit_of_measure: resolvedVariant?.unit_of_measure ?? product.unit_of_measure ?? null,
                  sku: resolvedVariant?.sku ?? null,
                };

                hasChanges = true;
              });
            }
          }
        });
      });

      if (hasChanges) {
        setFormValues((prev) => ({
          ...prev,
          [activeSection]: {
            ...prev[activeSection],
            tabs: {
              ...prev[activeSection]?.tabs,
              ...updates,
            },
          },
        }));
      }
    };

    populateProductsInSections();
  }, [activeSection, products, sectionUpdates]);

  const saveTextTemplate = async (html: string, name: string): Promise<TextTemplate | null> => {
    const { data, error } = await supabase.from("estimate_text_templates").insert({
      name: name.trim(),
      html,
      scope: "custom_page_text",
    } as Database["public"]["Tables"]["estimate_text_templates"]["Insert"]);
    if (error) {
      console.error("Failed to save template", error);
      toast({
        title: "Failed to save template",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
    const arr = data as TextTemplate[] | null;
    const inserted = Array.isArray(arr) && arr.length > 0 ? (arr[0] as Partial<TextTemplate>) : undefined;
    const savedTemplate: TextTemplate = {
      id: inserted?.id || crypto.randomUUID(),
      name: inserted?.name || name.trim(),
      html: inserted?.html || html,
    };
    setTextTemplates((prev) => [...prev, savedTemplate]);
    toast({ title: "Template saved", description: "Added to your templates." });
    return savedTemplate;
  };

  const updateTextTemplate = async (id: string, html: string, name?: string): Promise<boolean> => {
    const payload: Database["public"]["Tables"]["estimate_text_templates"]["Update"] = {
      html,
      ...(name !== undefined ? { name: name.trim() } : {}),
    };

    const { error } = await supabase.from("estimate_text_templates").update(payload).eq("id", id);

    if (error) {
      console.error("Failed to update template", error);
      toast({
        title: "Failed to update template",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    setTextTemplates((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              html,
              ...(name !== undefined ? { name: name.trim() } : {}),
            }
          : t,
      ),
    );

    toast({ title: "Template updated", description: "Your changes were saved." });
    return true;
  };

  const openSaveTemplateDialog = (html: string, options?: { preferSelectedName?: boolean; startEmpty?: boolean }) => {
    const selected = selectedTemplateId ? textTemplates.find((t) => t.id === selectedTemplateId) : null;
    setPendingTemplateHtml(options?.startEmpty ? "" : html);
    setTemplateName(options?.preferSelectedName === false ? "" : selected?.name || "");
    setIsSaveTemplateOpen(true);
  };

  const buildTemplateScope = (fieldName: string, path: FieldPath, tabIndex: number | null, fieldType?: string) => {
    if (activeSection === QuoteID) {
      if (fieldType === "textarea") return "quote_details_textarea";
      if (fieldType === "richtext") return "quote_details_richtext";
    }
    const tabId = tabIndex !== null ? sectionUpdates.find((sec) => sec.id === activeSection)?.tabs?.[tabIndex]?.id : null;
    const pathKey = [path.grandParentFieldName, path.parentFieldName, fieldName].filter(Boolean).join(".");
    return `quote_details:${activeSection}:${tabId || "no-tab"}:${pathKey || fieldName}`;
  };

  function generateField(
    config: FieldConfig,
    index: number,
    path: FieldPath = {},
    tabIndex: number | null = null,
    options?: { compactRichtext?: boolean }
  ) {
    const fieldValue = getFieldValue(config, path, tabIndex);

    const conditionalFields =
      config.conditionalFields?.[fieldValue] &&
      config.conditionalFields?.[fieldValue]?.map((condConfig, condIndex) => {
        return generateField(condConfig, condIndex, path, tabIndex, options);
      });

    switch (config.type) {
      case "text":
      case "number":
      case "email": {
        const isPriceField = config.name === "price";
        const isCatalogItem = path.parentFieldName
          ? getFieldValue({ name: "is_catalog_item", type: "switch" } as FieldConfig, path, tabIndex) === true
          : false;

        const isCatalogPriceField = isPriceField && isCatalogItem;
        return (
          <div
            key={`${config.name}-${index}-${path.itemId || ""}`}
            // className="w-[50%]"
            className={config.colSpan ? `col-span-${config.colSpan}` : "col-span-1"}
          >
            <Label htmlFor={config.name}>{config.label}</Label>
            <Input
              type={config.type}
              id={config.name}
              placeholder={config.placeholder || ""}
              value={fieldValue !== undefined && fieldValue !== null ? fieldValue : ""}
              onChange={(e) => handleFieldChange(config.name, e.target.value, path, tabIndex)}
              disabled={isCatalogPriceField}
              className={isCatalogPriceField ? "bg-muted cursor-not-allowed" : ""}
            />
          </div>
        );
      }

      case "date":
        return (
          <div
            key={`${config.name}-${index}-${path.itemId || ""}`}
            // className="w-[50%]"
          >
            <Label htmlFor={config.name}>{config.label}</Label>
            <DatePicker
              date={fieldValue ? new Date(fieldValue) : new Date()}
              onSelect={(date) => handleFieldChange(config.name, date?.toISOString() || "", path, tabIndex)}
            />
          </div>
        );

      case "upload":
        return (
          <div key={`${config.name}-${index}-${path.itemId || ""}`} className="w-full mt-8">
            {/* <div className="space-y-3 mt-3">
              <FileDropzone
                accept="application/pdf"
                valueDataUrl={
                  formValues[activeSection]?.file_storage_path
                    ? fileUploadService.getFileUrl(
                      formValues[activeSection]?.file_storage_path
                    )
                    : undefined
                }
                // onChange={() => {}}
                onChange={async (file, dataUrl) => {
                  if (file) {
                    // Validate file before upload
                    const validation = fileUploadService.validateFile(file);
                    if (!validation.valid) {
                      toast({
                        title: "Invalid file",
                        description: validation.error,
                        variant: "destructive",
                      });
                      return;
                    }

                    // Upload file to storage and update section
                    const { success, ...uploadResult } =
                      await fileUploadService.uploadFileByLocation(
                        file,
                        locationId
                      );

                    if (!success) {
                      return toast({
                        title: "File Upload Failed",
                        description: uploadResult.error,
                      });
                    }
                    const payload = {
                      file_storage_path: uploadResult.storagePath,
                      file_name: uploadResult.fileName,
                      file_size: uploadResult.fileSize,
                      file_type: uploadResult.fileType,
                    };

                    Object.keys(payload).forEach((key) => {
                      handleFieldChange(key, payload[key], {}, null);
                    });

                    toast({
                      title: "File uploaded successfully",
                      description: "File has been saved to storage",
                    });
                  } else {
                    const payload = {
                      file_storage_path: "",
                      file_name: "",
                      file_size: "",
                      file_type: "",
                    };

                    Object.keys(payload).forEach((key) => {
                      handleFieldChange(key, payload[key], {}, null);
                    });

                    toast({
                      title: "File removed",
                      description: "File reference has been removed",
                    });
                  }
                }}
              />
              {formValues[activeSection]?.file_storage_path && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>File: {formValues[activeSection]?.file_name}</div>
                  <div>
                    Size:{" "}
                    {(
                      (formValues[activeSection]?.file_size || 0) / 1024
                    ).toFixed(1)}{" "}
                    KB
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        fileUploadService.downloadFile(
                          formValues[activeSection]?.file_storage_path,
                          formValues[activeSection]?.file_name
                        )
                      }
                    >
                      Download
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const payload = {
                          file_storage_path: "",
                          file_name: "",
                          file_size: "",
                          file_type: "",
                        };

                        Object.keys(payload).forEach((key) => {
                          handleFieldChange(key, payload[key], {}, null);
                        });
                      }}
                    >
                      Remove File
                    </Button>
                  </div>
                </div>
              )}
            </div> */}
            <FileDropzone
              label={config.label}
              accept={config.allowedTypes?.includes("images") ? "image/*" : "*/*"}
              multiple={config.multiple || false}
              valueDataUrl={
                fieldValue?.file_storage_path ? fileUploadService.getFileUrl(fieldValue?.file_storage_path) : ""
              }
              fileLibrary={
                locationId ? { locationId, contactId: contactId ?? undefined } : null
              }
              onLinkFromLibrary={(linked) => {
                handleFieldChange(
                  config.name,
                  {
                    file_storage_path: linked.file_storage_path,
                    file_name: linked.file_name,
                    file_size: linked.file_size,
                    file_type: linked.file_type,
                  },
                  path,
                  tabIndex,
                );
                toast({
                  title: "File linked",
                  description: "An existing upload is now attached to this field.",
                });
              }}
              onChange={async (file, dataUrl) => {
                if (file) {
                  // Validate file before upload
                  const validation = fileUploadService.validateFile(file, true);
                  if (!validation.valid) {
                    toast({
                      title: "Invalid file",
                      description: validation.error,
                      variant: "destructive",
                    });
                    return;
                  }

                  // Upload file to storage and update section
                  const { success, ...uploadResult } = await fileUploadService.uploadFileByLocation(file, locationId);

                  if (!success) {
                    return toast({
                      title: "File Upload Failed",
                      description: uploadResult.error,
                    });
                  }
                  const payload = {
                    file_storage_path: uploadResult.storagePath,
                    file_name: uploadResult.fileName,
                    file_size: uploadResult.fileSize,
                    file_type: uploadResult.fileType,
                  };

                  // Object.keys(payload).forEach((key) => {
                  //   handleFieldChange(key, payload[key], {}, null);
                  // });
                  handleFieldChange(config.name, payload, path, tabIndex);

                  toast({
                    title: "File uploaded successfully",
                    description: "File has been saved to storage",
                  });
                } else {
                  const payload = {
                    file_storage_path: "",
                    file_name: "",
                    file_size: "",
                    file_type: "",
                  };

                  Object.keys(payload).forEach((key) => {
                    handleFieldChange(config.name, null, path, tabIndex);
                  });

                  toast({
                    title: "File removed",
                    description: "File reference has been removed",
                  });
                }
              }}
            />
          </div>
        );

      case "textarea":
        return (
          <div
            key={`${config.name}-${index}-${path.itemId || ""}`}
            className={config.colSpan ? `col-span-${config.colSpan}` : "col-span-2"}
          >
            <Label htmlFor={config.name}>{config.label}</Label>
            <div className="mb-2">
              <TemplateControls
                scope={buildTemplateScope(config.name, path, tabIndex, config.type)}
                value={fieldValue || ""}
                onChange={(next) => handleFieldChange(config.name, next, path, tabIndex)}
                editorType="textarea"
                onAfterUpdate={onSaveRequested}
              />
            </div>
            <Textarea
              id={config.name}
              placeholder={config.placeholder || ""}
              value={fieldValue || ""}
              onChange={(e) => handleFieldChange(config.name, e.target.value, path, tabIndex)}
            />
          </div>
        );

      case "dropdown":
        return (
          <div key={`${config.name}-${index}-${path.itemId || ""}`} className="gap-2 items-center">
            <Label>{config.label}</Label>
            <Select
              value={fieldValue || ""}
              onValueChange={(val) => handleFieldChange(config.name, val, path, tabIndex)}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder={config.placeholder || "Select option"} />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background">
                {config.options && config.options.length > 0 ? (
                  config.options.map((opt, i) => (
                    <SelectItem key={i} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="__none__" disabled>
                    No options available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        );

      case "richtext":
        return (
          <div
            key={`${config.name}-${index}-${path.itemId || ""}`}
            className={`col-span-2 ${options?.compactRichtext ? "min-w-0 max-w-full overflow-x-auto" : ""}`}
          >
            <Label>{config.label}</Label>
            <div className="my-2">
              <TemplateControls
                scope={buildTemplateScope(config.name, path, tabIndex, config.type)}
                value={fieldValue || ""}
                onChange={(next) => handleFieldChange(config.name, next, path, tabIndex)}
                editorType="richtext"
                onAfterUpdate={onSaveRequested}
              />
            </div>
            <RichTextEditor
              value={fieldValue || ""}
              onChange={(html) => handleFieldChange(config.name, html, path, tabIndex)}
              compact={options?.compactRichtext}
            />
          </div>
        );

      case "slider":
        return (
          <div key={`${config.name}-${index}-${path.itemId || ""}`}>
            <Label>{config.label}</Label>
            <div className="flex items-center gap-3">
              <Slider
                value={[fieldValue || config.default || config.min || 0]}
                min={config.min || 0}
                max={config.max || 100}
                step={config.step || 1}
                onValueChange={(v) => handleFieldChange(config.name, v[0], path, tabIndex)}
                className="flex-1"
              />
              <Input
                key={`slider-input-${config.name}-${fieldValue}`}
                type="number"
                min={config.min || 0}
                max={config.max || 100}
                defaultValue={fieldValue || config.default || ""}
                onInput={(e) => {
                  // Only update when using arrow keys (value changes by step amount)
                  const newValue = Number(e.currentTarget.value);
                  const step = config.step || 1;
                  const diff = Math.abs(newValue - (fieldValue || config.default || 0));

                  if (diff === step && !isNaN(newValue)) {
                    handleFieldChange(config.name, newValue, path, tabIndex);
                  }
                }}
                onBlur={(e) => {
                  const numValue = Number(e.target.value);
                  const clampedValue = Math.max(
                    config.min || 0,
                    Math.min(config.max || 100, isNaN(numValue) ? config.min || 0 : numValue),
                  );
                  handleFieldChange(config.name, clampedValue, path, tabIndex);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  }
                }}
                className="w-20"
              />
              <span className="text-sm">%</span>
            </div>
          </div>
        );

      case "radio":
        return (
          <div key={`${config.name}-${index}-${path.itemId || ""}`} className="space-y-4">
            <Label>{config.label}</Label>
            <RadioGroup
              value={fieldValue || config.default || ""}
              onValueChange={(val) => handleFieldChange(config.name, val, path, tabIndex)}
            >
              {config.options?.map((opt, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <RadioGroupItem value={opt.value} id={`${config.name}-${opt.value}-${path.itemId || ""}`} />
                  <Label htmlFor={`${config.name}-${opt.value}-${path.itemId || ""}`}>{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case "switch":
        return (
          <>
            <div className="flex flex-row gap-5">
              {config.label && <p>{config.label}</p>}
              <Switch
                checked={fieldValue || config.default || false}
                onCheckedChange={() =>
                  handleFieldChange(config.name, !(fieldValue || config.default || false), path, tabIndex)
                }
                className="shrink-0"
              />
            </div>
            {conditionalFields}
          </>
        );

      case "array": {
        const arrayItems = getArrayItems(config.name, path, tabIndex);
        const hasSectionTitle = config.fields?.some((field) => field.name === "section_title");
        const hasNestedArray = config.fields?.some((field) => field.type === "array");
        const shouldShowAccordion = hasSectionTitle && hasNestedArray;

        const isQuoteDetailsItems =
          activeSection === QuoteID &&
          config.name === "items" &&
          path.parentFieldName === "sections" &&
          tabIndex !== null;
        return (
          <div key={`${config.name}-${index}-${path.itemId || ""}`} className="col-span-2">
            <h4 className="font-medium capitalize">{config.label}</h4>

            {arrayItems.map((itemId) => {
              const sectionId = `${activeSection}-${config.name}-${itemId}-${tabIndex || "no-tab"}`;
              const isExpanded = expandedSections[sectionId];

              // Check if this is a catalog item
              const childPath = {
                parentFieldName: config.name,
                itemId: itemId,
                ...(path.parentFieldName
                  ? {
                      grandParentFieldName: path.parentFieldName,
                      parentItemId: path.itemId,
                    }
                  : {}),
              };

              const isCatalogItem =
                getFieldValue({ name: "is_catalog_item", type: "switch" } as FieldConfig, childPath, tabIndex) === true;

              if (shouldShowAccordion) {
                const sectionTitleField = config.fields.find((field) => field.name === "section_title");
                const otherFields = config.fields.filter((field) => field.name !== "section_title");

                const sectionTitleValue =
                  getFieldValueForAccordion("section_title", childPath, tabIndex) || "Untitled Section";

                // Check if this is a Quote Details subsection with items (for propagation toggle)
                const isQuoteDetailsSubsection =
                  activeSection === QuoteID && config.name === "sections" && tabIndex !== null;

                const taxField = otherFields.find((f) => f.name === "Tax");
                const marginField = otherFields.find((f) => f.name === "Margin");
                const remainingFields = otherFields.filter((f) => f.name !== "Tax" && f.name !== "Margin");
                return (
                  <div key={itemId} className="border border-gray-200 rounded-lg mb-3">
                    <div
                      className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50 border-b"
                      onClick={() => toggleSection(sectionId)}
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDownIcon className="w-4 h-4" />
                        ) : (
                          <ChevronRightIcon className="w-4 h-4" />
                        )}
                        <span className="font-medium">{sectionTitleValue}</span>
                        {isQuoteDetailsSubsection && (
                          <div className="flex items-center gap-2 ml-2" onClick={(e) => e.stopPropagation()}>
                            <Switch
                              checked={sectionPropagation[itemId] !== false}
                              onCheckedChange={(checked) => {
                                setSectionPropagation((prev) => ({
                                  ...prev,
                                  [itemId]: checked,
                                }));
                              }}
                            />
                            <span className="text-xs text-muted-foreground">Sync across tabs</span>
                          </div>
                        )}
                      </div>

                      <Button
                        variant="link"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArrayRemove(config, itemId, path, tabIndex);
                        }}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>

                    {isExpanded && (
                      <div className="p-3">
                        {/* Section Title with Tax and Margin switches in one row */}
                        <div className="mb-3 grid grid-cols-12 gap-3 items-center">
                          <div className="col-span-5 flex items-center gap-2">
                            <Label className="whitespace-nowrap">{sectionTitleField?.label || "Section Title"}:</Label>
                            <Input
                              type="text"
                              value={getFieldValue(sectionTitleField, childPath, tabIndex) || ""}
                              onChange={(e) =>
                                handleFieldChange(sectionTitleField.name, e.target.value, childPath, tabIndex)
                              }
                              className="flex-1"
                            />
                          </div>
                          {taxField && (
                            <div className="col-span-3">{generateField(taxField, 0, childPath, tabIndex)}</div>
                          )}
                          {marginField && (
                            <div className="col-span-4">{generateField(marginField, 0, childPath, tabIndex)}</div>
                          )}
                        </div>

                        {/* Remaining fields (items array) */}
                        <div className={`grid ${config.inputsInRow && `grid-cols-${config.inputsInRow}`} gap-3`}>
                          {remainingFields.map((childField, idx) => {
                            return generateField(childField, idx, childPath, tabIndex);
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              } else if (isCatalogItem && config.name === "items") {
                // Enhanced UI for catalog items using ProductCard component
                const richtextFields = config.fields?.filter((f) => f.type === "richtext") ?? [];
                const extraFieldsContent =
                  richtextFields.length > 0 ? (
                    <div className="space-y-2">
                      {richtextFields.map((field, idx) =>
                        generateField(field, idx, childPath, tabIndex, { compactRichtext: true })
                      )}
                    </div>
                  ) : null;

                const itemData = {
                  text: getFieldValue({ name: "text", type: "text" } as FieldConfig, childPath, tabIndex),
                  price: getFieldValue({ name: "price", type: "number" } as FieldConfig, childPath, tabIndex),
                  quantity: getFieldValue({ name: "quantity", type: "number" } as FieldConfig, childPath, tabIndex),
                  wastage_percentage: getFieldValue({ name: "wastage_percentage", type: "number" } as FieldConfig, childPath, tabIndex),
                  description: getFieldValue({ name: "description", type: "textarea" } as FieldConfig, childPath, tabIndex),
                  catalog_product_id: getFieldValue({ name: "catalog_product_id", type: "text" } as FieldConfig, childPath, tabIndex),
                  catalog_supplier_id: getFieldValue({ name: "catalog_supplier_id", type: "text" } as FieldConfig, childPath, tabIndex),
                  catalog_variant_id: getFieldValue({ name: "catalog_variant_id", type: "text" } as FieldConfig, childPath, tabIndex),
                  sku: getFieldValue({ name: "sku", type: "text" } as FieldConfig, childPath, tabIndex),
                  unit_of_measure: getFieldValue({ name: "unit_of_measure", type: "text" } as FieldConfig, childPath, tabIndex),
                };

                // Get product details from catalog
                const catalogProduct = products.find((p) => p.id === itemData.catalog_product_id);

                const sectionTitle = (() => {
                  if (tabIndex !== null) {
                    const tabId = sectionUpdates.find((sec) => sec.id === activeSection)?.tabs?.[tabIndex]?.id;
                    return formValues[activeSection]?.tabs?.[tabId]?.arrays?.sections?.[path.itemId]?.section_title;
                  }
                  return formValues[activeSection]?.arrays?.sections?.[path.itemId]?.section_title;
                })();

                return (
                  <ProductCard
                    key={itemId}
                    itemId={itemId}
                    productData={itemData}
                    catalogProduct={catalogProduct}
                    categories={categories}
                    suppliers={suppliers}
                    sectionTitle={sectionTitle}
                    onQuantityChange={(value) => handleFieldChange("quantity", value, childPath, tabIndex)}
                    onDelete={() => handleArrayRemove(config, itemId, path, tabIndex)}
                  >
                    {extraFieldsContent}
                  </ProductCard>
                );
              } else {
                return (
                  <Card key={itemId} className="p-4 relative my-4 border border-gray-200 bg-gray-50">
                    <div className="absolute top-2 right-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleArrayRemove(config, itemId, path, tabIndex)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className={`grid ${config.inputsInRow && `grid-cols-${config.inputsInRow}`} gap-3`}>
                      {config.fields?.map((childField, idx) => {
                        return generateField(childField, idx, childPath, tabIndex);
                      })}
                    </div>
                  </Card>
                );
              }
            })}

            {shouldShowAccordion ? (
              <Button variant="link" className="text-primary" onClick={() => handleArrayAdd(config, path, tabIndex)}>
                + Add Section
              </Button>
            ) : (
              <Button
                variant="link"
                className="text-primary"
                onClick={() => {
                  if (isQuoteDetailsItems) {
                    setCurrentConfig(config);
                    setCurrentPath(path);
                    setCurrentTabIndex(tabIndex);
                    setIsAddItemModalOpen(true);
                  } else {
                    handleArrayAdd(config, path, tabIndex);
                  }
                }}
              >
                + Add Item
              </Button>
            )}
          </div>
        );
      }

      default:
        return <React.Fragment key={`${config.name}-${index}-${path.itemId || ""}`}></React.Fragment>;
    }
  }

  const [activeTab, setActiveTab] = useState("0");

  // Add these functions inside your component
  const handleTabAdd = (sectionId: number) => {
    const newTabId = uuidv4();

    setSectionUpdates((prev) => {
      const newSections = prev ? JSON.parse(JSON.stringify(prev)) : JSON.parse(JSON.stringify(sectionUpdates));
      const sectionIndex = newSections.findIndex((s) => s.id === sectionId);

      if (sectionIndex === -1) return prev || sectionUpdates;

      const section = newSections[sectionIndex];
      if (section.maxAllowedTabs && (section.tabs?.length || 0) >= section.maxAllowedTabs) {
        return prev;
      }

      const newTab: TabConfig = {
        id: newTabId,
        title: `Quote ${(section.tabs?.length || 0) + 1}`,
        sortOrder: (section.tabs?.length || 0) + 1,
        useTemplate: true,
      };

      section.tabs = [...(section.tabs || []), newTab];
      return newSections;
    });

    // Initialize form values for the new tab
    setFormValues((prev) => {
      const sectionValues = prev[sectionId] || {};
      return {
        ...prev,
        [sectionId]: {
          ...sectionValues,
          tabs: {
            ...sectionValues.tabs,
            [newTabId]: {},
          },
        },
      };
    });
  };

  const handleTabRemove = (sectionId: number, tabId: string) => {
    setSectionUpdates((prev) => {
      const newSections = prev ? JSON.parse(JSON.stringify(prev)) : JSON.parse(JSON.stringify(sectionUpdates));
      const sectionIndex = newSections.findIndex((s) => s.id === sectionId);

      if (sectionIndex === -1) return prev || sectionUpdates;

      const section = newSections[sectionIndex];
      if (section.tabs) {
        section.tabs = section.tabs.filter((tab) => tab.id !== tabId);
      }

      return newSections;
    });

    // Remove form values for the tab
    setFormValues((prev) => {
      const sectionValues = prev[sectionId] || {};
      if (!sectionValues.tabs) return prev;

      const updatedTabs = { ...sectionValues.tabs };
      delete updatedTabs[tabId];

      return {
        ...prev,
        [sectionId]: {
          ...sectionValues,
          tabs: updatedTabs,
        },
      };
    });
  };

  const [tabRename, setTabRename] = useState(false);
  const [activeTabTitle, setActiveTabTitle] = useState("");

  const toggleSection = (sectionKey: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const handleTabRenameToggle = (tabIndex) => {
    setSectionUpdates((prev) => {
      return prev.map((sec) => {
        if (sec.id === activeSection) {
          if (sec.tabs && sec.tabs[tabIndex] && activeTabTitle) {
            sec.tabs[tabIndex].title = activeTabTitle;
          }
        }
        return sec;
      });
    });

    setTabRename((prev) => !prev);
  };

  // Add this function to render tabs for a section
  // Update the renderTabs function
  const renderTabs = (section: SectionConfig) => {
    if (!section.tabs || section.tabs.length === 0) return null;

    return (
      <div className="space-y-4 mt-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-wrap gap-2 border-b pb-2 items-center">
            {/* TABS */}
            <TabsList className="">
              {section.tabs.map((tab, tabIndex) => {
                return (
                  <TabsTrigger value={tabIndex.toString()} className="w-full">
                    {tab.title}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-500 ml-2"
                      disabled={section.tabs.length <= 1}
                      onClick={() => handleTabRemove(section.id, tab.id)}
                    >
                      <TrashIcon className="h-3 w-3" />
                    </Button>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* ADD NEW TAB BUTTON */}
            {section.allowNewTabs && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTabAdd(section.id)}
                disabled={section.maxAllowedTabs ? (section.tabs?.length || 0) >= section.maxAllowedTabs : false}
              >
                +
              </Button>
            )}
          </div>

          {/* TAB CONTENT */}
          {section.tabs.map((tab, tabIndex) => (
            <TabsContent value={tabIndex.toString()}>
              <div key={tab.id} className="">
                <div className="flex items-center">
                  {tabRename ? (
                    <Input
                      type="text"
                      placeholder={tab.title}
                      value={activeTabTitle}
                      onChange={(e) => setActiveTabTitle(e.target.value)}
                    />
                  ) : (
                    <h2>{tab.title}</h2>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-2"
                    onClick={() => handleTabRenameToggle(tabIndex)}
                  >
                    {tabRename ? <Check className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
                  </Button>
                </div>

                {tab.useTemplate ? (
                  section.template
                    ?.slice()
                    .sort((a, b) => {
                      const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
                      const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
                      return orderA - orderB;
                    })
                    .map((sec, index) => (
                      <div key={`section-${index}`} className="mt-3">
                        <div className="border rounded-md p-3 mt-3">
                          <h3 className="font-semibold tracking-tight text-lg">{sec?.title}</h3>
                          <p className="font-regular tracking-tight text-sm pb-3">{sec?.description}</p>
                          <div className="grid gap-3">
                            {sec?.fields?.map((field, idx) => generateField(field, idx, {}, tabIndex))}
                          </div>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-muted-foreground text-sm">Custom fields configuration would go here</div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    );
  };

  const handleSectionTitleUpdate = () => {
    if (editingTitle) {
      setSectionUpdates((prev) => {
        return prev?.map((sec) => (sec.id === activeSection ? { ...sec, title } : sec));
      });
    }
    setEditingTitle((prev) => !prev);
  };

  const handleRemoveSection = () => {
    setSectionUpdates((prev) => {
      setFormValues((prevFromVals) => {
        const updatedValues = { ...prevFromVals };
        delete updatedValues[activeSection];
        return updatedValues;
      });
      const oldActiveSection = activeSection;
      setActiveSection(1);
      return prev?.filter((sec) => sec.id !== oldActiveSection);
    });
  };

  const handleAddItemConfirm = (type: 'custom' | 'catalog', selectedItems?: SelectedCatalogItem[]) => {
    if (!currentConfig || !currentPath) return;

    if (type === 'catalog' && selectedItems && selectedItems.length > 0) {
      const tabId =
        currentTabIndex !== null
          ? sectionUpdates.find((sec) => sec.id === activeSection)?.tabs?.[currentTabIndex]?.id
          : null;

      const existingItems =
        currentTabIndex !== null
          ? formValues[activeSection]?.tabs?.[tabId]?.arrays?.[currentPath.parentFieldName]?.[currentPath.itemId]?.[
              currentConfig.name
            ] || {}
          : formValues[activeSection]?.arrays?.[currentPath.parentFieldName]?.[currentPath.itemId]?.[
              currentConfig.name
            ] || {};

      let addedCount = 0;
      let skippedCount = 0;

      selectedItems.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (!product) return;

        // CHECK FOR DUPLICATES BEFORE ADDING
        const isDuplicate = Object.values(existingItems).some((item: QuoteItem) => {
          // Primary check: exact catalog match
          if (item.catalog_product_id === product.id) {
            return true;
          }

          // Secondary check: name + price match (case-insensitive)
          const itemName = (item.text || "").trim().toLowerCase();
          const productName = (product.name || "").trim().toLowerCase();
          const itemPrice = parseFloat(item.price) || 0;
          const productPrice = product.price || 0;

          // If both name and price match, consider it a duplicate
          if (itemName === productName && itemPrice === productPrice) {
            return true;
          }
        });

        // const isDuplicate = Object.values(existingItems).some((existing: any) => {
        //   if (item.variantId && existing.catalog_variant_id === item.variantId) return true;
        //   if (!item.variantId && existing.catalog_product_id === product.id) return true;
        //   return false;
        // });

        if (isDuplicate) {
          skippedCount++;
          return; // Skip this product
        }

        const initialValues = {
          text: product.name || '',
          // Price priority: variant price from SelectedCatalogItem
          price: item.price,
          quantity: product.quantity || 0,
          description: product.description || '',
          wastage_percentage: product.wastage_percentage || 0,
          is_catalog_item: true,
          catalog_product_id: product.id,
          catalog_variant_id: item.variantId ?? null,
          catalog_supplier_id: item.supplierId ?? null,
          sku: item.sku ?? null,
          unit_of_measure: item.unitOfMeasure ?? null,
        };
        handleArrayAdd(currentConfig, currentPath, currentTabIndex, initialValues);
        addedCount++;
      });

      // Show appropriate toast message
      if (addedCount > 0 && skippedCount > 0) {
        toast({
          title: "Products Added",
          description: `${addedCount} product(s) added successfully. ${skippedCount} duplicate(s) skipped.`,
        });
      } else if (addedCount > 0) {
        toast({
          title: "Products Added",
          description: `${addedCount} product(s) added successfully`,
        });
      } else if (skippedCount > 0) {
        toast({
          title: "Duplicates Detected",
          description: `${skippedCount} selected product(s) already exist in this section.`,
          variant: "destructive",
        });
      }
    } else {
      // Add custom item
      const initialValues = {
        is_catalog_item: false,
        price: 0,
        quantity: 0,
        wastage_percentage: 0,
      };
      handleArrayAdd(currentConfig, currentPath, currentTabIndex, initialValues);
    }

    // Reset modal state
    setIsAddItemModalOpen(false);
    setCurrentConfig(null);
    setCurrentPath(null);
    setCurrentTabIndex(null);
  };

  if (!section) {
    return <h1>Please select a section to continue</h1>;
  }

  return (
    <>
      <div className=" p-4 min-h-[500px] overflow-auto">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            {editingTitle ? (
              <>
                <Input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
              </>
            ) : (
              <h3 className="font-semibold tracking-tight text-lg">{section?.title}</h3>
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6 ml-2" onClick={handleSectionTitleUpdate}>
              {editingTitle ? <Check className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
            </Button>
          </div>
          {section?.type === "custom" && (
            <div className="flex items-center justify-end mb-3">
              <Button variant="outline" size="sm" onClick={handleRemoveSection}>
                <TrashIcon className="w-3 h-3 text-red-500" />
              </Button>
            </div>
          )}
        </div>

        {section?.allowNewTabs
          ? renderTabs(section)
          : section?.sections
              ?.slice()
              .sort((a, b) => {
                const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
                const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
                return orderA - orderB;
              })
              .map((sec, index) => {
                const sectionKey = `section-${activeSection}-${index}`;
                const isExpanded = expandedSections[sectionKey] !== false; // Default to expanded

                return (
                  <div key={`section-${index}`} className="border p-3 rounded-md mt-3">
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleSection(sectionKey)}
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold tracking-tight text-lg">{sec?.title}</h3>
                        <p className="font-regular tracking-tight text-sm pb-3">{sec?.description}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </div>
                    {isExpanded && (
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        {sec?.fields?.map((field, idx) => generateField(field, idx))}
                      </div>
                    )}
                  </div>
                );
              })}

        {section?.type === "custom" && (
          <div className="space-y-3">
            {formValues[activeSection]?.content_type === "my_pdfs" && (
              <div className="text-sm text-muted-foreground mt-3">No PDFs available for selection.</div>
            )}
            {formValues[activeSection]?.content_type === "shared_pdfs" && (
              <div className="text-sm text-muted-foreground mt-3">No shared PDFs available.</div>
            )}
            {formValues[activeSection]?.content_type === "single_use_pdf" && (
              <div className="space-y-3 mt-3">
                <FileDropzone
                  accept="application/pdf"
                  valueDataUrl={
                    formValues[activeSection]?.file_storage_path
                      ? fileUploadService.getFileUrl(formValues[activeSection]?.file_storage_path)
                      : undefined
                  }
                  fileLibrary={
                    locationId ? { locationId, contactId: contactId ?? undefined } : null
                  }
                  onLinkFromLibrary={(linked) => {
                    const payload = {
                      file_storage_path: linked.file_storage_path,
                      file_name: linked.file_name,
                      file_size: linked.file_size,
                      file_type: linked.file_type,
                    };
                    Object.keys(payload).forEach((key) => {
                      handleFieldChange(key, payload[key as keyof typeof payload], {}, null);
                    });
                    toast({
                      title: "File linked",
                      description: "An existing upload is now attached to this section.",
                    });
                  }}
                  // onChange={() => {}}
                  onChange={async (file, dataUrl) => {
                    if (file) {
                      // Validate file before upload
                      const validation = fileUploadService.validateFile(file);
                      if (!validation.valid) {
                        toast({
                          title: "Invalid file",
                          description: validation.error,
                          variant: "destructive",
                        });
                        return;
                      }

                      // Upload file to storage and update section
                      const { success, ...uploadResult } = await fileUploadService.uploadFileByLocation(
                        file,
                        locationId,
                      );

                      if (!success) {
                        return toast({
                          title: "File Upload Failed",
                          description: uploadResult.error,
                        });
                      }
                      const payload = {
                        file_storage_path: uploadResult.storagePath,
                        file_name: uploadResult.fileName,
                        file_size: uploadResult.fileSize,
                        file_type: uploadResult.fileType,
                      };

                      Object.keys(payload).forEach((key) => {
                        handleFieldChange(key, payload[key], {}, null);
                      });

                      toast({
                        title: "File uploaded successfully",
                        description: "File has been saved to storage",
                      });
                    } else {
                      const payload = {
                        file_storage_path: "",
                        file_name: "",
                        file_size: "",
                        file_type: "",
                      };

                      Object.keys(payload).forEach((key) => {
                        handleFieldChange(key, payload[key], {}, null);
                      });

                      toast({
                        title: "File removed",
                        description: "File reference has been removed",
                      });
                    }
                  }}
                />
                {formValues[activeSection]?.file_storage_path && (
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>File: {formValues[activeSection]?.file_name}</div>
                    <div>Size: {((formValues[activeSection]?.file_size || 0) / 1024).toFixed(1)} KB</div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          fileUploadService.downloadFile(
                            formValues[activeSection]?.file_storage_path,
                            formValues[activeSection]?.file_name,
                          )
                        }
                      >
                        Download
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const payload = {
                            file_storage_path: "",
                            file_name: "",
                            file_size: "",
                            file_type: "",
                          };

                          Object.keys(payload).forEach((key) => {
                            handleFieldChange(key, payload[key], {}, null);
                          });
                        }}
                      >
                        Remove File
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {(formValues[activeSection]?.content_type === "text_page" ||
              formValues[activeSection]?.content_type === undefined) && (
              <div className="space-y-2 mt-3">
                <div className="flex gap-2">
                  <Select
                    //   value={formValues[activeSection]?.textHtml || ""}
                    open={isTemplateSelectOpen}
                    onOpenChange={setIsTemplateSelectOpen}
                    value={selectedTemplateIdx}
                    onValueChange={(idx) => {
                      let shouldUpdate = true;
                      if (formValues[activeSection]?.textHtml) {
                        if (!confirm("Are you sure you want to use this template?")) {
                          shouldUpdate = false;
                        }
                      }
                      if (shouldUpdate) {
                        const t = textTemplates[Number(idx)];
                        if (!t) return;
                        setSelectedTemplateId(t.id);
                        setSelectedTemplateIdx(String(idx));
                        handleFieldChange("textHtml", t.html || "", {}, null);
                      }
                    }}
                  >
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="Load template" />
                    </SelectTrigger>
                    <SelectContent
                      className="z-50 bg-background max-h-64"
                      position="item-aligned"
                      footer={
                        <button
                          type="button"
                          className="w-full rounded-sm px-2 py-1.5 text-left text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                          onClick={() => {
                            setIsTemplateSelectOpen(false);
                            openSaveTemplateDialog(formValues[activeSection]?.textHtml || "", {
                              preferSelectedName: false,
                              startEmpty: true,
                            });
                          }}
                        >
                          + Add new template
                        </button>
                      }
                    >
                      {textTemplates.length === 0 && (
                        <SelectItem value="__none__" disabled>
                          No templates
                        </SelectItem>
                      )}
                      {textTemplates.map((t, i) => (
                        <SelectItem key={t.id || i} value={String(i)}>
                          {t.name || `Template ${i + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Dialog open={isSaveTemplateOpen} onOpenChange={setIsSaveTemplateOpen}>
                  <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                      <DialogTitle>Save template</DialogTitle>
                      <DialogDescription>Enter template name and choose how to save.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-2">
                        <Label htmlFor="settings-custom-page-template-name" className="text-sm font-medium">
                          Template name
                        </Label>
                        <Input
                          id="settings-custom-page-template-name"
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          placeholder={`Template ${textTemplates.length + 1}`}
                          className="w-full min-w-0"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={async () => {
                            if (!templateName.trim()) {
                              toast({
                                title: "Name required",
                                description: "Please enter a template name.",
                                variant: "destructive",
                              });
                              return;
                            }
                            const saved = await saveTextTemplate(pendingTemplateHtml, templateName.trim());
                            if (saved) {
                              const nextTemplates = [...textTemplates, saved];
                              const newIdx = nextTemplates.findIndex((t) => t.id === saved.id);
                              if (newIdx >= 0) {
                                setSelectedTemplateId(saved.id);
                                setSelectedTemplateIdx(String(newIdx));
                                handleFieldChange("textHtml", saved.html || "", {}, null);
                              }
                            }
                            setIsSaveTemplateOpen(false);
                          }}
                        >
                          Save as new
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <RichTextEditor
                  value={formValues[activeSection]?.textHtml || ""}
                  onChange={(html) => {
                    handleFieldChange("textHtml", html, {}, null);
                  }}
                />
              </div>
            )}
          </div>
        )}
        {/* <div style={{ display: "none" }}>
          <QuotationTemplate
            formValues={formValues}
            sectionUpdates={sectionUpdates}
          />
        </div> */}
        <AddItemDialog
          isOpen={isAddItemModalOpen}
          onClose={() => setIsAddItemModalOpen(false)}
          onConfirm={handleAddItemConfirm}
          suppliers={suppliers}
        />
      </div>
    </>
  );
}
