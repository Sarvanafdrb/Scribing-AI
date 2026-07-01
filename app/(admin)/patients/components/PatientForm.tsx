"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  CreatePatientData,
  Patient,
  PatientGender,
  UpdatePatientData,
} from "@/types/patient.types";
import { organizationService } from "@/services/organization.service";
import { useTenantScope } from "@/hooks/useTenantScope";
import {
  calculateAgeFromDateOfBirth,
  INDIAN_MOBILE_LENGTH,
  INDIAN_PHONE_ERROR,
  sanitizeIndianPhoneInput,
} from "@/utils/patient.utils";
import { Organization } from "@/types/organization.types";

const genderOptions: { value: PatientGender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "unknown", label: "Unknown" },
];

const DOB_OR_AGE_MESSAGE = "Please provide either Date of Birth or Age.";

const getOrganizationOptionId = (org: Organization): string => {
  const rawId = org.id || org._id;
  if (!rawId) return "";
  return typeof rawId === "string" ? rawId : String(rawId);
};

const getInitialAge = (patient?: Patient) => {
  if (!patient) return undefined;
  if (patient.dateOfBirth) {
    return calculateAgeFromDateOfBirth(patient.dateOfBirth) ?? patient.age;
  }
  return patient.age;
};

const patientSchema = z
  .object({
    firstName: z.string().trim().min(2, "First name is required"),
    lastName: z.string().trim().min(2, "Last name is required"),
    gender: z.enum(["male", "female", "other", "unknown"]),
    dateOfBirth: z.string().optional().or(z.literal("")),
    age: z.number().int().min(0, "Age must be 0 or greater").max(150, "Age must be 150 or less").optional(),
    phoneNumber: z
      .string()
      .min(1, "Phone number is required")
      .transform(sanitizeIndianPhoneInput)
      .refine((digits) => /^[6-9]\d{9}$/.test(digits), {
        message: INDIAN_PHONE_ERROR,
      }),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    address: z.string().trim().optional(),
    organizationId: z.string().min(1, "Organization is required"),
  })
  .superRefine((data, ctx) => {
    const hasDob = Boolean(data.dateOfBirth?.trim());
    const hasAge = data.age !== undefined;

    if (!hasDob && !hasAge) {
      ctx.addIssue({
        code: "custom",
        message: DOB_OR_AGE_MESSAGE,
        path: ["dateOfBirth"],
      });
      ctx.addIssue({
        code: "custom",
        message: DOB_OR_AGE_MESSAGE,
        path: ["age"],
      });
    }
  });

type PatientFormData = z.infer<typeof patientSchema>;

