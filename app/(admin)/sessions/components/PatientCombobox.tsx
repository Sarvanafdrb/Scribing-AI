"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ComboboxOption,
  SearchableCombobox,
} from "@/components/ui/searchable-combobox";
import { useAccessControl } from "@/hooks/useAccessControl";
import { patientService } from "@/services/patient.service";
import { patientKeys } from "@/services/patient.queries";
import { useDebounce } from "@/hooks/useDebounce";
import {
  formatPatientOptionLabel,
  getPatientId,
} from "@/utils/patient.utils";
import type { Patient } from "@/types/patient.types";

const RESULT_LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 300;

interface PatientComboboxProps {
  organizationId: string;
  value: string;
  onChange: (patientId: string) => void;
  disabled?: boolean;
  className?: string;
}

export function PatientCombobox({
  organizationId,
  value,
  onChange,
  disabled = false,
  className,
}: PatientComboboxProps) {
  const { canCreatePatient } = useAccessControl();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const debouncedSearch = useDebounce(search.trim(), SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    if (!value) {
      setSelectedPatient(null);
    }
  }, [value]);

  const { data: fetchedPatient, isLoading: isLoadingSelected } = useQuery({
    queryKey: patientKeys.detail(value),
    queryFn: () => patientService.getById(value),
    enabled: Boolean(value) && getPatientId(selectedPatient) !== value,
  });

  const displayPatient =
    selectedPatient && getPatientId(selectedPatient) === value
      ? selectedPatient
      : fetchedPatient ?? null;

  const { data: searchResults, isFetching } = useQuery({
    queryKey: patientKeys.list({
      organizationId,
      search: debouncedSearch,
      limit: RESULT_LIMIT,
      page: 1,
      isActive: "true",
      context: "session-combobox",
    }),
    queryFn: () =>
      patientService.getAll({
        organizationId,
        search: debouncedSearch || undefined,
        limit: RESULT_LIMIT,
        page: 1,
        isActive: "true",
      }),
    enabled: Boolean(organizationId) && open,
    placeholderData: (previousData) => previousData,
  });

  const patients = searchResults?.patients ?? [];
  const hasSearchQuery = debouncedSearch.length > 0;

  const options = useMemo<ComboboxOption[]>(
    () =>
      patients.map((patient) => ({
        value: getPatientId(patient),
        label: formatPatientOptionLabel(patient),
      })),
    [patients],
  );

  const handleChange = (patientId: string) => {
    const patient = patients.find((item) => getPatientId(item) === patientId);
    if (patient) {
      setSelectedPatient(patient);
    }
    onChange(patientId);
  };

  return (
    <SearchableCombobox
      value={value}
      onChange={handleChange}
      options={options}
      placeholder="Select patient"
      searchPlaceholder="Search by name, ID, or phone..."
      emptyMessage="No patient found"
      disabled={disabled || !organizationId}
      className={className}
      isLoading={isFetching || isLoadingSelected}
      loadingMessage={
        isLoadingSelected && value ? "Loading patient..." : "Searching patients..."
      }
      displayLabel={
        displayPatient ? formatPatientOptionLabel(displayPatient) : undefined
      }
      searchValue={search}
      onSearchValueChange={setSearch}
      onOpenChange={setOpen}
      filterOptions={(items) => items}
      emptyState={
        <div className="px-3 py-6 text-center">
          <p className="text-sm text-muted-foreground">No patient found</p>
          {hasSearchQuery && (
            <p className="mt-1 text-xs text-muted-foreground">
              Try a different name, patient ID, or phone number.
            </p>
          )}
          {canCreatePatient() ? (
            <Button
              asChild
              variant="link"
              size="sm"
              className="mt-2 h-auto p-0 text-blue-600"
            >
              <Link href="/patients/create">
                <Plus className="mr-1 size-3.5" />
                Add New Patient
              </Link>
            </Button>
          ) : null}
        </div>
      }
      footer={
        patients.length > 0 ? (
          <div className="border-t px-3 py-2">
            <p className="text-xs text-muted-foreground">
              {hasSearchQuery
                ? `Showing up to ${RESULT_LIMIT} matches`
                : `Showing first ${RESULT_LIMIT} active patients. Type to search.`}
            </p>
          </div>
        ) : undefined
      }
    />
  );
}
