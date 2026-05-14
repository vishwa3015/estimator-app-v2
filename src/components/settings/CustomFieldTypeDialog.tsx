import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Palette, Code } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { configServiceV2, CustomFieldType } from "@/services/estimates/config-service-v2";

interface CustomFieldTypeDialogProps {
  onFieldTypeCreated: (fieldType: CustomFieldType) => void;
  children: React.ReactNode;
}

const CustomFieldTypeDialog: React.FC<CustomFieldTypeDialogProps> = ({
  onFieldTypeCreated,
  children
}) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    field_type_name: '',
    description: '',
    component_config: '{\n  "placeholder": "Enter value",\n  "className": "w-full"\n}',
    validation_schema: '{\n  "required": false,\n  "minLength": 0,\n  "maxLength": 255\n}'
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate JSON
      const componentConfig = JSON.parse(formData.component_config);
      const validationSchema = JSON.parse(formData.validation_schema);

      const fieldType = await configServiceV2.saveCustomFieldType({
        field_type_name: formData.field_type_name,
        component_config: componentConfig,
        validation_schema: validationSchema
      });

      onFieldTypeCreated(fieldType);
      toast({
        title: "Success",
        description: "Custom field type created successfully"
      });
      
      setOpen(false);
      setFormData({
        field_type_name: '',
        description: '',
        component_config: '{\n  "placeholder": "Enter value",\n  "className": "w-full"\n}',
        validation_schema: '{\n  "required": false,\n  "minLength": 0,\n  "maxLength": 255\n}'
      });
    } catch (error) {
      console.error('Error creating field type:', error);
      toast({
        title: "Error",
        description: error instanceof Error && error.message.includes('JSON') 
          ? "Invalid JSON in configuration" 
          : "Failed to create custom field type",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Create Custom Field Type
          </DialogTitle>
          <DialogDescription>
            Create a reusable field type with custom configuration and validation
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Field Type Name</Label>
              <Input
                id="name"
                value={formData.field_type_name}
                onChange={(e) => updateFormData('field_type_name', e.target.value)}
                placeholder="e.g. custom_address, rich_description"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => updateFormData('description', e.target.value)}
                placeholder="Describe what this field type is used for"
                rows={3}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Code className="h-4 w-4" />
                  Component Configuration
                </CardTitle>
                <CardDescription>
                  JSON configuration for the field component
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.component_config}
                  onChange={(e) => updateFormData('component_config', e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                  placeholder='{\n  "placeholder": "Enter value",\n  "className": "w-full"\n}'
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Code className="h-4 w-4" />
                  Validation Schema
                </CardTitle>
                <CardDescription>
                  JSON schema for field validation rules
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.validation_schema}
                  onChange={(e) => updateFormData('validation_schema', e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                  placeholder='{\n  "required": false,\n  "minLength": 0,\n  "maxLength": 255\n}'
                />
              </CardContent>
            </Card>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Configuration Examples:</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Component Config:</strong> Controls UI appearance and behavior</p>
              <p><strong>Validation Schema:</strong> Defines validation rules and constraints</p>
              <p>Both configurations must be valid JSON objects</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Field Type"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomFieldTypeDialog;