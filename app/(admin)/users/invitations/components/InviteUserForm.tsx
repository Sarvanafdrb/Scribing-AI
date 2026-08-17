"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FixedFormActions } from "@/components/ui/fixed-form-actions";
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
import { lastNameSchema, strictEmailSchema } from "@/lib/validation";
import { roleService } from "@/services/role.service";
import { useTenantScope } from "@/hooks/useTenantScope";
import { useDepartments } from "@/hooks/departments/useDepartments";
import { NO_DEPARTMENT_VALUE } from "@/types/department.types";
import { CreateInvitationData } from "@/types/invitation.types";

const inviteSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "First name must be at least 2 characters"),
  lastName: lastNameSchema,
  email: strictEmailSchema,
  roleId: z.string().min(1, "Role is required"),
  departmentId: z.string().optional(),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteUserFormProps {
  onSubmit: (data: CreateInvitationData) => Promise<void>;
  isLoading?: boolean;
  onCancel?: () => void;
}

export function InviteUserForm({
  onSubmit,
  isLoading = false,
  onCancel,
}: InviteUserFormProps) {
  const {
    organizationId: scopedOrgId,
    organizationName: scopedOrgName,
    isSuperAdmin,
    isAllOrganizations,
  } = useTenantScope();

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      roleId: "",
      departmentId: NO_DEPARTMENT_VALUE,
    },
    mode: "onSubmit",
  });

  const {
    data: roles = [],
    isLoading: rolesLoading,
    isFetching: rolesFetching,
  } = useQuery({
    queryKey: ["roles", "invite-form", scopedOrgId],
    queryFn: () => roleService.getAll(scopedOrgId),
    enabled: Boolean(scopedOrgId),
  });

  const activeRoles = useMemo(
    () => roles.filter((role) => role.isActive !== false),
    [roles],
  );

  const { departments, isLoading: departmentsLoading } = useDepartments({
    organizationId: scopedOrgId,
    isActive: "true",
    page: 1,
    limit: 100,
    enabled: Boolean(scopedOrgId),
  });

  const departmentOptions = useMemo(
    () =>
      departments
        .filter((department) => department.isActive !== false)
        .map((department) => ({
          id: department.id || department._id || "",
          name: department.name,
        }))
        .filter((department) => department.id),
    [departments],
  );

  const handleSubmit = async (data: InviteFormData) => {
    const payload: CreateInvitationData = {
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: data.email,
      roleId: data.roleId,
      departmentId:
        !data.departmentId || data.departmentId === NO_DEPARTMENT_VALUE
          ? null
          : data.departmentId,
    };

    await onSubmit(payload);
  };

  if (!scopedOrgId) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        {isSuperAdmin || isAllOrganizations
          ? "Select an organization workspace before inviting a user."
          : "Organization context is required to send an invitation."}
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className={onCancel ? "space-y-6 pb-24" : "space-y-6"}
      >
        <FormItem>
          <FormLabel>Organization</FormLabel>
          <FormControl>
            <Input
              value={scopedOrgName || "Your organization"}
              disabled
              className="bg-slate-50"
            />
          </FormControl>
          <p className="text-xs text-muted-foreground">
            Invitations are sent for the currently selected organization.
          </p>
        </FormItem>

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
          name="roleId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || undefined}>
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      rolesLoading || rolesFetching
                        ? "Loading roles..."
                        : activeRoles.length === 0
                          ? "No active roles available"
                          : "Select role"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {activeRoles.map((role) => {
                    const id = role._id || role.id || "";
                    return (
                      <SelectItem key={id} value={id}>
                        {role.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {!rolesLoading && activeRoles.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No active roles are available for this organization.
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="departmentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value || NO_DEPARTMENT_VALUE}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      departmentsLoading
                        ? "Loading departments..."
                        : "Select department"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_DEPARTMENT_VALUE}>
                    No Department
                  </SelectItem>
                  {departmentOptions.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!departmentsLoading && departmentOptions.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No active departments available. You can invite without a
                  department.
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {onCancel ? (
          <FixedFormActions
            onCancel={onCancel}
            cancelLabel="Cancel"
            submitLabel="Send Invitation"
            loadingLabel="Sending..."
            isLoading={isLoading}
            submitClassName="bg-blue-600 hover:bg-blue-700"
          />
        ) : (
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Send Invitation"}
          </Button>
        )}
      </form>
    </Form>
  );
}
