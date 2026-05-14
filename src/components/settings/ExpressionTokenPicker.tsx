import React, { useEffect, useMemo, useRef, useState } from "react";
import { Hash, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface TokenOption {
  key: string;
  label: string;
  description?: string;
  group: string;
}

export interface OperatorOption {
  key: string;
  label: string;
  description: string;
}

type VisibleItemData = {
  key: string;
  type: "measurement" | "waste" | "formula" | "number" | "operator" | "bracket";
  data: TokenOption | OperatorOption | { value: string };
  disabled: boolean;
  group: string;
};

interface ExpressionTokenPickerProps {
  tokens: string[];
  onTokensChange: (tokens: string[]) => void;
  measurementOptions: TokenOption[];
  formulaOptions: TokenOption[];
  wasteOption?: TokenOption;
  operatorOptions: OperatorOption[];
  bracketOptions: OperatorOption[];
  canAddOperand: (tokens: string[]) => boolean;
  canAddBinaryOp: (tokens: string[]) => boolean;
  canAddOpen: (tokens: string[]) => boolean;
  canAddClose: (tokens: string[]) => boolean;
  tokenClassName?: (token: string) => string;
  placeholder?: string;
}

const ExpressionTokenPicker: React.FC<ExpressionTokenPickerProps> = ({
  tokens,
  onTokensChange,
  measurementOptions,
  formulaOptions,
  wasteOption,
  operatorOptions,
  bracketOptions,
  canAddOperand,
  canAddBinaryOp,
  canAddOpen,
  canAddClose,
  tokenClassName,
  placeholder = "Click to add a measurement or operator...",
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isValidNumber = (value: string): boolean => {
    const trimmed = value.trim();
    if (trimmed === "" || trimmed === "-" || trimmed === ".") return false;
    const numberRegex = /^-?\d+(\.\d+)?$/;
    if (!numberRegex.test(trimmed)) return false;
    const num = Number(trimmed);
    return Number.isFinite(num) && !Number.isNaN(num);
  };

  const visibleItemsData = useMemo(() => {
    const items: VisibleItemData[] = [];
    const lowerSearch = search.toLowerCase();

    if (canAddOperand(tokens)) {
      const filteredMeasurements = measurementOptions.filter(
        (m) => !search || m.label.toLowerCase().includes(lowerSearch) || m.key.toLowerCase().includes(lowerSearch)
      );
      for (const m of filteredMeasurements) {
        items.push({ key: m.key, type: "measurement", data: m, disabled: false, group: "Measurements" });
      }

      if (
        wasteOption &&
        (!search ||
          "waste".includes(lowerSearch) ||
          "wastage".includes(lowerSearch) ||
          "waste_percentage".includes(lowerSearch))
      ) {
        items.push({ key: wasteOption.key, type: "waste", data: wasteOption, disabled: false, group: "Waste %" });
      }

      const filteredFormulas = formulaOptions.filter(
        (f) => !search || f.label.toLowerCase().includes(lowerSearch) || f.key.toLowerCase().includes(lowerSearch)
      );
      for (const f of filteredFormulas) {
        items.push({ key: f.key, type: "formula", data: f, disabled: false, group: "Existing formulas" });
      }

      if (isValidNumber(search)) {
        items.push({
          key: `__num__${search.trim()}`,
          type: "number",
          data: { value: search.trim() },
          disabled: false,
          group: "Number",
        });
      }
    }

    for (const op of operatorOptions) {
      items.push({
        key: `__op__${op.key}`,
        type: "operator",
        data: op,
        disabled: !canAddBinaryOp(tokens),
        group: "Operators",
      });
    }

    for (const bracket of bracketOptions) {
      const disabled = bracket.key === "(" ? !canAddOpen(tokens) : !canAddClose(tokens);
      items.push({
        key: `__bracket__${bracket.key}`,
        type: "bracket",
        data: bracket,
        disabled,
        group: "Operators",
      });
    }

    return items;
  }, [
    tokens,
    search,
    measurementOptions,
    formulaOptions,
    wasteOption,
    operatorOptions,
    bracketOptions,
    canAddOperand,
    canAddBinaryOp,
    canAddOpen,
    canAddClose,
    isValidNumber,
  ]);

  const renderItemLabel = (item: VisibleItemData): React.ReactNode => {
    switch (item.type) {
      case "measurement":
      case "waste":
      case "formula": {
        const d = item.data as TokenOption;
        return (
          <div className="flex items-center justify-between w-full">
            <span className="font-medium">{d.label}</span>
            <span className={item.type === "formula" ? "text-xs text-muted-foreground font-mono" : "text-xs text-muted-foreground"}>
              {item.type === "formula" ? d.key : d.description}
            </span>
          </div>
        );
      }
      case "number": {
        const d = item.data as { value: string };
        return (
          <div className="flex items-center gap-2">
            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
            <span>
              Use <span className="font-mono font-semibold">{d.value}</span> as a number
            </span>
          </div>
        );
      }
      case "operator":
      case "bracket": {
        const d = item.data as OperatorOption;
        return (
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold w-6 text-center">{d.label}</span>
            <span className="text-muted-foreground text-xs">{d.description}</span>
          </div>
        );
      }
      default:
        return null;
    }
  };

  const enabledItems = visibleItemsData.filter((item) => !item.disabled);

  const handleSelect = (item: VisibleItemData) => {
    if (item.disabled) return;

    let tokenValue: string;
    if (item.key.startsWith("__num__")) {
      tokenValue = item.key.replace("__num__", "");
    } else if (item.key.startsWith("__op__")) {
      tokenValue = item.key.replace("__op__", "");
    } else if (item.key.startsWith("__bracket__")) {
      tokenValue = item.key.replace("__bracket__", "");
    } else {
      tokenValue = item.key;
    }

    onTokensChange([...tokens, tokenValue]);
    setSearch("");
    setHighlightedIndex(0);
  };

  const removeLastToken = () => {
    onTokensChange(tokens.slice(0, -1));
  };

  useEffect(() => {
    setHighlightedIndex(0);
  }, [search]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!listRef.current) return;
    const highlighted = listRef.current.querySelector('[data-highlighted="true"]');
    if (highlighted) {
      highlighted.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev + 1;
        return next >= enabledItems.length ? 0 : next;
      });
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev - 1;
        return next < 0 ? enabledItems.length - 1 : next;
      });
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (enabledItems[highlightedIndex]) {
        handleSelect(enabledItems[highlightedIndex]);
      }
    } else if (event.key === "Backspace" && search.length === 0 && tokens.length > 0) {
      event.preventDefault();
      removeLastToken();
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const groups = visibleItemsData.reduce<Record<string, VisibleItemData[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  const enabledIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    let idx = 0;
    for (const item of visibleItemsData) {
      if (!item.disabled) {
        map.set(item.key, idx);
        idx++;
      }
    }
    return map;
  }, [visibleItemsData]);

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="relative">
        <div
          className="flex min-h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
          onClick={() => {
            setOpen(true);
            inputRef.current?.focus();
          }}
        >
          <Search className="h-4 w-4 shrink-0 opacity-50" />
          <input
            ref={inputRef}
            value={search}
            onFocus={() => setOpen(true)}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        {open && (
          <div className="absolute bottom-full z-50 mb-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
            <div ref={listRef} className="max-h-[280px] overflow-y-auto overscroll-contain p-1">
              {visibleItemsData.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No results found.
                </div>
              ) : (
                Object.entries(groups).map(([group, items]) => (
                  <div key={group}>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      {group}
                    </div>
                    {items.map((item) => {
                      const enabledIndex = enabledIndexMap.get(item.key) ?? -1;
                      const isHighlighted = enabledIndex >= 0 && enabledIndex === highlightedIndex;

                      return (
                        <div
                          key={item.key}
                          data-highlighted={isHighlighted ? "true" : undefined}
                          onClick={() => !item.disabled && handleSelect(item)}
                          className={cn(
                            "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                            item.disabled && "pointer-events-none opacity-50",
                            isHighlighted && "bg-accent text-accent-foreground",
                            !item.disabled && !isHighlighted && "hover:bg-accent/50 cursor-pointer"
                          )}
                        >
                          {renderItemLabel(item)}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex min-h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm">
        {tokens.length === 0 ? (
          <input
            disabled
            placeholder="Expression appears here..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        ) : (
          <div className="flex w-full flex-wrap items-center gap-1.5 rounded-sm">
            {tokens.map((token, index) => (
              <span
                key={`${index}-${token}`}
                className={cn(
                  "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
                  tokenClassName?.(token)
                )}
              >
                {token}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={tokens.length === 0}
          onClick={removeLastToken}
        >
          Remove last
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={tokens.length === 0}
          onClick={() => onTokensChange([])}
        >
          Clear all
        </Button>
      </div>
    </div>
  );
};

export default ExpressionTokenPicker;
