"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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
import {
  CreateSessionData,
  Session,
  SessionVitals,
  UpdateSessionData,
} from "@/types/session.types";
import { organizationService } from "@/services/organization.service";
import { userService } from "@/services/user.service";
import { roleService } from "@/services/role.service";
import { PatientCombobox } from "./PatientCombobox";
import { DoctorCombobox } from "./DoctorCombobox";
import {
  SESSION_STATUS_OPTIONS,
  SESSION_TYPE_OPTIONS,
} from "./SessionStatusBadge";
import {
  ComboboxOption,
  SearchableCombobox,
} from "@/components/ui/searchable-combobox";
import { useTenantScope } from "@/hooks/useTenantScope";
import { healthcarePrimaryButton } from "@/lib/healthcare-ui";
import { cn } from "@/lib/utils";

const emptyToUndefined = (value: unknown) => {
  if (value === "" || value === null || value === undefined) return undefined;
  return value;
};

const parseOptionalNumber = (
  value: unknown,
  ctx: z.RefinementCtx,
  message: string,
): number | undefined => {
  const normalized = emptyToUndefined(value);
  if (normalized === undefined) return undefined;

  const num =
    typeof normalized === "number" ? normalized : Number(String(normalized).trim());

  if (Number.isNaN(num) || !Number.isFinite(num)) {
    ctx.addIssue({ code: "custom", message });
    return z.NEVER;
  }

  return num;
};

const optionalDecimalField = z.custom<number | undefined>().transform(
  (value, ctx) => parseOptionalNumber(value, ctx, "Temperature must be a number"),
);

const optionalPositiveIntField = z.custom<number | undefined>().transform(
  (value, ctx) => {
    const num = parseOptionalNumber(value, ctx, "Must be a number");
    if (num === undefined) return undefined;
    if (!Number.isInteger(num)) {
      ctx.addIssue({ code: "custom", message: "Must be a whole number" });
      return z.NEVER;
    }
    if (num <= 0) {
      ctx.addIssue({ code: "custom", message: "Must be a positive number" });
      return z.NEVER;
    }
    return num;
  },
);

const optionalSpo2Field = z.custom<number | undefined>().transform((value, ctx) => {
  const num = parseOptionalNumber(value, ctx, "SpO₂ must be a number");
  if (num === undefined) return undefined;
  if (num < 0 || num > 100) {
    ctx.addIssue({
      code: "custom",
      message: "SpO₂ must be between 0 and 100",
    });
    return z.NEVER;
  }
  return num;
});

const createSchema = z
  .object({
    organizationId: z.string().min(1, "Organization is required"),
    patientId: z.string().min(1, "Patient is required"),
    userId: z.string().min(1, "Doctor is required"),
    sessionType: z.enum(["consultation", "follow_up", "diagnostic", "other"]),
    description: z.string().optional(),
    temperature: optionalDecimalField,
    systolic: optionalPositiveIntField,
    diastolic: optionalPositiveIntField,
    heartRate: optionalPositiveIntField,
    spo2: optionalSpo2Field,
  })
  .superRefine((data, ctx) => {
    const hasSystolic = data.systolic !== undefined;
    const hasDiastolic = data.diastolic !== undefined;

    if (hasSystolic !== hasDiastolic) {
      ctx.addIssue({
        code: "custom",
        message: "Both systolic and diastolic are required",
        path: hasSystolic ? ["diastolic"] : ["systolic"],
      });
    }
  });

const editSchema = z.object({
  title: z.string().trim().min(2, "Title is required"),
  description: z.string().optional(),
  sessionType: z.enum(["consultation", "follow_up", "diagnostic", "other"]),
  status: z.enum([
    "created",
    "recording",
    "uploading",
    "processing",
    "completed",
    "failed",
  ]),
});

type CreateFormData = z.infer<typeof createSchema>;
type EditFormData = z.infer<typeof editSchema>;

