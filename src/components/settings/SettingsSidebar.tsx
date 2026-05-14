import React from "react";
import { cn } from "@/lib/utils";
import { Settings, Package, FolderTree, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SettingsOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType;
}

interface SettingsSidebarProps {
  options: SettingsOption[];
  activeOption: string;
  onOptionChange: (optionId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  options,
  activeOption,
  onOptionChange,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  return (
    <div className={cn(
      "border-r bg-muted/20 p-4 transition-all duration-300 relative",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className="flex items-center justify-between mb-4">
        {!isCollapsed && <h2 className="text-lg font-semibold px-3">Settings</h2>}
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className={cn(
              "h-8 w-8 rounded-md hover:bg-muted",
              isCollapsed && "mx-auto"
            )}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
      <nav className="space-y-1">
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              onClick={() => onOptionChange(option.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                activeOption === option.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground",
                isCollapsed && "justify-center"
              )}
              title={isCollapsed ? option.label : undefined}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!isCollapsed && <span>{option.label}</span>}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default SettingsSidebar;
