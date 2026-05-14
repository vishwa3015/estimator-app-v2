
import React from 'react';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SectionConfig from "../estimates/SectionConfig";
import { SECTION_CONFIGS } from "../estimates/section-configs";

interface ConfigurationPanelProps {
  activeSection: string;
  defaults: {
    introText?: string;
    enabledSections?: Record<string, boolean>;
    sectionPdfs?: Record<string, string>;
  };
  onIntroTextChange: (text: string) => void;
  primaryImage: File | null;
  setPrimaryImage: (file: File | null) => void;
  certificationLogo: File | null;
  setCertificationLogo: (file: File | null) => void;
  sectionFiles: Record<string, File>;
  onFileUpload: (sectionId: string, file: File) => void;
}

const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  activeSection,
  defaults,
  onIntroTextChange,
  primaryImage,
  setPrimaryImage,
  certificationLogo,
  setCertificationLogo,
  sectionFiles,
  onFileUpload,
}) => {
  if (activeSection === 'introduction') {
    return (
      <div className="space-y-4">
        <Label>Default Introduction Text</Label>
        <Textarea
          value={defaults.introText || ""}
          onChange={(e) => onIntroTextChange(e.target.value)}
          placeholder="Enter default introduction text..."
          rows={6}
        />
      </div>
    );
  }

  return (
    <SectionConfig
      sectionId={activeSection}
      sectionLabel={SECTION_CONFIGS.find(s => s.id === activeSection)?.label || ''}
      onFileUpload={onFileUpload}
      primaryImage={primaryImage}
      setPrimaryImage={setPrimaryImage}
      certificationLogo={certificationLogo}
      setCertificationLogo={setCertificationLogo}
      sectionFiles={sectionFiles}
    />
  );
};

export default ConfigurationPanel;
