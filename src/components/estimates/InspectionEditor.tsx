import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FileDropzone from "@/components/ui/file-dropzone";
import RichTextEditor from "@/components/ui/rich-text-editor";
import { EstimateDocument, InspectionFileInput, InspectionRichTextInput } from "@/types/estimate-items";

interface InspectionEditorProps {
  estimate: EstimateDocument;
  setEstimate: React.Dispatch<React.SetStateAction<EstimateDocument>>;
}

type InspectionInput = InspectionFileInput | InspectionRichTextInput;

type InspectionSection = {
  id: string;
  style: 'standard' | 'side-by-side' | 'wide' | 'full';
  inputs: InspectionInput[];
};
const styles = [
  { id: 'standard', label: 'Standard (image left, text right)' },
  { id: 'side-by-side', label: 'Side by side (2 images + text below each)' },
  { id: 'wide', label: 'Wide (full width image + text below)' },
  { id: 'full', label: 'Full (full screen image)' },
] as const;

const InspectionEditor: React.FC<InspectionEditorProps> = ({ estimate, setEstimate }) => {
  const newSection = { id: crypto.randomUUID(), style: 'standard' as const, inputs: [] };
  const newInput = { id: crypto.randomUUID(), type: 'file' as const, dataUrl: '' };
  const sections = estimate.inspectionSections || [
    {...newSection, inputs: [newInput]}
  ];

  const addSection = () => {
    const next = [
      ...sections,
      { id: crypto.randomUUID(), style: 'standard' as const, inputs: [] }
    ];
    setEstimate(prev => ({ ...prev, inspectionSections: next }));
  };

  const updateSection = (id: string, updater: (s: InspectionSection) => InspectionSection) => {
    const next = sections.map(s => s.id === id ? updater(s) : s);
    setEstimate(prev => ({ ...prev, inspectionSections: next }));
  };

  const removeSection = (id: string) => {
    const next = sections.filter(s => s.id !== id);
    setEstimate(prev => ({ 
      ...prev, 
      inspectionSections: next
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-base font-semibold">Inspection Sections</h3>
        <Button type="button" onClick={addSection}>Add Section</Button>
      </div>

      {sections.length === 0 && (
        <p className="text-sm text-muted-foreground">No sections added yet.</p>
      )}

      <div className="space-y-4">
        {sections.map((section) => (
          <Card key={section.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Section</CardTitle>
              <div className="flex items-center gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button type="button" size="sm" variant="outline">Change Style</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Select style</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-2">
                      {styles.map(st => (
                        <Button
                          key={st.id}
                          type="button"
                          variant={section.style === st.id ? "default" : "outline"}
                          onClick={() => updateSection(section.id, (s) => ({ ...s, style: st.id }))}
                        >
                          {st.label}
                        </Button>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
                <Button type="button" size="sm" variant="destructive" onClick={() => removeSection(section.id)}>
                  Delete
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-muted-foreground">Current style: {section.style}</div>

              <div className="flex items-center justify-between">
                <h4 className="font-medium">Inputs</h4>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updateSection(section.id, (s) => ({
                      ...s,
                      inputs: [...s.inputs, { id: crypto.randomUUID(), type: 'file' as const, dataUrl: '' }]
                    }))}
                  >
                    Add File
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updateSection(section.id, (s) => ({
                      ...s,
                      inputs: [...s.inputs, { id: crypto.randomUUID(), type: 'richtext' as const, html: '' }]
                    }))}
                  >
                    Add Text
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {section.inputs.map((inp: InspectionInput) => (
                  <div key={inp.id} className="border rounded-md p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium">{inp.type === 'file' ? 'File Upload' : 'Rich Text'}</div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => updateSection(section.id, (s) => ({
                          ...s,
                          inputs: s.inputs.filter((x: InspectionInput) => x.id !== inp.id)
                        }))}
                      >
                        Remove
                      </Button>
                    </div>

                    {inp.type === 'file' ? (
                      <>
                        <FileDropzone
                          accept="image/*,application/pdf"
                          valueDataUrl={inp.dataUrl}
                          onChange={(file, dataUrl) => updateSection(section.id, (s) => ({
                            ...s,
                            inputs: s.inputs.map((x: InspectionInput) => x.id === inp.id ? { ...x, dataUrl, fileName: file?.name, fileType: file?.type } : x)
                          }))}
                        />
                        <Input
                          placeholder="Caption (optional)"
                          className="mt-2"
                          value={inp.caption || ''}
                          onChange={(e) => updateSection(section.id, (s) => ({
                            ...s,
                            inputs: s.inputs.map((x: InspectionInput) => x.id === inp.id ? { ...x, caption: e.target.value } : x)
                          }))}
                        />
                      </>
                    ) : (
                      <RichTextEditor
                        value={inp.html}
                        onChange={(html) => updateSection(section.id, (s) => ({
                          ...s,
                          inputs: s.inputs.map((x: InspectionInput) => x.id === inp.id ? { ...x, html } : x)
                        }))}
                      />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default InspectionEditor;
