"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { CreateUserData, UpdateUserData, User } from "@/types/user.types";
import { organizationService } from "@/services/organization.service";
import { roleService } from "@/services/role.service";
import { useTenantScope } from "@/hooks/useTenantScope";
import { useAccessControl } from "@/hooks/useAccessControl";
import { Organization } from "@/types/organization.types";
import { lastNameSchema, strictEmailSchema } from "@/lib/validation";

const getOrganizationOptionId = (org: Organization): string => {
  const rawId = org.id || org._id;
  if (!rawId) return "";
  return typeof rawId === "string" ? rawId : String(rawId);
};

const createSchema = z.object({
  firstName: z.string().trim().min(2, "First name is required"),
  lastName: lastNameSchema,
  email: strictEmailSchema,
  password: z.string().min(6, "Password must be at least 6 characters"),
  organizationId: z.string().min(1, "Organization is required"),
  roleId: z.string().optional(),
  qualifications: z.array(z.string()).optional(),
});

const editSchema = createSchema.omit({ password: true }).extend({
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional()
    .or(z.literal("")),
});

type CreateFormData = z.infer<typeof createSchema>;
type EditFormData = z.infer<typeof editSchema>;

interface UserFormProps {
  initialData?: User;
  presetOrganizationId?: string;
  onSubmit: (data: CreateUserData | UpdateUserData) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

const getDefaultValues = (data?: User, isEdit = false) => {
  const orgId =
    typeof data?.organizationId === "object"
      ? data.organizationId._id || data.organizationId.id
      : data?.organizationId || "";

  const roleId =
    typeof data?.roleId === "object"
      ? data.roleId._id || data.roleId.id
      : data?.roleId || "";

  if (isEdit) {
    return {
      firstName: data?.firstName || "",
      lastName: data?.lastName || "",
      email: data?.email || "",
      password: "",
      organizationId: orgId || "",
      roleId: roleId || "",
      qualifications: data?.qualifications || [],
    };
  }

  return {
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    organizationId: "",
    roleId: "",
    qualifications: [],
  };
};

export function UserForm({
  initialData,
  presetOrganizationId,
  onSubmit,
  isLoading = false,
  submitLabel = "Create User",
}: UserFormProps) {
  const isEditing = Boolean(initialData?.id || initialData?._id);
  const {
    organizationId: scopedOrgId,
    organizationName: scopedOrgName,
    canManageAllOrganizations,
  } = useTenantScope();
  const { canManageAllUsers } = useAccessControl();
  const schema = isEditing ? editSchema : createSchema;
  const showRoleField = !isEditing || canManageAllUsers;

  const form = useForm<CreateFormData | EditFormData>({
    resolver: zodResolver(schema),
    defaultValues: getDefaultValues(initialData, isEditing),
    mode: "onSubmit",
  });

  const selectedOrgId = form.watch("organizationId");

  const {
    data: orgData,
    isLoading: orgsLoading,
    isError: orgsError,
  } = useQuery({
    queryKey: ["organizations", "user-form-options", scopedOrgId],
    queryFn: () => organizationService.getAll({ limit: 100, page: 1 }),
    staleTime: 0,
  });

  const organizationOptions = useMemo(() => {
    return (orgData?.organizations || [])
      .map((org) => ({
        ...org,
        id: getOrganizationOptionId(org),
      }))
      .filter((org) => org.id);
  }, [orgData?.organizations]);

  const showOrganizationPicker = canManageAllOrganizations;

  const {
    data: roles = [],
    isLoading: rolesLoading,
    isFetching: rolesFetching,
  } = useQuery({
    queryKey: ["roles", selectedOrgId],
    queryFn: () => roleService.getAll(selectedOrgId),
    enabled: !!selectedOrgId,
  });

  useEffect(() => {
    if (initialData) {
      form.reset(getDefaultValues(initialData, true));
    }
  }, [initialData, form]);

  useEffect(() => {
    if (!isEditing && !showOrganizationPicker && scopedOrgId) {
      form.setValue("organizationId", scopedOrgId);
    }
  }, [form, isEditing, showOrganizationPicker, scopedOrgId]);

  useEffect(() => {
    if (isEditing || !presetOrganizationId) return;
    form.setValue("organizationId", presetOrganizationId);
  }, [form, isEditing, presetOrganizationId]);

  useEffect(() => {
    if (!selectedOrgId || isEditing) return;
    form.setValue("roleId", "");
  }, [selectedOrgId, form, isEditing]);

  const handleSubmit = async (data: CreateFormData | EditFormData) => {
    const payload: Record<string, unknown> = { ...data };

    if (!isEditing && !showOrganizationPicker && scopedOrgId) {
      payload.organizationId = scopedOrgId;
    }

    if (isEditing && !payload.password) {
      delete payload.password;
    }
    if (!payload.roleId) {
      delete payload.roleId;
    }

    if (isEditing) {
      delete payload.organizationId;
      if (!canManageAllUsers) {
        delete payload.roleId;
      }
      await onSubmit(payload as unknown as UpdateUserData);
      return;
    }

    await onSubmit(payload as unknown as CreateUserData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter first name" {...field} />
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
                  <Input placeholder="Enter last name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email *</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="Enter email address"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {isEditing ? "New Password (optional)" : "Password *"}
              </FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder={
                    isEditing ? "Leave blank to keep current" : "Enter Password"
                  }
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="organizationId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization *</FormLabel>
              {!showOrganizationPicker && scopedOrgId ? (
                <>
                  <FormControl>
                    <Input
                      value={
                        scopedOrgName ||
                        organizationOptions.find(
                          (org) => org.id === scopedOrgId,
                        )?.name ||
                        "Your organization"
                      }
                      disabled
                    />
                  </FormControl>
                  <input type="hidden" {...field} />
                </>
              ) : (
                <Select
                  onValueChange={field.onChange}
                  value={field.value || undefined}
                  disabled={isEditing || orgsLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        orgsLoading
                          ? "Loading organizations..."
                          : orgsError
                            ? "Failed to load organizations"
                            : "Select organization"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {organizationOptions.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {!showOrganizationPicker && scopedOrgId && (
                <p className="text-xs text-muted-foreground">
                  Users are created in your organization only.
                </p>
              )}
              {showOrganizationPicker &&
                !orgsLoading &&
                organizationOptions.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No organizations found. Create an organization first.
                  </p>
                )}
              <FormMessage />
            </FormItem>
          )}
        />

        {showRoleField && (
          <FormField
            control={form.control}
            name="roleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Designation</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || undefined}
                  disabled={!selectedOrgId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        !selectedOrgId
                          ? "Select organization first"
                          : rolesLoading || rolesFetching
                            ? "Loading roles..."
                            : roles.length === 0
                              ? "No roles available"
                              : "Select role"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => {
                      const id = role._id || role.id || "";
                      const label = role.name.replace(/\b\w/g, (char) =>
                        char.toUpperCase(),
                      );
                      return (
                        <SelectItem key={id} value={id}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {selectedOrgId && !rolesLoading && roles.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Default roles will be created automatically. Try reselecting
                    the organization.
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="qualifications"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Qualifications</FormLabel>

              <FormControl>
                <Input
                  placeholder="MBBS, MD, DM Cardiology"
                  value={(field.value ?? []).join(", ")}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value
                        .split(",")
                        .map((q) => q.trim())
                        .filter(Boolean),
                    )
                  }
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        {isEditing && initialData?.userCode ? (
          <FormItem>
            <FormLabel>User ID</FormLabel>
            <FormControl>
              <Input
                readOnly
                disabled
                value={initialData.userCode}
                className="bg-slate-50 font-mono"
              />
            </FormControl>
            <p className="text-xs text-muted-foreground">
              Auto-generated and cannot be changed
            </p>
          </FormItem>
        ) : !isEditing ? (
          <FormItem>
            <FormLabel>User ID</FormLabel>
            <FormControl>
              <Input
                readOnly
                disabled
                value="Auto-generated on create"
                className="bg-slate-50 font-mono text-muted-foreground"
              />
            </FormControl>
            <p className="text-xs text-muted-foreground">
              An alphanumeric User ID (e.g. USR-A1B2C3D4) will be created
              automatically
            </p>
          </FormItem>
        ) : null}

        <Button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700"
          disabled={isLoading}
        >
          {isLoading
            ? isEditing
              ? "Updating..."
              : "Creating..."
            : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
