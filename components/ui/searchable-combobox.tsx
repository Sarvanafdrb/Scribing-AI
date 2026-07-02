"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  searchText?: string;
}

export const normalizeComboboxSearch = (value: string) =>
  value.toLowerCase().replace(/\s+/g, "");

export const matchesComboboxSearch = (haystack: string, needle: string) => {
  const normalizedNeedle = normalizeComboboxSearch(needle);
  if (!normalizedNeedle) return true;
  return normalizeComboboxSearch(haystack).includes(normalizedNeedle);
};

export const filterComboboxOptions = (
  options: ComboboxOption[],
  search: string,
) => {
  const trimmed = search.trim();
  if (!trimmed) return options;

  return options.filter((option) =>
    matchesComboboxSearch(option.searchText ?? option.label, trimmed),
  );
};

interface SearchableComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  isLoading?: boolean;
  loadingMessage?: string;
  displayLabel?: string;
  footer?: ReactNode;
  emptyState?: ReactNode;
  searchValue?: string;
  onSearchValueChange?: (search: string) => void;
  filterOptions?: (options: ComboboxOption[], search: string) => ComboboxOption[];
  onOpenChange?: (open: boolean) => void;
}

export function SearchableCombobox({
  value,
  onChange,
  options,
  placeholder = "Select option",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found",
  disabled = false,
  className,
  isLoading = false,
  loadingMessage = "Loading...",
  displayLabel,
  footer,
  emptyState,
  searchValue,
  onSearchValueChange,
  filterOptions = filterComboboxOptions,
  onOpenChange,
}: SearchableComboboxProps) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [internalSearch, setInternalSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const search = searchValue ?? internalSearch;
  const setSearch = onSearchValueChange ?? setInternalSearch;

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const filteredOptions = useMemo(
    () => filterOptions(options, search),
    [filterOptions, options, search],
  );

  const showEmptyState = !isLoading && filteredOptions.length === 0;

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      onOpenChange?.(nextOpen);

      if (!nextOpen) {
        setSearch("");
        setHighlightedIndex(-1);
      }
    },
    [onOpenChange, setSearch],
  );

  const handleSelect = useCallback(
    (option: ComboboxOption) => {
      onChange(option.value);
      handleOpenChange(false);
    },
    [handleOpenChange, onChange],
  );

  useEffect(() => {
    if (!open) return;

    const frame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    const selectedIndex = filteredOptions.findIndex(
      (option) => option.value === value,
    );
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);

    return () => window.cancelAnimationFrame(frame);
  }, [open, value, filteredOptions]);

  useEffect(() => {
    if (highlightedIndex < 0) return;
    optionRefs.current[highlightedIndex]?.scrollIntoView({
      block: "nearest",
    });
  }, [highlightedIndex]);

  useEffect(() => {
    if (highlightedIndex >= filteredOptions.length) {
      setHighlightedIndex(
        filteredOptions.length > 0 ? filteredOptions.length - 1 : -1,
      );
    }
  }, [filteredOptions.length, highlightedIndex]);

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (filteredOptions.length === 0) return;
      setHighlightedIndex((current) =>
        current < filteredOptions.length - 1 ? current + 1 : 0,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (filteredOptions.length === 0) return;
      setHighlightedIndex((current) =>
        current > 0 ? current - 1 : filteredOptions.length - 1,
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const index =
        highlightedIndex >= 0 && highlightedIndex < filteredOptions.length
          ? highlightedIndex
          : 0;
      const option = filteredOptions[index];
      if (option) handleSelect(option);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      handleOpenChange(false);
    }
  };

  const triggerLabel =
    displayLabel ?? selectedOption?.label ?? (value ? value : placeholder);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          disabled={disabled}
          className={cn(
            "h-8 w-full justify-between rounded-xl font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate text-left">{triggerLabel}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 size-4 shrink-0 opacity-50" />
          <Input
            ref={searchInputRef}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setHighlightedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder={searchPlaceholder}
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-activedescendant={
              highlightedIndex >= 0
                ? `${listboxId}-option-${highlightedIndex}`
                : undefined
            }
            className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>

        <div
          id={listboxId}
          className="max-h-64 overflow-y-auto p-1"
          role="listbox"
        >
          {isLoading && filteredOptions.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {loadingMessage}
            </div>
          ) : showEmptyState ? (
            emptyState ?? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            )
          ) : (
            filteredOptions.map((option, index) => {
              const isSelected = value === option.value;
              const isHighlighted = highlightedIndex === index;

              return (
                <button
                  key={option.value}
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  id={`${listboxId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => handleSelect(option)}
                  className={cn(
                    "relative flex w-full cursor-default items-center rounded-md py-2 pr-8 pl-2 text-left text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground",
                    (isSelected || isHighlighted) &&
                      "bg-accent text-accent-foreground",
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && (
                    <Check className="absolute right-2 size-4" />
                  )}
                </button>
              );
            })
          )}

          {isLoading && filteredOptions.length > 0 && (
            <div className="flex items-center justify-center gap-2 border-t py-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Updating results...
            </div>
          )}
        </div>

        {footer}
      </PopoverContent>
    </Popover>
  );
}
