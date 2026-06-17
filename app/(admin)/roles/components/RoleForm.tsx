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
import { CreateRoleData, Role, UpdateRoleData } from "@/types/role.types";
import { organizationService } from "@/services/organization.service";

const createSchema = z.object({
  name: z.string().trim().min(2, "Role name is required"),
  description: z.string().optional(),
  organizationId: z.string().min(1, "Organization is required"),
});

const editSchema = createSchema.partial().extend({
  name: z.string().trim().min(2, "Role name is required"),
});

type CreateFormData = z.infer<typeof createSchema>;
type EditFormData = z.infer<typeof editSchema>;

interface RoleFormProps {
  initialData?: Role;
  onSubmit: (data: CreateRoleData | UpdateRoleData) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

const getDefaultValues = (data?: Role, isEdit = false) => {
  if (isEdit) {
    return {
      name: data?.name || "",
      description: data?.description || "",
      organizationId: data?.organizationId || "",
    };
  }

  return {
    name: "",
    description: "",
    organizationId: "",
  };
};

export function RoleForm({
  initialData,
  onSubmit,
  isLoading = false,
  submitLabel = "Create Role",
}: RoleFormProps) {
  const isEditing = Boolean(initialData?.id || initialData?._id);
  const schema = isEditing ? editSchema : createSchema;

  const form = useForm<CreateFormData | EditFormData>({
    resolver: zodResolver(schema),
    defaultValues: getDefaultValues(initialData, isEditing),
  });

  const { data: orgData } = useQuery({
    queryKey: ["organizations", "all-options"],
    queryFn: () => organizationService.getAll({ limit: 50, page: 1 }),
  });

  useEffect(() => {
    if (initialData) {
      form.reset(getDefaultValues(initialData, true));
    }
  }, [initialData, form]);

  const handleSubmit = async (data: CreateFormData | EditFormData) => {
    const payload: Record<string, unknown> = { ...data };

    if (isEditing) {
      delete payload.organizationId;
      await onSubmit(payload as unknown as UpdateRoleData);
      return;
    }

    await onSubmit(payload as unknown as CreateRoleData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role Name *</FormLabel>
              <FormControl>
                <Input placeholder="Admin" {...field} />
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
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="Role description" {...field} />
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
              <Select
                onValueChange={field.onChange}
                value={field.value || undefined}
                disabled={isEditing}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select organization" />
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
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
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
