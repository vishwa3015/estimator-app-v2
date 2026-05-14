
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { SECTION_CONFIGS } from '../estimates/section-configs';

interface PDFPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  previewUrl: string | null;
  activeSection: string | null;
}

export const PDFPreviewDialog: React.FC<PDFPreviewDialogProps> = ({
  isOpen,
  onClose,
  previewUrl,
  activeSection,
}) => {
  const sectionTitle = activeSection ? 
    SECTION_CONFIGS.find(s => s.id === activeSection)?.label : '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {sectionTitle && `${sectionTitle} Preview`}
          </DialogTitle>
          <DialogDescription>
            Preview of the selected section
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-auto h-[calc(90vh-10rem)]">
          {previewUrl && (
            <iframe
              src={previewUrl}
              className="w-full h-full min-h-[600px] border"
              title="PDF Preview"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
