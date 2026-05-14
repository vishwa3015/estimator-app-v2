import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { FormFieldConfig } from '@/services/estimates/form-engine-v2';

interface FormFieldRendererProps {
  field: FormFieldConfig;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
}

const FormFieldRenderer: React.FC<FormFieldRendererProps> = ({
  field,
  value,
  onChange,
  error
}) => {
  const renderField = () => {
    switch (field.type) {
      case 'text':
      case 'email': {
        const strVal = typeof value === 'string' ? value : '';
        return (
          <Input
            type={field.type}
            value={strVal}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={error ? 'border-destructive' : ''}
          />
        );
      }

      case 'number': {
        const numVal = value != null ? String(value) : '';
        return (
          <Input
            type="number"
            value={numVal}
            onChange={(e) => onChange(Number(e.target.value))}
            placeholder={field.placeholder}
            className={error ? 'border-destructive' : ''}
          />
        );
      }

      case 'textarea': {
        const strVal = typeof value === 'string' ? value : '';
        return (
          <Textarea
            value={strVal}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={error ? 'border-destructive' : ''}
            rows={field.rows || 3}
          />
        );
      }

      case 'date': {
        const dateVal = typeof value === 'string' || typeof value === 'number'
          ? new Date(value)
          : undefined;
        return (
          <DatePicker
            date={dateVal}
            onSelect={(date) => onChange(date?.toISOString())}
          />
        );
      }

      case 'switch':
        return (
          <Switch
            checked={!!value}
            onCheckedChange={(checked) => onChange(checked)}
          />
        );

      case 'slider': {
        const numVal = typeof value === 'number' ? value
          : typeof field.default === 'number' ? field.default
          : 0;
        return (
          <div className="space-y-2">
            <Slider
              value={[numVal]}
              onValueChange={(values) => onChange(values[0])}
              min={field.min || 0}
              max={field.max || 100}
              step={field.step || 1}
              className="w-full"
            />
            <div className="text-sm text-muted-foreground text-center">
              {numVal}
            </div>
          </div>
        );
      }

      case 'radio': {
        const strVal = typeof value === 'string' ? value : '';
        return (
          <RadioGroup
            value={strVal}
            onValueChange={(v) => onChange(v)}
          >
            {field.options?.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={option.value} />
                <Label htmlFor={option.value}>{option.name}</Label>
              </div>
            ))}
          </RadioGroup>
        );
      }

      case 'dropdown': {
        const strVal = typeof value === 'string' ? value : '';
        return (
          <Select value={strVal} onValueChange={(v) => onChange(v)}>
            <SelectTrigger className={error ? 'border-destructive' : ''}>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }

      case 'upload': {
        const fileName = value instanceof File ? value.name
          : typeof value === 'string' ? value
          : null;
        return (
          <div className="space-y-2">
            <Input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onChange(file);
              }}
              accept={field.allowedTypes?.join(',') || '*'}
              className={error ? 'border-destructive' : ''}
            />
            {fileName && (
              <div className="text-sm text-muted-foreground">
                Selected: {fileName}
              </div>
            )}
          </div>
        );
      }

      case 'array': {
        const arrVal = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
        return (
          <ArrayFieldRenderer
            field={field}
            value={arrVal}
            onChange={(newVal) => onChange(newVal)}
            error={error}
          />
        );
      }

      case 'richtext': {
        const strVal = typeof value === 'string' ? value : '';
        return (
          <Textarea
            value={strVal}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={error ? 'border-destructive' : ''}
            rows={6}
          />
        );
      }

      default:
        return (
          <div className="text-muted-foreground text-sm">
            Unsupported field type: {field.type}
          </div>
        );
    }
  };

  return (
    <div className="space-y-2">
      {field.label && (
        <Label className="text-sm font-medium">
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      {renderField()}
      {error && (
        <div className="text-sm text-destructive">{error}</div>
      )}
    </div>
  );
};

// Array field renderer for handling array-type fields
const ArrayFieldRenderer: React.FC<{
  field: FormFieldConfig;
  value: Record<string, unknown>[];
  onChange: (value: Record<string, unknown>[]) => void;
  error?: string;
}> = ({ field, value, onChange, error }) => {
  const addItem = () => {
    const newItem = field.fields?.reduce((acc, subField) => {
      acc[subField.name] = subField.default || '';
      return acc;
    }, {} as Record<string, unknown>) || {};

    onChange([...value, newItem]);
  };

  const removeItem = (index: number) => {
    const newValue = value.filter((_, i) => i !== index);
    onChange(newValue);
  };

  const updateItem = (index: number, fieldName: string, fieldValue: unknown) => {
    const newValue = [...value];
    newValue[index] = { ...newValue[index], [fieldName]: fieldValue };
    onChange(newValue);
  };

  return (
    <div className="space-y-4 border rounded-lg p-4">
      {value.map((item, index) => (
        <div key={index} className="space-y-2 border rounded p-3 bg-muted/50">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Item {index + 1}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeItem(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          
          {field.fields?.map((subField) => (
            <FormFieldRenderer
              key={subField.name}
              field={subField}
              value={item[subField.name]}
              onChange={(fieldValue) => updateItem(index, subField.name, fieldValue)}
            />
          ))}
        </div>
      ))}
      
      <Button
        type="button"
        variant="outline"
        onClick={addItem}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add {field.label || 'Item'}
      </Button>
      
      {error && (
        <div className="text-sm text-destructive">{error}</div>
      )}
    </div>
  );
};

export default FormFieldRenderer;