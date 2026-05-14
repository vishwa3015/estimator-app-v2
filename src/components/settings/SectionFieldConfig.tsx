import React from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FileText, Upload } from "lucide-react";
import type { EstimateSection } from "./EstimateDefaultsForm";

interface SectionFieldConfigProps {
  section: EstimateSection;
  onValueChange: (id: string, value: string | File | null) => void;
}

const SectionFieldConfig: React.FC<SectionFieldConfigProps> = ({
  section,
  onValueChange,
}) => {
  return (
    <div>
      <Label className="mb-2 block">{section?.title}</Label>
      {section?.type === "text" ? (
        <textarea
          className="w-full border rounded p-2 min-h-[100px]"
          value={typeof section?.value === "string" ? section?.value : ""}
          onChange={(e) => onValueChange(section?.id, e.target.value)}
          placeholder="Enter text for this section..."
        />
      ) : (
        <div>
          <input
            id={`file-upload-${section?.id}`}
            type="file"
            className="hidden"
            accept="application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onValueChange(section?.id, file);
              }
            }}
          />
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() =>
              document.getElementById(`file-upload-${section.id}`)?.click()
            }
          >
            <Upload className="h-4 w-4" />
            {section?.value instanceof File ? "Replace File" : "Upload PDF"}
          </Button>
          {section?.value instanceof File && (
            <div className="mt-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="text-xs">{section?.value.name}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SectionFieldConfig;
