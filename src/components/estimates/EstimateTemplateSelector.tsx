import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";
import { GHLCredentials } from "@/types/ghl";
import { useTemplateSelector } from "@/hooks/use-template-selector";
import SectionConfig from "./SectionConfig";
import { SECTION_CONFIGS } from "./section-configs";

interface EstimateTemplateSelectorProps {
  selectedTemplateId: string;
  onSelectTemplate: (templateId: string) => void;
  credentials: GHLCredentials;
  contactId?: string;
}

const EstimateTemplateSelector: React.FC<EstimateTemplateSelectorProps> = ({
  selectedTemplateId,
  onSelectTemplate,
  credentials,
  contactId
}) => {
  const {
    sectionToggles,
    activeSection,
    primaryImage,
    setPrimaryImage,
    certificationLogo,
    setCertificationLogo,
    handleSectionToggle,
    handleSectionFileUpload,
    sectionFiles
  } = useTemplateSelector(credentials, contactId);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText size={16} />
          {selectedTemplateId ? "Make Additions/Edits" : "Select Template"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Edits & Additions to Estimate</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-6 py-4">
          <div>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {SECTION_CONFIGS.map(section => (
                  <div 
                    key={section.id} 
                    className={cn(
                      "flex items-center justify-between py-2 rounded-md transition-all", 
                      activeSection === section.id && "border border-red-200 bg-red-50"
                    )}
                  >
                    <div 
                      className={cn(
                        "flex items-center gap-2 cursor-pointer hover:text-primary transition-colors flex-1 p-2",
                        activeSection === section.id ? "text-[#ea384c] font-semibold" : "text-muted-foreground"
                      )}
                      onClick={() => handleSectionToggle(section.id)}
                    >
                      <section.icon className={cn("h-4 w-4", activeSection === section.id ? "text-[#ea384c]" : "text-muted-foreground")} />
                      <span>Edits for {section.label}</span>
                    </div>
                    <Switch
                      checked={sectionToggles[section.id] || false}
                      onCheckedChange={() => handleSectionToggle(section.id)}
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div>
            {activeSection ? (
              <SectionConfig
                sectionId={activeSection}
                sectionLabel={SECTION_CONFIGS.find(s => s.id === activeSection)?.label || ''}
                onFileUpload={handleSectionFileUpload}
                primaryImage={primaryImage}
                setPrimaryImage={setPrimaryImage}
                certificationLogo={certificationLogo}
                setCertificationLogo={setCertificationLogo}
                sectionFiles={sectionFiles}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select a section to edit
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EstimateTemplateSelector;
