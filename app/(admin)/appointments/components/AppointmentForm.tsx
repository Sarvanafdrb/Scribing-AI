"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { FixedFormActions } from "@/components/ui/fixed-form-actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { organizationService } from "@/services/organization.service";
import { userService } from "@/services/user.service";
import { roleService } from "@/services/role.service";
import { PatientCombobox } from "@/app/(admin)/sessions/components/PatientCombobox";
import { DoctorCombobox } from "@/app/(admin)/sessions/components/DoctorCombobox";
import {
  ComboboxOption,
  SearchableCombobox,
} from "@/components/ui/searchable-combobox";
import { useTenantScope } from "@/hooks/useTenantScope";
import { healthcarePrimaryButton } from "@/lib/healthcare-ui";
import { cn } from "@/lib/utils";
import type { CreateAppointmentData } from "@/types/appointment.types";

const tomorrowDateKey = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const optionalDurationField = z
  .custom<number | undefined>()
  .transform((value, ctx) => {
    const raw = value as unknown;
    if (raw === "" || raw === null || raw === undefined) return undefined;
    const num =
      typeof raw === "number" ? raw : Number(String(raw).trim());
    if (Number.isNaN(num) || !Number.isFinite(num)) {
      ctx.addIssue({ code: "custom", message: "Duration must be a number" });
      return z.NEVER;
    }
    if (!Number.isInteger(num) || num < 5 || num > 480) {
      ctx.addIssue({
        code: "custom",
        message: "Duration must be between 5 and 480 minutes",
      });
      return z.NEVER;
    }
    return num;
  });

const schema = z
  .object({
    organizationId: z.string().min(1, "Organization is required"),
    patientId: z.string().min(1, "Patient is required"),
    doctorId: z.string().min(1, "Doctor is required"),
    appointmentDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
    startTime: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/, "Use HH:mm"),
    endTime: z
      .string()
      .regex(/^([01]?\d|2[0-3]):[0-5]\d$/, "Use HH:mm")
      .optional()
      .or(z.literal("")),
    durationMinutes: optionalDurationField,
    appointmentType: z.enum(["consultation", "follow_up", "diagnostic", "other"]),
    reason: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.endTime && data.durationMinutes === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Provide end time or duration",
        path: ["durationMinutes"],
      });
    }
  });

type FormData = z.infer<typeof schema>;

interface AppointmentFormProps {
  defaultOrganizationId?: string;
  defaultPatientId?: string;
  defaultDoctorId?: string;
  onSubmit: (data: CreateAppointmentData) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
  onCancel?: () => void;
}

export function AppointmentForm({
  defaultOrganizationId,
  defaultPatientId,
  defaultDoctorId,
  onSubmit,
  isLoading = false,
  submitLabel = "Schedule Appointment",
  onCancel,
}: AppointmentFormProps) {
  const {
    organizationId: scopedOrgId,
    isSuperAdmin,
    isAllOrganizations,
  } = useTenantScope();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationId: defaultOrganizationId || scopedOrgId || "",
      patientId: defaultPatientId || "",
      doctorId: defaultDoctorId || "",
      appointmentDate: tomorrowDateKey(),
      startTime: "09:00",
      endTime: "",
      durationMinutes: 30,
      appointmentType: "consultation",
      reason: "",
      notes: "",
    },
  });

  const selectedOrgId = form.watch("organizationId");

  const { data: organizationsData } = useQuery({
    queryKey: ["organizations", "appointment-form"],
    queryFn: () => organizationService.getAll({ limit: 100, page: 1 }),
    enabled: isSuperAdmin && isAllOrganizations,
  });

  const { data: rolesData } = useQuery({
    queryKey: ["roles", "appointment-form", selectedOrgId],
    queryFn: () => roleService.getAll(selectedOrgId),
    enabled: Boolean(selectedOrgId),
  });

  const doctorRoleId = useMemo(() => {
    const roles = rolesData || [];
    const doctorRole = roles.find(
      (role) => role.name?.toLowerCase() === "doctor",
    );
    return doctorRole?.id || doctorRole?._id || "";
  }, [rolesData]);

  const { data: doctorsData } = useQuery({
    queryKey: ["users", "appointment-form-doctors", selectedOrgId, doctorRoleId],
    queryFn: () =>
      userService.getAll({
        organizationId: selectedOrgId,
        roleId: doctorRoleId,
        limit: 100,
        page: 1,
        isActive: "true",
      }),
    enabled: Boolean(selectedOrgId) && Boolean(doctorRoleId),
  });

  useEffect(() => {
    if (!isSuperAdmin || isAllOrganizations) return;
    if (scopedOrgId && !form.getValues("organizationId")) {
      form.setValue("organizationId", scopedOrgId);
    }
  }, [form, isAllOrganizations, isSuperAdmin, scopedOrgId]);

  const organizationOptions = useMemo<ComboboxOption[]>(() => {
    const orgs = organizationsData?.organizations || [];
    return orgs.map((org) => ({
      value: String(org.id || org._id || ""),
      label: org.name || "Organization",
      searchText: `${org.name || ""} ${org.organizationCode || ""}`,
    }));
  }, [organizationsData]);

  const doctors = doctorsData?.users || [];

  const handleSubmit = async (data: FormData) => {
    const payload: CreateAppointmentData = {
      organizationId: data.organizationId,
      patientId: data.patientId,
      doctorId: data.doctorId,
      appointmentDate: data.appointmentDate,
      startTime: data.startTime,
      appointmentType: data.appointmentType,
      reason: data.reason?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
    };

    if (data.endTime?.trim()) {
      payload.endTime = data.endTime.trim();
    } else if (data.durationMinutes !== undefined) {
      payload.durationMinutes = data.durationMinutes;
    }

    await onSubmit(payload);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
        {isSuperAdmin && isAllOrganizations ? (
          <FormField
            control={form.control}
            name="organizationId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organization</FormLabel>
                <FormControl>
                  <SearchableCombobox
                    options={organizationOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select organization"
                    searchPlaceholder="Search organizations…"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

        <FormField
          control={form.control}
          name="patientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Patient</FormLabel>
              <FormControl>
                <PatientCombobox
                  organizationId={selectedOrgId}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={!selectedOrgId}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="doctorId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Doctor</FormLabel>
              <FormControl>
                <DoctorCombobox
                  doctors={doctors}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={!selectedOrgId}
                  emptyHint={
                    <p className="text-xs text-muted-foreground">
                      {doctorRoleId
                        ? "No active doctors in this organization."
                        : "Doctor role not configured."}
                    </p>
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="appointmentDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    min={tomorrowDateKey()}
                    {...field}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Future dates only. For today&apos;s visit, use New Consultation.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start time</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="durationMinutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (minutes)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={5}
                    max={480}
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End time (optional)</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="appointmentType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Appointment type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(
                    [
                      "consultation",
                      "follow_up",
                      "diagnostic",
                      "other",
                    ] as const
                  ).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type
                        .split("_")
                        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
                        .join(" ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason</FormLabel>
              <FormControl>
                <Input placeholder="Chief complaint or visit reason" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Optional scheduling notes"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FixedFormActions
          onCancel={onCancel || (() => undefined)}
          submitLabel={submitLabel}
          loadingLabel="Scheduling…"
          isLoading={isLoading}
          submitClassName={cn(healthcarePrimaryButton)}
        />
      </form>
    </Form>
  );
}
