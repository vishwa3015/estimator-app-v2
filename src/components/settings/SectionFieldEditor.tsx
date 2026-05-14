import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Edit2, Settings } from "lucide-react";
import { FormFieldConfig } from "@/services/estimates/form-engine-v2";

interface SectionFieldEditorProps {
  sectionId: string;
  sectionLabel: string;
  fields: FormFieldConfig[];
  onSave: (sectionId: string, fields: FormFieldConfig[]) => void;
  children: React.ReactNode;
}

const fieldTypes = [
  'text', 'number', 'textarea', 'date', 'switch', 'slider', 
  'radio', 'dropdown', 'upload', 'richtext', 'array'
];

const SectionFieldEditor: React.FC<SectionFieldEditorProps> = ({
  sectionId,
  sectionLabel,
  fields,
  onSave,
  children
}) => {
  const [open, setOpen] = useState(false);
  const [editingFields, setEditingFields] = useState<FormFieldConfig[]>(fields);
  const [editingField, setEditingField] = useState<FormFieldConfig | null>(null);

  const addField = () => {
    const newField: FormFieldConfig = {
      name: `field_${Date.now()}`,
      label: 'New Field',
      type: 'text',
      required: false,
      validation: {}
    };
    setEditingFields([...editingFields, newField]);
    setEditingField(newField);
  };

  const updateField = (index: number, updatedField: FormFieldConfig) => {
    const updated = [...editingFields];
    updated[index] = updatedField;
    setEditingFields(updated);
  };

  const removeField = (index: number) => {
    const updated = editingFields.filter((_, i) => i !== index);
    setEditingFields(updated);
    if (editingField === editingFields[index]) {
      setEditingField(null);
    }
  };

  const handleSave = () => {
    onSave(sectionId, editingFields);
    setOpen(false);
  };

  const handleFieldEdit = (field: FormFieldConfig) => {
    setEditingField(field);
  };

  const updateEditingField = (updates: Partial<FormFieldConfig>) => {
    if (!editingField) return;
    
    const updatedField = { ...editingField, ...updates };
    setEditingField(updatedField);
    
    const index = editingFields.findIndex(f => f.name === editingField.name);
    if (index >= 0) {
      updateField(index, updatedField);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configure Fields - {sectionLabel}
          </DialogTitle>
          <DialogDescription>
            Add, edit, and configure fields for this section
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fields List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Fields</h3>
              <Button onClick={addField} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Field
              </Button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {editingFields.map((field, index) => (
                <Card 
                  key={field.name} 
                  className={`cursor-pointer transition-colors ${
                    editingField?.name === field.name ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleFieldEdit(field)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{field.label}</span>
                          <Badge variant="secondary" className="text-xs">
                            {field.type}
                          </Badge>
                          {field.required && (
                            <Badge variant="destructive" className="text-xs">
                              Required
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {field.name}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeField(index);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Field Editor */}
          <div className="space-y-4">
            {editingField ? (
              <>
                <h3 className="text-lg font-medium">Edit Field</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="field-name">Field Name</Label>
                      <Input
                        id="field-name"
                        value={editingField.name}
                        onChange={(e) => updateEditingField({ name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="field-label">Label</Label>
                      <Input
                        id="field-label"
                        value={editingField.label}
                        onChange={(e) => updateEditingField({ label: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="field-type">Field Type</Label>
                    <Select 
                      value={editingField.type} 
                      onValueChange={(value) => updateEditingField({ type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldTypes.map(type => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="field-description">Description</Label>
                    <Textarea
                      id="field-description"
                      value={editingField.description || ''}
                      onChange={(e) => updateEditingField({ description: e.target.value })}
                      placeholder="Optional field description"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editingField.required || false}
                      onCheckedChange={(checked) => updateEditingField({ required: checked })}
                    />
                    <Label>Required field</Label>
                  </div>

                  {/* Type-specific options */}
                  {(editingField.type === 'radio' || editingField.type === 'dropdown') && (
                    <div className="space-y-2">
                      <Label>Options (one per line)</Label>
                      <Textarea
                        value={editingField.options?.map(opt => 
                          typeof opt === 'string' ? opt : opt.value
                        ).join('\n') || ''}
                        onChange={(e) => updateEditingField({ 
                          options: e.target.value.split('\n').filter(o => o.trim()).map(value => ({ name: value, value }))
                        })}
                        placeholder="Option 1&#10;Option 2&#10;Option 3"
                      />
                    </div>
                  )}

                  {editingField.type === 'slider' && (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Min Value</Label>
                        <Input
                          type="number"
                          value={editingField.validation?.min || 0}
                          onChange={(e) => updateEditingField({ 
                            validation: { ...editingField.validation, min: Number(e.target.value) }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Max Value</Label>
                        <Input
                          type="number"
                          value={editingField.validation?.max || 100}
                          onChange={(e) => updateEditingField({ 
                            validation: { ...editingField.validation, max: Number(e.target.value) }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Step</Label>
                        <Input
                          type="number"
                          value={editingField.validation?.step || 1}
                          onChange={(e) => updateEditingField({ 
                            validation: { ...editingField.validation, step: Number(e.target.value) }
                          })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Edit2 className="h-8 w-8 mx-auto mb-2" />
                <p>Select a field to edit its properties</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Fields
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SectionFieldEditor;