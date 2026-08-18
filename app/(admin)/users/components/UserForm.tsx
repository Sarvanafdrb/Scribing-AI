"use client";

import { useEffect, useMemo, useState } from "react";
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
import { CreateUserData, UpdateUserData, User, getUserDepartmentId, isDoctorRoleName } from "@/types/user.types";
import { organizationService } from "@/services/organization.service";
import { roleService } from "@/services/role.service";
import { useTenantScope } from "@/hooks/useTenantScope";
import { useAccessControl } from "@/hooks/useAccessControl";
import { Organization } from "@/types/organization.types";
import { lastNameSchema, strictEmailSchema } from "@/lib/validation";
import { useDepartments } from "@/hooks/departments/useDepartments";
import { NO_DEPARTMENT_VALUE } from "@/types/department.types";
import { Eye, EyeOff } from "lucide-react";

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
  departmentId: z.string().optional(),
  qualifications: z.array(z.string()).optional(),
  specialization: z.string().trim().max(200).optional(),
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
  onCancel?: () => void;
  cancelLabel?: string;
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
      departmentId: getUserDepartmentId(data) || NO_DEPARTMENT_VALUE,
      qualifications: data?.qualifications || [],
      specialization: data?.specialization || "",
    };
  }

  return {
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    organizationId: "",
    roleId: "",
    departmentId: NO_DEPARTMENT_VALUE,
    qualifications: [],
    specialization: "",
  };
};

export function UserForm({
  initialData,
  presetOrganizationId,
  onSubmit,
  isLoading = false,
  submitLabel = "Create User",
  onCancel,
  cancelLabel = "Cancel",
}: UserFormProps) {
  const isEditing = Boolean(initialData?.id || initialData?._id);
  const hasFixedActions = Boolean(onCancel);
  const [showPassword, setShowPassword] = useState(false);
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
  const selectedRoleId = form.watch("roleId");

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

  const effectiveRoleName = useMemo(() => {
    const selectedRole = roles.find(
      (role) => (role._id || role.id || "") === selectedRoleId,
    );
    if (selectedRole?.name) return selectedRole.name;
    if (typeof initialData?.roleId === "object") {
      return initialData.roleId.name || "";
    }
    return "";
  }, [roles, selectedRoleId, initialData?.roleId]);

  const isDoctorRole = isDoctorRoleName(effectiveRoleName);

  const currentDepartmentId = getUserDepartmentId(initialData);
  const { departments, isLoading: departmentsLoading } = useDepartments({
    organizationId: selectedOrgId,
    isActive: "true",
    page: 1,
    limit: 100,
    enabled: Boolean(selectedOrgId),
  });

  const departmentOptions = useMemo(() => {
    const options = departments.map((department) => ({
      id: department.id || department._id || "",
      name: department.name,
      isActive: department.isActive !== false,
    }));

    if (
      currentDepartmentId &&
      !options.some((option) => option.id === currentDepartmentId) &&
      typeof initialData?.departmentId === "object" &&
      initialData.departmentId?.name
    ) {
      options.unshift({
        id: currentDepartmentId,
        name: initialData.departmentId.name,
        isActive: initialData.departmentId.isActive !== false,
      });
    }

    return options.filter((option) => option.id);
  }, [departments, currentDepartmentId, initialData]);

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
    form.setValue("departmentId", NO_DEPARTMENT_VALUE);
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

    if (
      !payload.departmentId ||
      payload.departmentId === NO_DEPARTMENT_VALUE
    ) {
      payload.departmentId = null;
    }

    if (isDoctorRole) {
      const specialization =
        typeof payload.specialization === "string"
          ? payload.specialization.trim()
          : "";
      payload.specialization = specialization || undefined;
    } else {
      delete payload.specialization;
      delete payload.qualifications;
      if (isEditing) {
        delete payload.departmentId;
      } else {
        payload.departmentId = null;
      }
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
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className={hasFixedActions ? "space-y-6 pb-24" : "space-y-6"}
      >
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
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className="pr-10"
                    placeholder={
                      isEditing ? "Leave blank to keep current" : "Enter Password"
                    }
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
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
        {isDoctorRole ? (
          <>
            <FormField
              control={form.control}
              name="departmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || NO_DEPARTMENT_VALUE}
                    disabled={!selectedOrgId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          !selectedOrgId
                            ? "Select organization first"
                            : departmentsLoading
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
                          {!department.isActive ? " (inactive)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedOrgId &&
                    !departmentsLoading &&
                    departmentOptions.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No active departments available. Users can be created
                        without a department.
                      </p>
                    )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="specialization"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Specialization</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Interventional Cardiology"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="qualifications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Qualification</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="MBBS, MD"
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
          </>
        ) : null}
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

        {hasFixedActions && onCancel ? (
          <FixedFormActions
            onCancel={onCancel}
            cancelLabel={cancelLabel}
            submitLabel={submitLabel}
            loadingLabel={isEditing ? "Updating..." : "Creating..."}
            isLoading={isLoading}
            submitClassName="bg-blue-600 hover:bg-blue-700"
          />
        ) : (
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
        )}
      </form>
    </Form>
  );
}
