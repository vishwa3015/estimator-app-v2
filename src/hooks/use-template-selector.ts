
import { useState, useCallback } from 'react';
import { SECTION_CONFIGS } from '@/components/estimates/section-configs';
import { useLocalStorage } from './use-local-storage';

export const useTemplateSelector = (credentials: unknown, contactId?: string) => {
  // Get defaults from local storage
  const [defaults] = useLocalStorage("estimate_defaults", {
    enabledSections: SECTION_CONFIGS.reduce((acc, section) => {
      acc[section.id] = true;
      return acc;
    }, {} as Record<string, boolean>),
  });

  // Initialize toggles from defaults (legacy support)
  const [sectionToggles, setSectionToggles] = useState<Record<string, boolean>>(
    defaults.enabledSections
  );

  const [activeSection, setActiveSection] = useState<string | null>(
    SECTION_CONFIGS[0]?.id || null
  );
  const [primaryImage, setPrimaryImage] = useState<File | null>(null);
  const [certificationLogo, setCertificationLogo] = useState<File | null>(null);
  const [sectionFiles, setSectionFiles] = useState<Record<string, File>>({});

  const handleSectionFileUpload = useCallback((sectionId: string, file: File) => {
    setSectionFiles(prev => ({
      ...prev,
      [sectionId]: file
    }));
  }, []);

  const handleSectionToggle = useCallback((sectionId: string) => {
    setSectionToggles(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
    
    // Set active section when toggling on
    if (!sectionToggles[sectionId]) {
      setActiveSection(sectionId);
    }
  }, [sectionToggles]);

  return {
    sectionToggles,
    activeSection,
    setActiveSection,
    handleSectionToggle,
    primaryImage,
    setPrimaryImage,
    certificationLogo,
    setCertificationLogo,
    handleSectionFileUpload,
    sectionFiles
  };
};
