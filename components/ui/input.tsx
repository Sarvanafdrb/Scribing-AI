import * as React from "react";

import { cn } from "@/lib/utils";

function Input({
  className,
  type,
  onClick,
  ...props
}: React.ComponentProps<"input">) {
  const isDate = type === "date";

  return (
    <input
      {...props}
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-full border border-border bg-transparent px-3.5 py-2 text-base text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/25 md:text-sm file:mr-2 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        isDate &&
          "cursor-pointer pr-3 [&::-webkit-calendar-picker-indicator]:h-4 [&::-webkit-calendar-picker-indicator]:w-4 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100 dark:[&::-webkit-calendar-picker-indicator]:invert dark:[&::-webkit-calendar-picker-indicator]:brightness-150",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (!isDate || event.defaultPrevented) return;
        try {
          event.currentTarget.showPicker?.();
        } catch {
          // Picker already open, or browser blocked a non-gesture call.
        }
      }}
    />
  );
}

export { Input };
