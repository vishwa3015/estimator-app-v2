
import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardNav from "@/components/DashboardNav";
import { useIsMobile } from "@/hooks/use-mobile";
import SettingsContent from "@/components/settings/SettingsContent";
import ProductsSettings from "@/components/settings/ProductsSettings";
import ProductCategoriesSettings from "@/components/settings/ProductCategoriesSettings";
import FormulasSettings from "@/components/settings/FormulasSettings";
import EagleViewOAuthSettings from "@/components/settings/EagleViewOAuthSettings";
import SettingsSidebar, { SettingsOption } from "@/components/settings/SettingsSidebar";
import TemplatesSettings from "@/components/settings/TemplatesSettings";
import ProductSuppliersSettings from "@/components/settings/ProductSuppliersSettings";

import {
  Settings as SettingsIcon,
  Package,
  FolderTree,
  Satellite,
  Calculator,
  FolderOpen,
  FileText,
} from "lucide-react";
import QuickMeasureOAuthSettings from "@/components/settings/QuickMeasureOAuthSettings";
import EstimateFilesManagerSettings from "@/components/settings/EstimateFilesManagerSettings";
import DefaultTemplateSettings from "@/components/settings/DefaultTemplateSettings";

const settingsOptions: SettingsOption[] = [
  {
    id: "default-values",
    label: "Default Values",
    icon: SettingsIcon,
    component: SettingsContent,
  },
  {
    id: "files-manager",
    label: "Files manager",
    icon: FolderOpen,
    component: EstimateFilesManagerSettings,
  },
  {
    id: "products",
    label: "Products",
    icon: Package,
    component: ProductsSettings,
  },
  {
    id: "product-categories",
    label: "Product Categories",
    icon: FolderTree,
    component: ProductCategoriesSettings,
  },
  {
    id: "product-suppliers",
    label: "Product Suppliers",
    icon: FolderTree,
    component: ProductSuppliersSettings,
  },
  {
    id: "formulas",
    label: "Formulas",
    icon: Calculator,
    component: FormulasSettings,
  },
  {
    id: "eagleview-oauth",
    label: "Eagleview Integration",
    icon: Satellite,
    component: EagleViewOAuthSettings,
  },
   {
    id: "quickmeasure-oauth",
    label: "QuickMeasure Integration",
    icon: Satellite,
    component: QuickMeasureOAuthSettings,
  },
  {
    id: "templates",
    label: "Templates",
    icon: FileText,
    component: TemplatesSettings,
  },
  {
    id: "default-template",
    label: "Default Template",
    icon: SettingsIcon,
    component: DefaultTemplateSettings,
  },
];

const Settings = () => {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeOption, setActiveOption] = useState("default-values");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Read section from URL or localStorage on mount
  useEffect(() => {
    const section = searchParams.get("section");
    const code = searchParams.get("code");

    // If OAuth callback (has code), restore section from localStorage
    if (code) {
      setActiveOption("eagleview-oauth");
      return;
    }

    // Otherwise use section from URL
    if (section && settingsOptions.some(opt => opt.id === section)) {
      setActiveOption(section);
    }
  }, []);

  // Update URL when section changes
  const handleOptionChange = (optionId: string) => {
    setActiveOption(optionId);
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set("section", optionId);
      return newParams;
    });
  };

  const ActiveComponent = settingsOptions.find(
    (opt) => opt.id === activeOption
  )?.component || SettingsContent;

  return (
    <div className={`min-h-screen bg-background pb-[60px] ${!isMobile ? 'desktop-content' : ''}`}>
      <div className={!isMobile ? 'p-4 desktop:p-6' : ''}>
        <DashboardNav />
      </div>
      <div className="flex min-h-[calc(100vh-80px)]">
        <SettingsSidebar
          options={settingsOptions}
          activeOption={activeOption}
          onOptionChange={handleOptionChange}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
        <div className={`flex-1 ${activeOption === "default-values" ? "p-0" : "p-6"}`}>
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
};

export default Settings;
