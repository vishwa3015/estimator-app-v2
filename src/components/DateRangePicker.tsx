
import React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "@/services/reportingService";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateRangePickerProps {
  dateRange: DateRange;
  onChange: (range: DateRange) => void;
}

export default function DateRangePicker({ dateRange, onChange }: DateRangePickerProps) {
  const { startDate, endDate } = dateRange;

  const handleCalendarChange = (newRange: { from: Date; to?: Date }) => {
    onChange({
      startDate: newRange.from,
      endDate: newRange.to || newRange.from
    });
  };

  // Predefined date ranges
  const handleQuickSelect = (value: string) => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
    
    let range: DateRange = { startDate: null, endDate: null };

    switch (value) {
      case "this-month":
        range = { startDate: firstDayOfMonth, endDate: lastDayOfMonth };
        break;
      case "last-month":
        range = { startDate: firstDayOfLastMonth, endDate: lastDayOfLastMonth };
        break;
      case "this-year":
        range = { startDate: firstDayOfYear, endDate: today };
        break;
      case "all-time":
        range = { startDate: null, endDate: null };
        break;
      default:
        break;
    }

    onChange(range);
  };

  const displayDateRange = startDate && endDate
    ? `${format(startDate, "MMM d, yyyy")} - ${format(endDate, "MMM d, yyyy")}`
    : "All Time";

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <Select onValueChange={handleQuickSelect}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="this-month">This Month</SelectItem>
          <SelectItem value="last-month">Last Month</SelectItem>
          <SelectItem value="this-year">This Year</SelectItem>
          <SelectItem value="all-time">All Time</SelectItem>
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal sm:w-[300px]",
              !startDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayDateRange}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={startDate || new Date()}
            selected={startDate && endDate ? { from: startDate, to: endDate } : undefined}
            onSelect={handleCalendarChange}
            numberOfMonths={2}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