interface PatientFormProps {
  initialData?: Patient;
  onSubmit: (data: CreatePatientData | UpdatePatientData) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

const getOrgId = (patient?: Patient) => {
  if (!patient?.organizationId) return "";
  if (typeof patient.organizationId === "object") {
    return patient.organizationId._id || patient.organizationId.id || "";
  }
  return patient.organizationId;
};

export function PatientForm({
  initialData,
  onSubmit,
  isLoading = false,
  submitLabel = "Create Patient",
}: PatientFormProps) {
  const isEditing = Boolean(initialData?.id || initialData?._id);
  const {
    organizationId: scopedOrgId,
    organizationName: scopedOrgName,
    canManageAllOrganizations,
  } = useTenantScope();

  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      firstName: initialData?.firstName || "",
      lastName: initialData?.lastName || "",
      gender: initialData?.gender || "unknown",
      dateOfBirth: initialData?.dateOfBirth
        ? new Date(initialData.dateOfBirth).toISOString().slice(0, 10)
        : "",
      age: getInitialAge(initialData),
      phoneNumber: sanitizeIndianPhoneInput(initialData?.phoneNumber || ""),
      email: initialData?.email || "",
      address: initialData?.address || "",
      organizationId: getOrgId(initialData) || scopedOrgId || "",
    },
  });

  const dateOfBirth = form.watch("dateOfBirth");
  const hasDateOfBirth = Boolean(dateOfBirth?.trim());

  useEffect(() => {
    if (!hasDateOfBirth) return;

    const calculatedAge = calculateAgeFromDateOfBirth(dateOfBirth);
    if (calculatedAge !== null) {
      form.setValue("age", calculatedAge, { shouldValidate: true });
    }
  }, [dateOfBirth, form, hasDateOfBirth]);

  const { data: orgData } = useQuery({
    queryKey: ["organizations", "patient-form"],
    queryFn: () => organizationService.getAll({ limit: 100, page: 1 }),
    enabled: canManageAllOrganizations && !isEditing,
  });

  useEffect(() => {
    if (!isEditing && scopedOrgId && !canManageAllOrganizations) {
      form.setValue("organizationId", scopedOrgId);
    }
  }, [form, isEditing, scopedOrgId, canManageAllOrganizations]);

  const organizations = orgData?.organizations || [];

  const buildDemographicsPayload = (data: PatientFormData) => {
    const hasDob = Boolean(data.dateOfBirth?.trim());

    if (hasDob) {
      const calculatedAge = calculateAgeFromDateOfBirth(data.dateOfBirth);
      return {
        dateOfBirth: data.dateOfBirth,
        age: calculatedAge ?? data.age,
      };
    }

    return {
      dateOfBirth: undefined,
      age: data.age,
    };
  };

  const handleSubmit = async (data: PatientFormData) => {
    const demographics = buildDemographicsPayload(data);
    const basePayload = {
      firstName: data.firstName,
      lastName: data.lastName,
      gender: data.gender,
      phoneNumber: data.phoneNumber,
      email: data.email || undefined,
      address: data.address,
      ...demographics,
    };

    if (isEditing) {
      await onSubmit(basePayload as UpdatePatientData);
      return;
    }

    await onSubmit({
      ...basePayload,
      organizationId: canManageAllOrganizations
        ? data.organizationId
        : scopedOrgId || data.organizationId,
    } as CreatePatientData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Ravi" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Kumar" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gender *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {genderOptions.map((option) => (
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
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of Birth</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="age"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Age {hasDateOfBirth ? "" : "*"}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  max={150}
                  placeholder="Enter age in years"
                  readOnly={hasDateOfBirth}
                  disabled={hasDateOfBirth}
                  className={hasDateOfBirth ? "bg-slate-50" : undefined}
                  value={field.value ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    field.onChange(value === "" ? undefined : Number(value));
                  }}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                {hasDateOfBirth
                  ? "Calculated automatically from date of birth"
                  : "Enter age if date of birth is unknown"}
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number *</FormLabel>
                <FormControl>
                  <Input
                    ref={field.ref}
                    name={field.name}
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="9876543210"
                    maxLength={INDIAN_MOBILE_LENGTH}
                    value={field.value ?? ""}
                    onBlur={field.onBlur}
                    onKeyDown={(event) => {
                      const controlKeys = [
                        "Backspace",
                        "Delete",
                        "Tab",
                        "ArrowLeft",
                        "ArrowRight",
                        "Home",
                        "End",
                      ];
                      if (controlKeys.includes(event.key)) return;
                      if (event.ctrlKey || event.metaKey) return;
                      if (!/^\d$/.test(event.key)) {
                        event.preventDefault();
                      }
                    }}
                    onPaste={(event) => {
                      event.preventDefault();
                      const pasted = event.clipboardData.getData("text");
                      field.onChange(sanitizeIndianPhoneInput(pasted));
                    }}
                    onChange={(event) => {
                      field.onChange(
                        sanitizeIndianPhoneInput(event.target.value),
                      );
                    }}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  10-digit Indian mobile only (starts with 6, 7, 8, or 9). Letters
                  are not allowed.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="patient@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Street, city, state, postal code"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!isEditing && (
          <FormField
            control={form.control}
            name="organizationId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organization *</FormLabel>
                {canManageAllOrganizations ? (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {organizations.map((org) => {
                        const orgId = getOrganizationOptionId(org);
                        return (
                          <SelectItem key={orgId} value={orgId}>
                            {org.name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                ) : (
                  <FormControl>
                    <Input
                      disabled
                      value={scopedOrgName || "Current workspace"}
                    />
                  </FormControl>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {isEditing && initialData?.patientCode && (
          <FormItem>
            <FormLabel>Patient Code</FormLabel>
            <FormControl>
              <Input
                readOnly
                disabled
                value={initialData.patientCode}
                className="bg-slate-50 font-mono"
              />
            </FormControl>
            <p className="text-xs text-muted-foreground">
              Auto-generated and cannot be changed
            </p>
          </FormItem>
        )}

        <Button
          type="submit"
          className="w-full rounded-xl bg-blue-600 hover:bg-blue-700"
          disabled={isLoading}
        >
          {isLoading ? "Saving..." : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
