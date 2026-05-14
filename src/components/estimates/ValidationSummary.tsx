import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";
import { FormFieldConfig } from "@/services/estimates/form-engine-v2";

interface ValidationSummaryProps {
  validationErrors: Record<string, string[]>;
  sections: Array<{
    id: string;
    label: string;
    enabled: boolean;
    fields?: FormFieldConfig[];
  }>;
  formData: Record<string, unknown>;
  onNavigateToError?: (sectionId: string, fieldName: string) => void;
  className?: string;
}

const ValidationSummary: React.FC<ValidationSummaryProps> = ({
  validationErrors,
  sections,
  formData,
  onNavigateToError,
  className = ""
}) => {
  const [isExpanded, setIsExpanded] = React.useState(true);

  // Calculate validation statistics
  const totalErrors = Object.values(validationErrors).reduce(
    (sum, errors) => sum + errors.length, 0
  );

  const enabledSections = sections.filter(s => s.enabled);
  const totalFields = enabledSections.reduce(
    (sum, section) => sum + (section.fields?.length || 0), 0
  );

  const completedFields = enabledSections.reduce((sum, section) => {
    const sectionFields = section.fields || [];
    const filledFields = sectionFields.filter(field => {
      const value = formData[field.name];
      return value !== undefined && value !== null && value !== '';
    });
    return sum + filledFields.length;
  }, 0);

  const sectionsWithErrors = Object.keys(validationErrors).filter(
    sectionId => validationErrors[sectionId].length > 0
  );

  const getErrorsForSection = (sectionId: string) => {
    return validationErrors[sectionId] || [];
  };

  const getFieldsWithErrors = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section?.fields) return [];

    return section.fields.filter(field => {
      const sectionErrors = validationErrors[sectionId] || [];
      return sectionErrors.some(error => error.includes(field.label || field.name));
    });
  };

  const handleNavigateToError = (sectionId: string, fieldName?: string) => {
    if (onNavigateToError && fieldName) {
      onNavigateToError(sectionId, fieldName);
    }
  };

  if (totalErrors === 0 && completedFields === totalFields) {
    return (
      <Alert className={`border-green-200 bg-green-50 ${className}`}>
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          All sections completed successfully! No validation errors found.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={`border-l-4 ${totalErrors > 0 ? 'border-l-red-500' : 'border-l-yellow-500'} ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {totalErrors > 0 ? (
              <XCircle className="h-5 w-5 text-red-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            )}
            <CardTitle className="text-base">
              {totalErrors > 0 ? 'Validation Errors' : 'Form Progress'}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {completedFields}/{totalFields} fields
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <CardDescription>
          {totalErrors > 0 
            ? `${totalErrors} validation error${totalErrors !== 1 ? 's' : ''} found in ${sectionsWithErrors.length} section${sectionsWithErrors.length !== 1 ? 's' : ''}`
            : `Form is ${Math.round((completedFields / totalFields) * 100)}% complete`
          }
        </CardDescription>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Progress Overview */}
            <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span>Overall Progress</span>
                  <span>{completedFields}/{totalFields}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(completedFields / totalFields) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Section-by-section breakdown */}
            <div className="space-y-3">
              {enabledSections.map(section => {
                const sectionErrors = getErrorsForSection(section.id);
                const fieldsWithErrors = getFieldsWithErrors(section.id);
                const sectionFields = section.fields || [];
                const sectionCompleted = sectionFields.filter(field => {
                  const value = formData[field.name];
                  return value !== undefined && value !== null && value !== '';
                }).length;

                return (
                  <div key={section.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{section.label}</h4>
                        {sectionErrors.length > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {sectionErrors.length} error{sectionErrors.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {sectionCompleted}/{sectionFields.length} fields
                      </span>
                    </div>

                    {/* Section progress bar */}
                    <div className="w-full bg-muted rounded-full h-1.5 mb-2">
                      <div 
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          sectionErrors.length > 0 ? 'bg-red-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${sectionFields.length > 0 ? (sectionCompleted / sectionFields.length) * 100 : 0}%` }}
                      />
                    </div>

                    {/* Errors for this section */}
                    {sectionErrors.length > 0 && (
                      <div className="space-y-1">
                        {fieldsWithErrors.map(field => {
                          const fieldErrors = sectionErrors.filter(error => 
                            error.includes(field.label || field.name)
                          );
                          
                          return fieldErrors.map((error, index) => (
                            <div key={`${field.name}-${index}`} className="flex items-center justify-between">
                              <span className="text-xs text-red-600">{error}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-1 text-xs"
                                onClick={() => handleNavigateToError(section.id, field.name)}
                              >
                                Go to field
                              </Button>
                            </div>
                          ));
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Action buttons */}
            {totalErrors > 0 && (
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const firstErrorSection = sectionsWithErrors[0];
                    const firstErrorField = getFieldsWithErrors(firstErrorSection)[0];
                    if (firstErrorField) {
                      handleNavigateToError(firstErrorSection, firstErrorField.name);
                    }
                  }}
                >
                  Go to first error
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default ValidationSummary;