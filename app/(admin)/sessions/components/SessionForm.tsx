"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
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
  UpdateSessionData,
} from "@/types/session.types";
import { organizationService } from "@/services/organization.service";
import { patientService } from "@/services/patient.service";
import { userService } from "@/services/user.service";
import { roleService } from "@/services/role.service";
import { formatPatientOptionLabel } from "@/utils/patient.utils";
import {
  SESSION_STATUS_OPTIONS,
  SESSION_TYPE_OPTIONS,
} from "./SessionStatusBadge";
import { useTenantScope } from "@/hooks/useTenantScope";
import { healthcarePrimaryButton } from "@/lib/healthcare-ui";
import { cn } from "@/lib/utils";

const createSchema = z.object({
  organizationId: z.string().min(1, "Organization is required"),
  patientId: z.string().min(1, "Patient is required"),
  userId: z.string().min(1, "Doctor is required"),
  sessionType: z.enum(["consultation", "follow_up", "diagnostic", "other"]),
  description: z.string().optional(),
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
  audioUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  transcript: z.string().optional(),
  duration: z.number().min(0).optional(),
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
          audioUrl: initialData?.audioUrl || "",
          transcript: initialData?.transcript || "",
          duration: initialData?.duration || 0,
        }
      : {
          organizationId: "",
          patientId: "",
          userId: "",
          sessionType: "consultation",
          description: "",
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

  const { data: patientsData } = useQuery({
    queryKey: ["patients", "session-form-options", selectedOrgId],
    queryFn: () =>
      patientService.getAll({
        organizationId: selectedOrgId,
        limit: 100,
        page: 1,
        isActive: "true",
      }),
    enabled: Boolean(selectedOrgId) && !isEditing,
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
        audioUrl: initialData.audioUrl || "",
        transcript: initialData.transcript || "",
        duration: initialData.duration || 0,
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
    const payload: CreateSessionData = {
      organizationId: scopedOrgId || createData.organizationId,
      patientId: createData.patientId,
      userId: createData.userId,
      sessionType: createData.sessionType,
      description: createData.description,
    };

    await onSubmit(payload);
  };

  const organizations = orgData?.organizations || [];
  const patients = patientsData?.patients || [];
  const doctors = doctorsData?.users || [];

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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {organizations.map((org) => {
                        const orgId = org.id || org._id || "";
                        return (
                          <SelectItem key={orgId} value={orgId}>
                            {org.name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
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
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={!selectedOrgId}
                >
                  <FormControl>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select patient" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {patients.length === 0 ? (
                      <SelectItem value="__empty" disabled>
                        No active patients found
                      </SelectItem>
                    ) : (
                      patients.map((patient) => {
                        const patientId = patient.id || patient._id || "";
                        return (
                          <SelectItem key={patientId} value={patientId}>
                            {formatPatientOptionLabel(patient)}
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
                {patients.length === 0 && selectedOrgId && (
                  <p className="text-xs text-muted-foreground">
                    <Link href="/patients/create" className="text-blue-600 hover:underline">
                      Add a patient
                    </Link>{" "}
                    before scheduling a session.
                  </p>
                )}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="userId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Doctor *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={!selectedOrgId}
                >
                  <FormControl>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select doctor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {doctors.length === 0 ? (
                      <SelectItem value="__empty" disabled>
                        No active doctors found
                      </SelectItem>
                    ) : (
                      doctors.map((user) => {
                        const userId = user.id || user._id || "";
                        return (
                          <SelectItem key={userId} value={userId}>
                            {user.firstName} {user.lastName}
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
                {doctors.length === 0 && selectedOrgId && (
                  <p className="text-xs text-muted-foreground">
                    {doctorRoleId
                      ? "No active users with the Doctor role."
                      : "Doctor role not configured for this organization."}
                  </p>
                )}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sessionType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Session Type *</FormLabel>
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
