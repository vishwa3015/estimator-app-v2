import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { SECTION_CONFIGS } from "./section-configs";
import { EstimateSection } from "@/services/estimates/section-service";
import { Plus, Trash2, GripVertical } from "lucide-react";

interface EstimateSectionsProps {
  activeSection: string | null;
  setActiveSection: (section: string) => void;
  sectionToggles: Record<string, boolean>;
  handleSectionToggle: (sectionId: string) => void;
  sectionFiles?: Record<string, File>;
  sections: EstimateSection[];
  onSectionsChange: (sections: EstimateSection[]) => void;
  onSectionReorder: (sourceIndex: number, destinationIndex: number) => void;
  onSectionDelete: (sectionId: string) => void;
  onAddCustomPage?: () => void;
}

const EstimateSections: React.FC<EstimateSectionsProps> = ({
  activeSection,
  setActiveSection,
  sectionToggles,
  handleSectionToggle,
  sectionFiles = {},
  sections,
  onSectionsChange,
  onSectionReorder,
  onSectionDelete,
  onAddCustomPage,
}) => {
  const [localSections, setLocalSections] = useState<EstimateSection[]>(sections);
  const [draggedSection, setDraggedSection] = useState<string | null>(null);
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);

  useEffect(() => {
    setLocalSections(sections);
  }, [sections]);

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, sectionId: string) => {
    setDraggedSection(sectionId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', sectionId);
    
    // Add visual feedback
    const target = e.currentTarget as HTMLElement;
    if (target) {
      target.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedSection(null);
    setDragOverSection(null);
    
    // Remove visual feedback
    const target = e.currentTarget as HTMLElement;
    if (target) {
      target.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedSection && draggedSection !== sectionId) {
      setDragOverSection(sectionId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're leaving the section entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverSection(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault();
    
    if (!draggedSection || draggedSection === targetSectionId) {
      setDragOverSection(null);
      return;
    }

    const draggedIndex = localSections.findIndex(s => s.id === draggedSection);
    const targetIndex = localSections.findIndex(s => s.id === targetSectionId);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      // Call the parent handler for reordering
      onSectionReorder(draggedIndex, targetIndex);
    }
    
    setDragOverSection(null);
  };

  const handleSectionToggleLocal = (sectionId: string) => {
    // Update local state immediately for UI responsiveness
    const updatedSections = localSections.map(section => 
      section.id === sectionId 
        ? { ...section, enabled: !section.enabled }
        : section
    );
    setLocalSections(updatedSections);
    
    // Call the parent handler
    handleSectionToggle(sectionId);
  };

  const handleDeleteSection = (sectionId: string) => {
    // Call the parent handler for deletion
    onSectionDelete(sectionId);
  };

  const getSectionIcon = (sectionType: string) => {
    const config = SECTION_CONFIGS.find(c => c.type === sectionType);
    if (config) return config.icon;
    
    // Default icon for custom sections
    return Plus;
  };

  const getSectionLabel = (section: EstimateSection) => {
    if (section.section_type === 'custom') {
      return section.title || 'Custom Page';
    }
    
    const config = SECTION_CONFIGS.find(c => c.type === section.section_type);
    return config ? config.label : section.title;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Sections</span>
        {onAddCustomPage && (
          <Button size="sm" variant="outline" onClick={onAddCustomPage}>
            <Plus className="h-4 w-4 mr-1" />
            Add Page
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {localSections.map((section, index) => {
          const Icon = getSectionIcon(section.section_type);
          const isActive = activeSection === section.id;
          const isDragging = draggedSection === section.id;
          const isDragOver = dragOverSection === section.id;
          
          return (
            <div
              key={section.id}
              className={cn(
                "flex flex-col gap-2 py-2 px-3 rounded-md transition-all cursor-move",
                isActive && "border border-red-200 bg-red-50",
                isDragOver && "border-2 border-dashed border-blue-400 bg-blue-50",
                isDragging && "opacity-50"
              )}
              draggable
              onDragStart={(e) => handleDragStart(e, section.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, section.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, section.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {/* Drag Handle */}
                  <div className="flex-shrink-0 cursor-grab active:cursor-grabbing">
                    <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                  </div>
                  
                  {/* Section Content */}
                  <div
                    className={cn(
                      "flex items-start gap-2 cursor-pointer hover:text-primary transition-colors flex-1 min-w-0",
                      isActive
                        ? "text-[#ea384c] font-semibold"
                        : "text-muted-foreground"
                    )}
                    onClick={() => setActiveSection(section.id)}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 mt-0.5 shrink-0",
                        isActive
                          ? "text-[#ea384c]"
                          : "text-muted-foreground"
                      )}
                    />
                    <span className="text-sm break-words leading-tight">
                      {getSectionLabel(section)}
                    </span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2">
                  <Switch
                    checked={section.enabled}
                    onCheckedChange={() => handleSectionToggleLocal(section.id)}
                    className="shrink-0"
                  />
                  
                  {section.section_type === 'custom' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteSection(section.id)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Drag Over Indicator */}
              {isDragOver && (
                <div className="h-0.5 bg-blue-400 rounded-full animate-pulse" />
              )}
            </div>
          );
        })}
      </div>
      
      {/* Drag and Drop Instructions */}
      <div className="text-xs text-muted-foreground text-center pt-2 border-t">
        💡 Drag and drop sections to reorder them
      </div>
    </div>
  );
};

export default EstimateSections;
