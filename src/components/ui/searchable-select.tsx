import * as React from "react";
import { ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  emptyText?: string;
}

/**
 * A searchable select (combobox) that works reliably in dialogs and forms.
 * Use instead of Radix Select when the dropdown doesn't open or selection doesn't update.
 */
const SearchableSelect = React.forwardRef<HTMLDivElement, SearchableSelectProps>(
  (
    {
      options,
      value,
      onValueChange,
      placeholder = "Select…",
      searchPlaceholder = "Search…",
      className,
      triggerClassName,
      disabled = false,
      emptyText = "No option found.",
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");

    const wrapperRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          wrapperRef.current &&
          !wrapperRef.current.contains(event.target as Node)
        ) {
          setOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedOption = options.find((opt) => opt.value === value);

    const filteredOptions = options.filter((opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (optionValue: string) => {
      onValueChange(optionValue);
      setOpen(false);
      setSearch("");
    };

    return (
      <div ref={wrapperRef} className={cn("relative w-full", className)}>
        {/* Trigger */}
        <div
          ref={ref}
          onClick={() => !disabled && setOpen((prev) => !prev)}
          className={cn(
            "flex items-center justify-between border rounded-md h-10 px-3 text-sm cursor-pointer bg-white",
            !selectedOption && "text-gray-400",
            disabled && "opacity-50 cursor-not-allowed",
            triggerClassName
          )}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </div>

        {/* Dropdown */}
        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-md">
            {/* Search */}
            <div className="p-1 border-b">
              <div className="relative">
                <Search className="absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 ml-1" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-7 pr-2 py-1 text-sm outline-none"
                />
              </div>
            </div>

            {/* Options */}
            <div className="max-h-[300px] overflow-y-auto">
              {filteredOptions.length === 0 && (
                <div className="p-1 text-sm text-gray-500">{emptyText}</div>
              )}

              {filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
                >
                  {opt.label}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);

SearchableSelect.displayName = "SearchableSelect";

export { SearchableSelect };
