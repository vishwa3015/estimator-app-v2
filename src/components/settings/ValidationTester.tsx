import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlaskConical, Play, CheckCircle, XCircle, AlertTriangle, Download } from "lucide-react";
import { useEstimateConfigV2 } from "@/hooks/use-estimate-config-v2";
import { FormEngineV2 } from "@/services/estimates/form-engine-v2";
import { FieldConfig } from "@/types/estimate-items";

interface ValidationTestCase {
  id: string;
  name: string;
  sectionId: string;
  fieldName: string;
  testValue: string | number | boolean
  expectedValid: boolean;
  description: string;
}

const ValidationTester: React.FC = () => {
  const { config, formEngine, isLoading } = useEstimateConfigV2();
  const [testCases, setTestCases] = useState<ValidationTestCase[]>([]);
  const [testResults, setTestResults] = useState<Record<string, { passed: boolean; errors: string[] }>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [customTest, setCustomTest] = useState({
    sectionId: '',
    fieldName: '',
    testValue: '',
    expectedValid: true
  });

  // Generate automatic test cases
  const generateTestCases = () => {
    if (!formEngine) return;

    const sections = formEngine.getSections();
    const cases: ValidationTestCase[] = [];

    sections.forEach(section => {
      section.fields?.forEach(field => {
        // Required field tests
        if (field.required) {
          cases.push({
            id: `${section.id}-${field.name}-empty`,
            name: `Empty ${field.label} (Required)`,
            sectionId: section.id,
            fieldName: field.name,
            testValue: '',
            expectedValid: false,
            description: `Required field should fail validation when empty`
          });

          cases.push({
            id: `${section.id}-${field.name}-valid`,
            name: `Valid ${field.label}`,
            sectionId: section.id,
            fieldName: field.name,
            testValue: getValidTestValue(field),
            expectedValid: true,
            description: `Required field should pass validation with valid value`
          });
        }

        // Type-specific tests
        if (field.type === 'number') {
          cases.push({
            id: `${section.id}-${field.name}-invalid-number`,
            name: `Invalid Number ${field.label}`,
            sectionId: section.id,
            fieldName: field.name,
            testValue: 'not a number',
            expectedValid: false,
            description: `Number field should fail with non-numeric input`
          });
        }

        if (field.type === 'date') {
          cases.push({
            id: `${section.id}-${field.name}-invalid-date`,
            name: `Invalid Date ${field.label}`,
            sectionId: section.id,
            fieldName: field.name,
            testValue: 'invalid date',
            expectedValid: false,
            description: `Date field should fail with invalid date format`
          });
        }

        // Validation rule tests
        if (field.validation?.min !== undefined) {
          cases.push({
            id: `${section.id}-${field.name}-below-min`,
            name: `Below Min ${field.label}`,
            sectionId: section.id,
            fieldName: field.name,
            testValue: field.validation.min - 1,
            expectedValid: false,
            description: `Field should fail when below minimum value`
          });
        }

        if (field.validation?.max !== undefined) {
          cases.push({
            id: `${section.id}-${field.name}-above-max`,
            name: `Above Max ${field.label}`,
            sectionId: section.id,
            fieldName: field.name,
            testValue: field.validation.max + 1,
            expectedValid: false,
            description: `Field should fail when above maximum value`
          });
        }
      });
    });

    setTestCases(cases);
  };

  const getValidTestValue = (field: FieldConfig) => {
    switch (field.type) {
      case 'number':
        return field.validation?.min !== undefined ? field.validation.min + 1 : 42;
      case 'date':
        return new Date().toISOString().split('T')[0];
      case 'switch':
        return true;
      case 'slider':
        return field.validation?.min !== undefined ? field.validation.min + 1 : 50;
      case 'dropdown':
        return field.options?.[0]?.value || 'option1';
      default:
        return 'Test value';
    }
  };

  const runAllTests = async () => {
    if (!formEngine) return;

    setIsRunning(true);
    const results: Record<string, { passed: boolean; errors: string[] }> = {};

    for (const testCase of testCases) {
      try {
        const field = formEngine.getSectionFields(testCase.sectionId)
          .find(f => f.name === testCase.fieldName);

        if (!field) {
          results[testCase.id] = {
            passed: false,
            errors: ['Field not found']
          };
          continue;
        }

        const validation = formEngine.validateField(field, testCase.testValue);
        const passed = validation.isValid === testCase.expectedValid;

        results[testCase.id] = {
          passed,
          errors: passed ? [] : [
            `Expected ${testCase.expectedValid ? 'valid' : 'invalid'}, got ${validation.isValid ? 'valid' : 'invalid'}`,
            ...validation.errors
          ]
        };
      } catch (error) {
        results[testCase.id] = {
          passed: false,
          errors: [`Test error: ${error instanceof Error ? error.message : 'Unknown error'}`]
        };
      }
    }

    setTestResults(results);
    setIsRunning(false);
  };

  const runSingleTest = async (testCase: ValidationTestCase) => {
    if (!formEngine) return;

    try {
      const field = formEngine.getSectionFields(testCase.sectionId)
        .find(f => f.name === testCase.fieldName);

      if (!field) {
        setTestResults(prev => ({
          ...prev,
          [testCase.id]: { passed: false, errors: ['Field not found'] }
        }));
        return;
      }

      const validation = formEngine.validateField(field, testCase.testValue);
      const passed = validation.isValid === testCase.expectedValid;

      setTestResults(prev => ({
        ...prev,
        [testCase.id]: {
          passed,
          errors: passed ? [] : [
            `Expected ${testCase.expectedValid ? 'valid' : 'invalid'}, got ${validation.isValid ? 'valid' : 'invalid'}`,
            ...validation.errors
          ]
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [testCase.id]: {
          passed: false,
          errors: [`Test error: ${error instanceof Error ? error.message : 'Unknown error'}`]
        }
      }));
    }
  };

  const addCustomTest = () => {
    if (!customTest.sectionId || !customTest.fieldName) return;

    const newTest: ValidationTestCase = {
      id: `custom-${Date.now()}`,
      name: `Custom Test: ${customTest.fieldName}`,
      sectionId: customTest.sectionId,
      fieldName: customTest.fieldName,
      testValue: customTest.testValue,
      expectedValid: customTest.expectedValid,
      description: `Custom test for ${customTest.fieldName}`
    };

    setTestCases(prev => [...prev, newTest]);
    setCustomTest({ sectionId: '', fieldName: '', testValue: '', expectedValid: true });
  };

  const exportResults = () => {
    const report = {
      timestamp: new Date().toISOString(),
      configuration: config?.config_name,
      totalTests: testCases.length,
      passedTests: Object.values(testResults).filter(r => r.passed).length,
      failedTests: Object.values(testResults).filter(r => !r.passed).length,
      testCases: testCases.map(tc => ({
        ...tc,
        result: testResults[tc.id]
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `validation-test-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const passedTests = Object.values(testResults).filter(r => r.passed).length;
  const totalTests = testCases.length;
  const failedTests = totalTests - passedTests;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Validation Tester
          </CardTitle>
          <CardDescription>Loading configuration...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5" />
          Validation Tester
        </CardTitle>
        <CardDescription>
          Test validation rules and ensure your form configuration works correctly
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="auto" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="auto">Auto Tests</TabsTrigger>
            <TabsTrigger value="custom">Custom Tests</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          <TabsContent value="auto" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Automatic Test Generation</h3>
                <p className="text-sm text-muted-foreground">
                  Generate tests for all fields based on their validation rules
                </p>
              </div>
              <Button onClick={generateTestCases} disabled={!formEngine}>
                Generate Tests
              </Button>
            </div>

            {testCases.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">
                    {testCases.length} test{testCases.length !== 1 ? 's' : ''} generated
                  </Badge>
                  <div className="flex gap-2">
                    <Button
                      onClick={runAllTests}
                      disabled={isRunning}
                      className="gap-2"
                    >
                      <Play className="h-4 w-4" />
                      {isRunning ? 'Running...' : 'Run All Tests'}
                    </Button>
                    {Object.keys(testResults).length > 0 && (
                      <Button variant="outline" onClick={exportResults} className="gap-2">
                        <Download className="h-4 w-4" />
                        Export Results
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {testCases.map(testCase => {
                    const result = testResults[testCase.id];
                    return (
                      <div key={testCase.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{testCase.name}</span>
                            {result && (
                              result.passed ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {testCase.description}
                          </p>
                          {result && !result.passed && result.errors.length > 0 && (
                            <div className="mt-2">
                              {result.errors.map((error, index) => (
                                <p key={index} className="text-xs text-red-600">
                                  {error}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => runSingleTest(testCase)}
                        >
                          Run
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <div>
              <h3 className="font-medium mb-4">Add Custom Test</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Section ID</Label>
                  <Input
                    value={customTest.sectionId}
                    onChange={(e) => setCustomTest(prev => ({ ...prev, sectionId: e.target.value }))}
                    placeholder="e.g. basic_info"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Field Name</Label>
                  <Input
                    value={customTest.fieldName}
                    onChange={(e) => setCustomTest(prev => ({ ...prev, fieldName: e.target.value }))}
                    placeholder="e.g. customer_name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Test Value</Label>
                  <Input
                    value={customTest.testValue}
                    onChange={(e) => setCustomTest(prev => ({ ...prev, testValue: e.target.value }))}
                    placeholder="Value to test"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expected Result</Label>
                  <select
                    className="w-full p-2 border rounded"
                    value={customTest.expectedValid.toString()}
                    onChange={(e) => setCustomTest(prev => ({ ...prev, expectedValid: e.target.value === 'true' }))}
                  >
                    <option value="true">Should be valid</option>
                    <option value="false">Should be invalid</option>
                  </select>
                </div>
              </div>
              <Button onClick={addCustomTest} className="mt-4">
                Add Test
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            {Object.keys(testResults).length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-green-600">{passedTests}</div>
                      <p className="text-xs text-muted-foreground">Passed</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-red-600">{failedTests}</div>
                      <p className="text-xs text-muted-foreground">Failed</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{totalTests}</div>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </CardContent>
                  </Card>
                </div>

                {failedTests > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {failedTests} test{failedTests !== 1 ? 's' : ''} failed.
                      Review the validation rules and field configurations.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No test results yet. Run some tests to see results here.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ValidationTester;