interface SessionFormProps {
  initialData?: Session;
  onSubmit: (data: CreateSessionData | UpdateSessionData) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

const getOrgId = (session?: Session) => {
  if (!session?.organizationId) return "";
  if (typeof session.organizationId === "object") {
    return session.organizationId._id || session.organizationId.id || "";
  }
  return session.organizationId;
};

const buildVitalsPayload = (data: CreateFormData): SessionVitals | undefined => {
  const vitals: SessionVitals = {};

  if (data.temperature !== undefined) {
    vitals.temperature = data.temperature;
  }

  if (data.systolic !== undefined && data.diastolic !== undefined) {
    vitals.bloodPressure = {
      systolic: data.systolic,
      diastolic: data.diastolic,
    };
  }

  if (data.heartRate !== undefined) {
    vitals.heartRate = data.heartRate;
  }

  if (data.spo2 !== undefined) {
    vitals.spo2 = data.spo2;
  }

  return Object.keys(vitals).length > 0 ? vitals : undefined;
};

export function SessionForm({
  initialData,
  onSubmit,
  isLoading = false,
  submitLabel = "Create Session",
}: SessionFormProps) {
  const isEditing = Boolean(initialData?.id || initialData?._id);
  const { organizationId: scopedOrgId, canManageAllOrganizations } =
    useTenantScope();

  const form = useForm<CreateFormData | EditFormData>({
    resolver: zodResolver(isEditing ? editSchema : createSchema),
    defaultValues: isEditing
      ? {
          title: initialData?.title || "",
          description: initialData?.description || "",
          sessionType: initialData?.sessionType || "consultation",
          status: initialData?.status || "created",
        }
      : {
          organizationId: "",
          patientId: "",
          userId: "",
          sessionType: "consultation",
          description: "",
          temperature: undefined,
          systolic: undefined,
          diastolic: undefined,
          heartRate: undefined,
          spo2: undefined,
        },
  });

  const selectedOrgId = !isEditing
    ? (form.watch as (name: "organizationId") => string)("organizationId")
    : scopedOrgId || getOrgId(initialData);

  const { data: orgData } = useQuery({
    queryKey: ["organizations", "session-form-options", scopedOrgId],
    queryFn: () => organizationService.getAll({ limit: 50, page: 1 }),
    enabled: canManageAllOrganizations && !isEditing,
  });

  const { data: rolesData } = useQuery({
    queryKey: ["roles", "session-form-doctor", selectedOrgId],
    queryFn: () => roleService.getAll(selectedOrgId),
    enabled: Boolean(selectedOrgId) && !isEditing,
  });

  const doctorRoleId = useMemo(() => {
    const roles = rolesData || [];
    const doctorRole = roles.find(
      (role) => role.name?.toLowerCase() === "doctor",
    );
    return doctorRole?.id || doctorRole?._id || "";
  }, [rolesData]);

  const { data: doctorsData } = useQuery({
    queryKey: [
      "users",
      "session-form-doctors",
      selectedOrgId,
      doctorRoleId,
    ],
    queryFn: () =>
      userService.getAll({
        organizationId: selectedOrgId,
        roleId: doctorRoleId,
        limit: 100,
        page: 1,
        isActive: "true",
      }),
    enabled: Boolean(selectedOrgId) && Boolean(doctorRoleId) && !isEditing,
  });

  useEffect(() => {
    if (initialData && isEditing) {
      form.reset({
        title: initialData.title || "",
        description: initialData.description || "",
        sessionType: initialData.sessionType || "consultation",
        status: initialData.status || "created",
      });
    }
  }, [initialData, form, isEditing]);

  useEffect(() => {
    if (!isEditing && scopedOrgId) {
      form.setValue("organizationId", scopedOrgId);
    }
  }, [form, isEditing, scopedOrgId]);

  useEffect(() => {
    if (!isEditing) {
      form.setValue("patientId", "");
      form.setValue("userId", "");
    }
  }, [selectedOrgId, form, isEditing]);

  const handleSubmit = async (data: CreateFormData | EditFormData) => {
    if (isEditing) {
      await onSubmit(data as UpdateSessionData);
      return;
    }

    const createData = data as CreateFormData;
    const vitals = buildVitalsPayload(createData);
    const payload: CreateSessionData = {
      organizationId: scopedOrgId || createData.organizationId,
      patientId: createData.patientId,
      userId: createData.userId,
      sessionType: createData.sessionType,
      description: createData.description,
      ...(vitals ? { vitals } : {}),
    };

    await onSubmit(payload);
  };

  const organizations = orgData?.organizations || [];
  const doctors = doctorsData?.users || [];

  const organizationOptions: ComboboxOption[] = organizations.map((org) => ({
    value: org.id || org._id || "",
    label: org.name,
    searchText: [org.name, org.organizationCode, org.email]
      .filter(Boolean)
      .join(" "),
  }));

  const sessionTypeOptions: ComboboxOption[] = SESSION_TYPE_OPTIONS.map(
    (option) => ({
      value: option.value,
      label: option.label,
      searchText: `${option.label} ${option.value.replace(/_/g, " ")}`,
    }),
  );

  if (!isEditing) {
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
          {canManageAllOrganizations && (
            <FormField
              control={form.control}
              name="organizationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization</FormLabel>
                  <FormControl>
                    <SearchableCombobox
                      value={field.value}
                      onChange={field.onChange}
                      options={organizationOptions}
                      placeholder="Select organization"
                      searchPlaceholder="Search organizations..."
                      emptyMessage="No results found"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="patientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Patient *</FormLabel>
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
            name="userId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Doctor *</FormLabel>
                <FormControl>
                  <DoctorCombobox
                    doctors={doctors}
                    value={field.value}
                    onChange={field.onChange}
                    disabled={!selectedOrgId}
                    emptyHint={
                      selectedOrgId ? (
                        <p className="text-xs text-muted-foreground">
                          {doctorRoleId
                            ? "No active users with the Doctor role."
                            : "Doctor role not configured for this organization."}
                        </p>
                      ) : undefined
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sessionType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Session Type *</FormLabel>
                <FormControl>
                  <SearchableCombobox
                    value={field.value}
                    onChange={field.onChange}
                    options={sessionTypeOptions}
                    placeholder="Select type"
                    searchPlaceholder="Search session types..."
                    emptyMessage="No results found"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Optional reception notes"
                    rows={4}
                    className="rounded-xl bg-white"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Today&apos;s Vitals
              </h3>
              <p className="mt-0.5 text-xs text-gray-500">
                Optional. Saved with this consultation only.
              </p>
            </div>

            <FormField
              control={form.control}
              name="temperature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temperature (°F)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      placeholder="98.6"
                      className="rounded-xl bg-white"
                      value={field.value ?? ""}
                      onChange={(event) =>
                        field.onChange(
                          event.target.value === ""
                            ? undefined
                            : event.target.value,
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="systolic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Blood Pressure — Systolic</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="120"
                        className="rounded-xl bg-white"
                        value={field.value ?? ""}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value === ""
                              ? undefined
                              : event.target.value,
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
                name="diastolic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Blood Pressure — Diastolic</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="80"
                        className="rounded-xl bg-white"
                        value={field.value ?? ""}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value === ""
                              ? undefined
                              : event.target.value,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="heartRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heart Rate (bpm)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="72"
                        className="rounded-xl bg-white"
                        value={field.value ?? ""}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value === ""
                              ? undefined
                              : event.target.value,
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
                name="spo2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SpO₂ (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="99"
                        className="rounded-xl bg-white"
                        value={field.value ?? ""}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value === ""
                              ? undefined
                              : event.target.value,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Button
            type="submit"
            className={cn("w-full", healthcarePrimaryButton)}
            disabled={isLoading}
          >
            {isLoading ? "Creating..." : submitLabel}
          </Button>
        </form>
      </Form>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input className="rounded-xl bg-white" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea rows={3} className="rounded-xl bg-white" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sessionType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Session Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SESSION_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
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
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SESSION_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className={cn("w-full", healthcarePrimaryButton)}
          disabled={isLoading}
        >
          {isLoading ? "Saving..." : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
