import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, FileUp } from "lucide-react";
import PDFThumbnail from '../pdf/PDFThumbnail';

interface SectionConfigProps {
  sectionId: string;
  sectionLabel: string;
  onFileUpload: (sectionId: string, file: File) => void;
  primaryImage: File | null;
  setPrimaryImage: (file: File | null) => void;
  certificationLogo: File | null;
  setCertificationLogo: (file: File | null) => void;
  sectionFiles: Record<string, File> | null | undefined;
}

const SectionConfig: React.FC<SectionConfigProps> = ({
  sectionId,
  sectionLabel,
  onFileUpload,
  primaryImage,
  setPrimaryImage,
  certificationLogo,
  setCertificationLogo,
  sectionFiles
}) => {
  const handlePdfUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        onFileUpload(sectionId, file);
      } else {
        alert('Please upload a PDF file');
      }
    }
  };

  // Log the current section ID for debugging
  console.log("Current section ID:", sectionId, "Label:", sectionLabel);

  return (
    <div className="space-y-4">
      <Label>Edits for {sectionLabel}</Label>

      {sectionId === 'estimates' && (
        <>
          <div className="mb-4">
            <Label htmlFor="primary-image">Primary Image</Label>
            <div className="border rounded p-2 text-center">
              <Button 
                variant="ghost" 
                className="gap-2 w-full"
                onClick={() => document.getElementById("primary-image")?.click()}
              >
                <Upload size={16} />
                Upload Primary Image
              </Button>
              <input 
                id="primary-image" 
                type="file" 
                accept="image/*" 
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    setPrimaryImage(files[0]);
                  }
                }}
              />
              {primaryImage && (
                <div className="mt-2">
                  <img 
                    src={URL.createObjectURL(primaryImage)} 
                    alt="Primary" 
                    className="max-h-32 mx-auto rounded-md"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="mb-4">
            <Label htmlFor="certification-logo">Certification/Secondary Logo</Label>
            <div className="border rounded p-2 text-center">
              <Button 
                variant="ghost" 
                className="gap-2 w-full"
                onClick={() => document.getElementById("certification-logo")?.click()}
              >
                <Upload size={16} />
                Upload Certification Logo
              </Button>
              <input 
                id="certification-logo" 
                type="file" 
                accept="image/*" 
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    setCertificationLogo(files[0]);
                  }
                }}
              />
              {certificationLogo && (
                <div className="mt-2">
                  <img 
                    src={URL.createObjectURL(certificationLogo)} 
                    alt="Certification Logo" 
                    className="max-h-32 mx-auto rounded-md"
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {sectionId === 'roofComponents' && (
        <div className="border rounded p-2 text-center space-y-2">
          <input
            type="file"
            accept="application/pdf"
            id={`pdf-${sectionId}`}
            className="hidden"
            onChange={handlePdfUpload}
          />
          <Button
            variant="ghost"
            className="gap-2 w-full"
            onClick={() => document.getElementById(`pdf-${sectionId}`)?.click()}
          >
            <FileUp className="h-4 w-4" />
            Upload Roof Components PDF
          </Button>
          {sectionFiles && sectionFiles[sectionId] && (
            <PDFThumbnail file={sectionFiles[sectionId]} className="mt-2" />
          )}
        </div>
      )}

      {sectionId !== 'roofComponents' && sectionId !== 'estimates' && (
        <div className="border rounded p-2 text-center space-y-2">
          <input
            type="file"
            accept="application/pdf"
            id={`file-${sectionId}`}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onFileUpload(sectionId, file);
              }
            }}
          />
          <Button
            variant="ghost"
            className="gap-2 w-full"
            onClick={() => document.getElementById(`file-${sectionId}`)?.click()}
          >
            <FileUp className="h-4 w-4" />
            Upload PDF
          </Button>
          {sectionFiles && sectionFiles[sectionId] && (
            <PDFThumbnail file={sectionFiles[sectionId]} className="mt-2" />
          )}
        </div>
      )}
    </div>
  );
};

export default SectionConfig;
