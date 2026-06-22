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

const editSchema = z.object({
  name: z.string().trim().min(2, "Role name is required"),
  description: z.string().optional(),
});

type CreateFormData = z.infer<typeof createSchema>;
type EditFormData = z.infer<typeof editSchema>;

interface RoleFormProps {
  initialData?: Role;
  mode?: "create" | "edit";
  onSubmit: (data: CreateRoleData | UpdateRoleData) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

const resolveOrganizationId = (organizationId?: Role["organizationId"]) => {
  if (!organizationId) return "";
  if (typeof organizationId === "string") return organizationId;
  if (typeof organizationId === "object") {
    const value = organizationId as { _id?: string; id?: string };
    return value._id || value.id || "";
  }
  return String(organizationId);
};

export function RoleForm({
  initialData,
  mode,
  onSubmit,
  isLoading = false,
  submitLabel = "Create Role",
}: RoleFormProps) {
  const isEditing =
    mode === "edit" ||
    (mode !== "create" && Boolean(initialData?.id || initialData?._id));

  const { data: orgData } = useQuery({
    queryKey: ["organizations", "all-options"],
    queryFn: () => organizationService.getAll({ limit: 50, page: 1 }),
  });

  const organizationId = resolveOrganizationId(initialData?.organizationId);
  const organizationName =
    orgData?.organizations?.find(
      (org) => (org.id || org._id || "") === organizationId,
    )?.name || "Organization";

  const createForm = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: "",
      description: "",
      organizationId: "",
    },
  });

  const editForm = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
    },
  });

  useEffect(() => {
    if (isEditing && initialData) {
      editForm.reset({
        name: initialData.name || "",
        description: initialData.description || "",
      });
    }
  }, [initialData, isEditing, editForm]);

  const handleCreateSubmit = async (data: CreateFormData) => {
    await onSubmit({
      name: data.name.trim(),
      description: data.description,
      organizationId: data.organizationId,
    });
  };

  const handleEditSubmit = async (data: EditFormData) => {
    await onSubmit({
      name: data.name.trim(),
      description: data.description,
    });
  };

  if (isEditing) {
    return (
      <Form {...editForm}>
        <form
          onSubmit={editForm.handleSubmit(handleEditSubmit)}
          className="space-y-6"
        >
          <FormField
            control={editForm.control}
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
            control={editForm.control}
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

          <FormItem>
            <FormLabel>Organization</FormLabel>
            <Input value={organizationName} disabled readOnly />
          </FormItem>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={isLoading}
          >
            {isLoading ? "Updating..." : submitLabel}
          </Button>
        </form>
      </Form>
    );
  }

  return (
    <Form {...createForm}>
      <form
        onSubmit={createForm.handleSubmit(handleCreateSubmit)}
        className="space-y-6"
      >
        <FormField
          control={createForm.control}
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
          control={createForm.control}
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
          control={createForm.control}
          name="organizationId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || undefined}>
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

        <Button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700"
          disabled={isLoading}
        >
          {isLoading ? "Creating..." : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
