import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Code, AlertTriangle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { configServiceV2, ValidationRule } from "@/services/estimates/config-service-v2";

interface ValidationRuleDialogProps {
  onRuleCreated: (rule: ValidationRule) => void;
  children: React.ReactNode;
}

const ValidationRuleDialog: React.FC<ValidationRuleDialogProps> = ({
  onRuleCreated,
  children
}) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    rule_name: '',
    rule_function: 'function validate(value, fieldConfig) {\n  // Return true if valid, false if invalid\n  return value && value.length > 0;\n}',
    rule_message_template: 'This field is invalid'
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Basic validation of the function syntax
      if (!formData.rule_function.includes('function validate')) {
        throw new Error('Rule function must contain a "validate" function');
      }

      const rule = await configServiceV2.saveValidationRule({
        rule_name: formData.rule_name,
        rule_function: formData.rule_function,
        rule_message_template: formData.rule_message_template
      });

      onRuleCreated(rule);
      toast({
        title: "Success",
        description: "Validation rule created successfully"
      });
      
      setOpen(false);
      setFormData({
        rule_name: '',
        rule_function: 'function validate(value, fieldConfig) {\n  // Return true if valid, false if invalid\n  return value && value.length > 0;\n}',
        rule_message_template: 'This field is invalid'
      });
    } catch (error) {
      console.error('Error creating validation rule:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create validation rule",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const ruleExamples = [
    {
      name: "Email Validation",
      description: "Validates email format",
      function: `function validate(value, fieldConfig) {
  if (!value) return !fieldConfig.required;
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return emailRegex.test(value);
}`,
      message: "Please enter a valid email address"
    },
    {
      name: "Min Length",
      description: "Validates minimum character length",
      function: `function validate(value, fieldConfig) {
  if (!value) return !fieldConfig.required;
  const minLength = fieldConfig.minLength || 0;
  return value.length >= minLength;
}`,
      message: "Input must be at least {minLength} characters long"
    },
    {
      name: "Number Range",
      description: "Validates number is within range",
      function: `function validate(value, fieldConfig) {
  if (!value) return !fieldConfig.required;
  const num = Number(value);
  if (isNaN(num)) return false;
  
  const min = fieldConfig.min || 0;
  const max = fieldConfig.max || 100;
  return num >= min && num <= max;
}`,
      message: "Number must be between {min} and {max}"
    }
  ];

  const loadExample = (example: typeof ruleExamples[0]) => {
    setFormData({
      rule_name: example.name.toLowerCase().replace(/\s+/g, '_'),
      rule_function: example.function,
      rule_message_template: example.message
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Create Validation Rule
          </DialogTitle>
          <DialogDescription>
            Create a custom validation rule that can be reused across fields
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rule-name">Rule Name</Label>
                <Input
                  id="rule-name"
                  value={formData.rule_name}
                  onChange={(e) => updateFormData('rule_name', e.target.value)}
                  placeholder="e.g. email_validation, min_length"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rule-function">Validation Function</Label>
                <Textarea
                  id="rule-function"
                  value={formData.rule_function}
                  onChange={(e) => updateFormData('rule_function', e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="error-message">Error Message Template</Label>
                <Input
                  id="error-message"
                  value={formData.rule_message_template}
                  onChange={(e) => updateFormData('rule_message_template', e.target.value)}
                  placeholder="Error message shown when validation fails"
                  required
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800">Function Requirements:</p>
                    <ul className="mt-1 text-yellow-700 space-y-1">
                      <li>• Must contain a "validate" function</li>
                      <li>• Function receives (value, fieldConfig) parameters</li>
                      <li>• Must return true (valid) or false (invalid)</li>
                      <li>• Use template variables like {`{minLength}`} in messages</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create Rule"}
                </Button>
              </div>
            </form>
          </div>

          {/* Examples */}
          <div className="space-y-4">
            <h3 className="font-medium">Examples</h3>
            <div className="space-y-3">
              {ruleExamples.map((example, index) => (
                <Card key={index} className="cursor-pointer hover:bg-muted/50" onClick={() => loadExample(example)}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{example.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {example.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button variant="outline" size="sm" className="w-full">
                      Load Example
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ValidationRuleDialog;