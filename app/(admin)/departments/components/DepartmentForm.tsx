"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FixedFormActions } from "@/components/ui/fixed-form-actions";
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
  CreateDepartmentData,
  Department,
  UpdateDepartmentData,
} from "@/types/department.types";
import { organizationService } from "@/services/organization.service";
import { useTenantScope } from "@/hooks/useTenantScope";

const createSchema = z.object({
  name: z.string().trim().min(1, "Department name is required").max(120),
  description: z.string().optional(),
  organizationId: z.string().min(1, "Organization is required"),
});

const editSchema = z.object({
  name: z.string().trim().min(1, "Department name is required").max(120),
  description: z.string().optional(),
});

type CreateFormData = z.infer<typeof createSchema>;
type EditFormData = z.infer<typeof editSchema>;

interface DepartmentFormProps {
  initialData?: Department;
  onSubmit: (data: CreateDepartmentData | UpdateDepartmentData) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
  onCancel?: () => void;
  cancelLabel?: string;
}

export function DepartmentForm({
  initialData,
  onSubmit,
  isLoading = false,
  submitLabel = "Create Department",
  onCancel,
  cancelLabel = "Cancel",
}: DepartmentFormProps) {
  const isEditing = Boolean(initialData?.id || initialData?._id);
  const hasFixedActions = Boolean(onCancel);
  const {
    organizationId: scopedOrgId,
    organizationName: scopedOrgName,
    canManageAllOrganizations,
  } = useTenantScope();

  const createForm = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: "",
      description: "",
      organizationId: scopedOrgId || "",
    },
  });

  const editForm = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
    },
  });

  const { data: orgData, isLoading: orgsLoading } = useQuery({
    queryKey: ["organizations", "department-form-options", scopedOrgId],
    queryFn: () => organizationService.getAll({ limit: 100, page: 1 }),
    enabled: !isEditing && canManageAllOrganizations,
    staleTime: 0,
  });

  const showOrganizationPicker = canManageAllOrganizations;

  useEffect(() => {
    if (isEditing && initialData) {
      editForm.reset({
        name: initialData.name || "",
        description: initialData.description || "",
      });
    }
  }, [initialData, isEditing, editForm]);

  useEffect(() => {
    if (!isEditing && !showOrganizationPicker && scopedOrgId) {
      createForm.setValue("organizationId", scopedOrgId);
    }
  }, [createForm, isEditing, showOrganizationPicker, scopedOrgId]);

  const handleCreateSubmit = async (data: CreateFormData) => {
    const payload: CreateDepartmentData = {
      name: data.name.trim(),
      description: (data.description || "").trim(),
    };
    if (showOrganizationPicker) {
      payload.organizationId = data.organizationId;
    }
    await onSubmit(payload);
  };

  const handleEditSubmit = async (data: EditFormData) => {
    await onSubmit({
      name: data.name.trim(),
      description: (data.description || "").trim(),
    });
  };

  if (isEditing) {
    return (
      <Form {...editForm}>
        <form
          onSubmit={editForm.handleSubmit(handleEditSubmit)}
          className={hasFixedActions ? "space-y-6 pb-24" : "space-y-6"}
        >
          <FormField
            control={editForm.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Cardiology" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={editForm.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="Cardiology and cardiovascular care"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {hasFixedActions && onCancel ? (
            <FixedFormActions
              onCancel={onCancel}
              cancelLabel={cancelLabel}
              submitLabel={submitLabel}
              loadingLabel="Updating..."
              isLoading={isLoading}
              submitClassName="bg-blue-600 hover:bg-blue-700"
            />
          ) : (
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? "Updating..." : submitLabel}
            </Button>
          )}
        </form>
      </Form>
    );
  }

  return (
    <Form {...createForm}>
      <form
        onSubmit={createForm.handleSubmit(handleCreateSubmit)}
        className={hasFixedActions ? "space-y-6 pb-24" : "space-y-6"}
      >
        <FormField
          control={createForm.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department Name *</FormLabel>
              <FormControl>
                <Input placeholder="Cardiology" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={createForm.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Cardiology and cardiovascular care"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={createForm.control}
          name="organizationId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization *</FormLabel>
              {!showOrganizationPicker && scopedOrgId ? (
                <>
                  <FormControl>
                    <Input value={scopedOrgName || "Your organization"} disabled />
                  </FormControl>
                  <input type="hidden" {...field} />
                </>
              ) : (
                <Select
                  onValueChange={field.onChange}
                  value={field.value || undefined}
                  disabled={orgsLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        orgsLoading
                          ? "Loading organizations..."
                          : "Select organization"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(orgData?.organizations || []).map((org) => {
                      const id = org.id || org._id || "";
                      return (
                        <SelectItem key={id} value={id}>
                          {org.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {hasFixedActions && onCancel ? (
          <FixedFormActions
            onCancel={onCancel}
            cancelLabel={cancelLabel}
            submitLabel={submitLabel}
            loadingLabel="Creating..."
            isLoading={isLoading}
            submitClassName="bg-blue-600 hover:bg-blue-700"
          />
        ) : (
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={isLoading}
          >
            {isLoading ? "Creating..." : submitLabel}
          </Button>
        )}
      </form>
    </Form>
  );
}
