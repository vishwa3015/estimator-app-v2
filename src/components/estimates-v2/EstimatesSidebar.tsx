import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { SECTION_CONFIGS } from "../estimates/section-configs";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";
import {
  EstimateSection,
  sectionService,
} from "@/services/estimates/section-service";
import { Switch } from "../ui/switch";
import { customSectionConfig } from "@/configs/estimatesEditorConfig";
import { useEstimateData } from "@/hooks/use-estimate-data";

export default function EstimatesSidebar({
  sections,
  activeSection,
  setActiveSection,
  setSectionUpdates,
  sectionUpdates,
  showMaterialDataEntry = false,
  isLocked = false
}) {
  const { estimate } = useEstimateData();
  const existing = sectionUpdates.find((s) => s.id === "lead-details-entry");
  const leadDetailsSection = {
    id: "lead-details-entry",
    title: "Material details data",
    sortOrder: 5.5,
    type: "default",
    enabled: existing ? existing.enabled : true,
    hide: false,
  };
  const [localSections, setLocalSections] = useState(
    sectionUpdates.flatMap((section) =>
      section.id === 6 && showMaterialDataEntry && !sectionUpdates.find(sec => sec.id === leadDetailsSection.id) ? [leadDetailsSection, section] : section
    ) || []
  );

  useEffect(() => {
    setLocalSections(sectionUpdates.flatMap((section) =>
      section.id === 6 && showMaterialDataEntry && !sectionUpdates.find(sec => sec.id === leadDetailsSection.id) ? [leadDetailsSection, section] : section
    ) || [])
  }, [sectionUpdates, showMaterialDataEntry])

  useEffect(() => {
    if (estimate && estimate.id) {
      setSectionUpdates(estimate?.config_data?.sections || []);
    }
  }, [estimate]);

  // useEffect(() => {
  //   let sectionsToRender = [...sectionUpdates];

  //   if (showLeadDetailsTab) {
  //     console.log('Adding Lead Details section...');

  //     const alreadyExists = sectionsToRender.some(
  //       (s) => s.id === 'lead-details-entry'
  //     );

  //     if (!alreadyExists) {
  //       // Find the index where we should insert the lead details section
  //       const insertIndex = sectionsToRender.findIndex(
  //         (section) => section.id === 6
  //       );

  //       // Adjust sortOrder of sections after position 5 to make room
  //       sectionsToRender = sectionsToRender.map((section) => {
  //         if (section.id === 6) {
  //           return { ...section, sortOrder: section.sortOrder + 0.1 };
  //         }
  //         return section;
  //       });

  //       // Insert lead details section
  //       if (insertIndex !== -1) {
  //         sectionsToRender.splice(insertIndex, 0, leadDetailsSection);
  //       } else {
  //         sectionsToRender.push(leadDetailsSection);
  //       }
  //     }
  //   }

  //   setLocalSections(sectionsToRender);
  // }, [sectionUpdates, showLeadDetailsTab]);

  const onSectionReorder = (draggedIndex: number, targetIndex: number) => {
    setSectionUpdates((prevSections) => {
      // Copy array
      const updatedSections = [...prevSections];

      // Remove dragged item
      const isQuoteSection = updatedSections[draggedIndex].id === 6;
      const [draggedItem] = updatedSections.splice(draggedIndex, 1);

      // Remove Lead Data entry section in case of Quote section is being reordered
      let leadSection;
      if (isQuoteSection) {
        leadSection = updatedSections.splice(draggedIndex - 1, 1)?.[0];
        console.log(leadSection, " <=== Lead section..");
      }

      // Insert at new position
      updatedSections.splice(Math.max(targetIndex - 1, 0), 0, draggedItem);
      if (isQuoteSection) {
        updatedSections.splice(Math.max(targetIndex - 1, 0), 0, leadSection);
      }

      // Recalculate sortOrder based on new positions
      const reorderedSections = updatedSections.map((section, index) => ({
        ...section,
        sortOrder: index + 1, // or index, depending on how you store order
      }));

      // Filter out the conditional Lead Details section before syncing with parent
      const sectionsForParent = updatedSections;

      // Sync with parent if needed
      // if (setSectionUpdates) {
      //   setSectionUpdates(
      //     sectionsForParent.map((section) => ({
      //       ...section,
      //       id: section.id,
      //       title: section.title,
      //       sortOrder: section.sortOrder,
      //       type: section.type,
      //       enabled: section.enabled,
      //     }))
      //   );
      // }

      return reorderedSections;
    });
  };

  const handleSectionToggle = (id) => {
    setSectionUpdates((prevSections) => {
      // Copy array
      const updatedSections = [...prevSections];

      updatedSections.map((item) => {
        if (item.id === id) {
          item.enabled = !item.enabled;
        }
        return item;
      });

      // Filter out the conditional Lead Details section before syncing with parent
      const sectionsForParent = updatedSections;

      // Sync with parent if needed
      if (setSectionUpdates) {
        setSectionUpdates(
          sectionsForParent.map((section) => ({
            ...section,
            id: section.id,
            title: section.title,
            sortOrder: section.sortOrder,
            type: section.type,
            enabled: section.enabled,
            hide: section.hide,
          }))
        );
      }

      console.log(updatedSections, "  <=== Updated...");
      return updatedSections;
    });
  };

  const [draggedSection, setDraggedSection] = useState<string | null>(null);
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, sectionId: string) => {
    // Don't allow dragging the Lead Details section
    if (sectionId === "lead-details-entry") {
      e.preventDefault();
      return;
    }

    setDraggedSection(sectionId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", sectionId);

    // Add visual feedback
    const target = e.currentTarget as HTMLElement;
    if (target) {
      target.style.opacity = "0.5";
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedSection(null);
    setDragOverSection(null);

    // Remove visual feedback
    const target = e.currentTarget as HTMLElement;
    if (target) {
      target.style.opacity = "1";
    }
  };

  const handleDragOver = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

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

    const draggedIndex = sectionUpdates.findIndex(
      (s) => s.id === draggedSection
    );
    const targetIndex = sectionUpdates.findIndex(
      (s) => s.id === targetSectionId
    );

    if (draggedIndex !== -1 && targetIndex !== -1) {
      // Call the parent handler for reordering
      onSectionReorder(draggedIndex, targetIndex);
    }

    setDragOverSection(null);
  };

  const handleSectionToggleLocal = (sectionId: string) => {
    // // Update local state immediately for UI responsiveness
    // const updatedSections = localSections.map(section =>
    //     section.id === sectionId
    //         ? { ...section, enabled: !section.enabled }
    //         : section
    // );
    // setLocalSections(updatedSections);
    // Call the parent handler
    handleSectionToggle(sectionId);
  };

  const handleAddNewSection = () => {
    setSectionUpdates((prev) => {
      const last = prev.reduce((old, current) => {
        return old.sortOrder > current.sortOrder ? old : current;
      });

      const id = uuidv4();

      const name = "Custom page";

      const updatedSections = [
        ...(prev.flatMap((section) =>
          section.id === 6 && !sectionUpdates.find(sec => sec.id === leadDetailsSection.id) ? [leadDetailsSection, section] : section
        )),
        customSectionConfig(id, name, (last.sortOrder || 0) + 1),
      ];

      setSectionUpdates(updatedSections);
      return updatedSections;
    });
  };

  return (
    <>
      <div className="space-y-4 pl-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Sections
          </span>
        </div>

        <div className="space-y-2">
          {localSections
            ?.sort((a, b) => a.sortOrder - b.sortOrder)
            ?.map((section, index) => {
              const isActive = activeSection === section.id;
              const isDragging = draggedSection === section.id;
              const isDragOver = dragOverSection === section.id;
              const isLeadDetailsSection = section.id === "lead-details-entry";

              if (section.hide) {
                return null;
              }

              return (
                <div
                  key={section.id}
                  className={cn(
                    "flex flex-col gap-2 py-2 px-3 rounded-md transition-all",
                    isLocked || isLeadDetailsSection ? "cursor-default" : "cursor-move",
                    isLeadDetailsSection ? "cursor-default" : "cursor-move",
                    isActive && "border border-red-200 bg-red-50",
                    isDragOver &&
                      "border-2 border-dashed border-blue-400 bg-blue-50",
                    isDragging && "opacity-50",
                    isLeadDetailsSection
                  )}
                  draggable={!isLeadDetailsSection && !isLocked}
                  onDragStart={(e) => handleDragStart(e, section.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, section.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, section.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* Drag Handle */}
                      <div
                        className={cn(
                          "flex-shrink-0",
                          isLeadDetailsSection
                            ? "cursor-default opacity-30"
                            : "cursor-grab active:cursor-grabbing"
                        )}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                      </div>

                      {/* Section Content */}
                      <div
                        className={cn(
                          "flex items-start gap-2 cursor-pointer hover:text-primary transition-colors flex-1 min-w-0",
                          isActive
                            ? "text-[#ea384c] font-semibold"
                            : "text-muted-foreground",
                          isLeadDetailsSection
                        )}
                        onClick={() => setActiveSection(section.id)}
                      >
                        <span className="text-sm break-words leading-tight">
                          {section.title}
                          {isLeadDetailsSection}
                        </span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={section.enabled}
                        onCheckedChange={() => !isLocked && handleSectionToggleLocal(section.id)}
                        disabled={isLocked}
                        className="shrink-0"
                      />

                      {section.type === "custom" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {}}
                          disabled={isLocked}
                          //   handleDeleteSection(section.id)
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Drag Over Indicator */}
                  {isDragOver && !isLocked && (
                    <div className="h-0.5 bg-blue-400 rounded-full animate-pulse" />
                  )}
                </div>
              );
            })}

          <Button
            size="sm"
            variant="outline"
            className="w-full mt-3"
            onClick={handleAddNewSection}
            disabled={isLocked}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Custom Page
          </Button>
        </div>

        {/* Drag and Drop Instructions */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t pb-5">
          {isLocked
            ? "🔒 This estimate is read-only"
            : "💡 Drag and drop sections to reorder them"
          }
        </div>
      </div>
    </>
  );
}
