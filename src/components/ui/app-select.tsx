import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface AppSelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface AppSelectProps {
  options: AppSelectOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

/**
 * Common select component built on shadcn/Radix Select.
 * Supports proper keyboard navigation and native scroll.
 * Pass `value=""` (or undefined) with a `placeholder` to show the placeholder text.
 */
const AppSelect = React.forwardRef<HTMLButtonElement, AppSelectProps>(
  (
    {
      options,
      value,
      onValueChange,
      placeholder = "Select…",
      className,
      triggerClassName,
      disabled = false,
    },
    ref
  ) => {
    return (
      <Select value={value ?? ""} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger
          ref={ref}
          className={cn("w-full", triggerClassName, className)}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              <span>{opt.label}</span>
              {opt.description && (
                <span className="ml-2 text-xs text-muted-foreground">{opt.description}</span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
);

AppSelect.displayName = "AppSelect";

export { AppSelect };
