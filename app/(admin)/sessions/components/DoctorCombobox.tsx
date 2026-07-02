"use client";

import { useMemo, type ReactNode } from "react";
import {
  ComboboxOption,
  SearchableCombobox,
} from "@/components/ui/searchable-combobox";
import type { User } from "@/types/user.types";
import { cn } from "@/lib/utils";

const getUserId = (user: User) => user.id || user._id || "";

const getDoctorSearchText = (user: User) => {
  const parts: string[] = [user.firstName, user.lastName, user.email];

  if (user.roleId && typeof user.roleId === "object") {
    if (user.roleId.name) parts.push(user.roleId.name);
    if (user.roleId.description) parts.push(user.roleId.description);
  }

  return parts.join(" ");
};

const formatDoctorLabel = (user: User) => {
  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  const specialization =
    user.roleId && typeof user.roleId === "object"
      ? user.roleId.description || user.roleId.name
      : undefined;

  if (specialization && specialization.toLowerCase() !== "doctor") {
    return `${name} · ${specialization}`;
  }

  if (user.email) {
    return `${name} · ${user.email}`;
  }

  return name;
};

interface DoctorComboboxProps {
  doctors: User[];
  value: string;
  onChange: (userId: string) => void;
  disabled?: boolean;
  className?: string;
  emptyHint?: ReactNode;
}

export function DoctorCombobox({
  doctors,
  value,
  onChange,
  disabled = false,
  className,
  emptyHint,
}: DoctorComboboxProps) {
  const options = useMemo<ComboboxOption[]>(
    () =>
      doctors.map((doctor) => ({
        value: getUserId(doctor),
        label: formatDoctorLabel(doctor),
        searchText: getDoctorSearchText(doctor),
      })),
    [doctors],
  );

  const selectedDoctor = doctors.find((doctor) => getUserId(doctor) === value);

  return (
    <div className={cn("space-y-1", className)}>
      <SearchableCombobox
        value={value}
        onChange={onChange}
        options={options}
        placeholder="Select doctor"
        searchPlaceholder="Search by name, specialization, or email..."
        emptyMessage="No results found"
        disabled={disabled}
        displayLabel={
          selectedDoctor ? formatDoctorLabel(selectedDoctor) : undefined
        }
        emptyState={
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No results found
          </div>
        }
      />
      {doctors.length === 0 && emptyHint}
    </div>
  );
}
