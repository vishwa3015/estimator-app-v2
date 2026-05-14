import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Plus, Edit2, Trash2, TestTube } from "lucide-react";
import { useEstimateConfigV2 } from "@/hooks/use-estimate-config-v2";
import { configServiceV2, CustomFieldType, ValidationRule } from "@/services/estimates/config-service-v2";
import { toast } from "@/components/ui/use-toast";
import SectionFieldEditor from "./SectionFieldEditor";
import CustomFieldTypeDialog from "./CustomFieldTypeDialog";
import ValidationRuleDialog from "./ValidationRuleDialog";
import ValidationTester from "./ValidationTester";
import { FieldConfig, SectionConfig } from "@/types/estimate-items";

const EstimateConfigurationV2 = () => {
  const { config, isLoading, error, getSections, saveConfig } = useEstimateConfigV2();
  const [useV2Editor, setUseV2Editor] = useState(false);
  const [customFieldTypes, setCustomFieldTypes] = useState<CustomFieldType[]>([]);
  const [validationRules, setValidationRules] = useState<ValidationRule[]>([]);

  // Load custom field types and validation rules
  useEffect(() => {
    const loadCustomData = async () => {
      try {
        const [fieldTypes, rules] = await Promise.all([
          configServiceV2.getCustomFieldTypes(),
          configServiceV2.getValidationRules()
        ]);
        setCustomFieldTypes(fieldTypes);
        setValidationRules(rules);
      } catch (error) {
        console.error('Error loading custom data:', error);
      }
    };

    if (useV2Editor) {
      loadCustomData();
    }
  }, [useV2Editor]);

  const handleSectionFieldsUpdate = async (sectionId: string, fields: FieldConfig[]) => {
    try {
      if (!config) return;
      
      // Update the section in the config
      const updatedConfig = {
        ...config.config_data,
        sections: config.config_data.sections.map((section: SectionConfig) => 
          section.id === sectionId ? { ...section, fields } : section
        )
      };

      await saveConfig(updatedConfig, config.config_name);
      toast({
        title: "Success",
        description: "Section fields updated successfully"
      });
    } catch (error) {
      console.error('Error updating section fields:', error);
      toast({
        title: "Error",
        description: "Failed to update section fields",
        variant: "destructive"
      });
    }
  };

  const handleCustomFieldTypeCreated = (fieldType: CustomFieldType) => {
    setCustomFieldTypes(prev => [...prev, fieldType]);
  };

  const handleValidationRuleCreated = (rule: ValidationRule) => {
    setValidationRules(prev => [...prev, rule]);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Estimate Editor V2 Configuration
          </CardTitle>
          <CardDescription>Loading configuration...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Estimate Editor V2 Configuration
          </CardTitle>
          <CardDescription className="text-destructive">
            Error loading configuration: {error}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const sections = getSections();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Estimate Editor V2 Configuration
        </CardTitle>
        <CardDescription>
          Configure the new dynamic estimate editor with custom sections and fields
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable V2 Editor */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <h3 className="font-medium">Use V2 Editor</h3>
            <p className="text-sm text-muted-foreground">
              Enable the new configuration-driven estimate editor
            </p>
          </div>
          <Switch
            checked={useV2Editor}
            onCheckedChange={setUseV2Editor}
          />
        </div>

        {useV2Editor && (
          <Tabs defaultValue="sections" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="sections">Sections</TabsTrigger>
              <TabsTrigger value="fields">Custom Fields</TabsTrigger>
              <TabsTrigger value="validation">Validation Rules</TabsTrigger>
              <TabsTrigger value="testing">Testing</TabsTrigger>
            </TabsList>

            <TabsContent value="sections" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Estimate Sections</h3>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Section
                </Button>
              </div>
              
              <div className="space-y-2">
                {sections.map((section) => (
                  <div
                    key={section.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <h4 className="font-medium">{section.label}</h4>
                        <p className="text-sm text-muted-foreground">
                          {section.fields?.length || 0} fields
                        </p>
                      </div>
                      <Badge variant={section.enabled ? "default" : "secondary"}>
                        {section.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <SectionFieldEditor
                        sectionId={section.id}
                        sectionLabel={section.label}
                        fields={section.fields || []}
                        onSave={handleSectionFieldsUpdate}
                      >
                        <Button variant="outline" size="sm">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </SectionFieldEditor>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="fields" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Custom Field Types</h3>
                <CustomFieldTypeDialog onFieldTypeCreated={handleCustomFieldTypeCreated}>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Field Type
                  </Button>
                </CustomFieldTypeDialog>
              </div>
              
              {customFieldTypes.length > 0 ? (
                <div className="space-y-2">
                  {customFieldTypes.map((fieldType) => (
                    <div
                      key={fieldType.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium">{fieldType.field_type_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Custom field type
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No custom field types created yet.</p>
                  <p className="text-sm">Create reusable field types with custom validation.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="testing" className="space-y-4">
              <ValidationTester />
            </TabsContent>

            <TabsContent value="validation" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Validation Rules</h3>
                <ValidationRuleDialog onRuleCreated={handleValidationRuleCreated}>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Rule
                  </Button>
                </ValidationRuleDialog>
              </div>
              
              {validationRules.length > 0 ? (
                <div className="space-y-2">
                  {validationRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium">{rule.rule_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {rule.rule_message_template}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No custom validation rules created yet.</p>
                  <p className="text-sm">Create reusable validation logic for your fields.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {!useV2Editor && (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            <p>Enable V2 Editor to access configuration options</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EstimateConfigurationV2;