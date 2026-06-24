"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

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

import { Organization } from "@/types/organization.types";
import { useOrganizations } from "@/hooks/organizations/useOrganizations";
import { useTenantScope } from "@/hooks/useTenantScope";

const baseFormSchema = z.object({
  name: z.string().trim().min(2, "Organization name must be at least 2 characters"),
  organizationType: z.string().min(1, "Organization type is required"),
  parentOrganizationId: z.string().optional(),
  description: z.string().optional(),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  contactNumber: z.string().trim().min(10, "Enter valid contact number"),
  address: z.string().trim().min(5, "Address is required"),
  speciality: z.string().optional(),
  providerCount: z.string().optional(),
  adminName: z.string().trim().min(2, "Admin name required"),
  adminEmail: z.string().trim().email("Invalid admin email"),
  adminPassword: z.string().optional(),
});

type FormData = z.infer<typeof baseFormSchema>;

const getDefaultValues = (data?: Organization): FormData => ({
  name: data?.name?.trim() || "",
  organizationType: data?.organizationType || "",
  description: data?.description || "",
  website: data?.website || "",
  contactNumber: (data?.contactNumber || data?.phone || "").trim(),
  address: data?.address?.trim() || "",
  speciality: data?.speciality || "",
  providerCount: data?.providerCount || "",
  adminName: data?.adminName?.trim() || "",
  adminEmail: (data?.adminEmail || data?.email || "").trim(),
  adminPassword: "",
  parentOrganizationId:
    (typeof data?.parentOrganizationId === "string"
      ? data.parentOrganizationId
      : data?.parentOrganization?.id ||
        data?.parentOrganization?._id ||
        "") || "",
});

interface OrganizationFormProps {
  initialData?: Organization;

  onSubmit: (
    data: FormData & {
      logo?: File | string | null;
    },
  ) => Promise<void>;

  isLoading?: boolean;

  submitLabel?: string;
}

export function OrganizationForm({
  initialData,

  onSubmit,

  isLoading = false,

  submitLabel = "Create Organization",
}: OrganizationFormProps) {
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const { isSuperAdmin, organizationId: scopedOrgId } = useTenantScope();
  const { organizations, isLoading: parentOrgsLoading } = useOrganizations({
    page: 1,
    limit: 100,
  });

  const isEditing = Boolean(initialData?.id || initialData?._id);
  const showParentPicker = !isEditing && (isSuperAdmin || organizations.length > 0);

  const formSchema = useMemo(
    () =>
      baseFormSchema.superRefine((data, ctx) => {
        if (!isEditing && (!data.adminPassword || data.adminPassword.length < 6)) {
          ctx.addIssue({
            code: "custom",
            message: "Admin password must be at least 6 characters",
            path: ["adminPassword"],
          });
        }
      }),
    [isEditing],
  );

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(initialData),
    mode: "onSubmit",
  });

  useEffect(() => {
    if (!initialData) return;

    form.reset(getDefaultValues(initialData));

    if (initialData.logo && typeof initialData.logo === "string") {
      setLogoPreview(initialData.logo);
      setLogo(null);
    }
  }, [initialData]);

  useEffect(() => {
    if (isEditing || isSuperAdmin) return;
    if (scopedOrgId && !form.getValues("parentOrganizationId")) {
      form.setValue("parentOrganizationId", scopedOrgId);
    }
  }, [form, isEditing, isSuperAdmin, scopedOrgId]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Logo size should be less than 5MB");

      return;
    }

    setLogo(file);

    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (data: FormData) => {
    const payload: Record<string, unknown> = {
      ...data,
      logo: logo ?? initialData?.logo ?? null,
    };

    if (isEditing) {
      delete payload.adminPassword;
      delete payload.parentOrganizationId;
    } else if (!payload.parentOrganizationId || payload.parentOrganizationId === "__none__") {
      delete payload.parentOrganizationId;
    }

    await onSubmit(payload as FormData & { logo?: File | string | null });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Logo */}

        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Organization logo"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl">+</span>
            )}
          </div>

          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById("logo-upload")?.click()}
            >
              Upload Logo
            </Button>

            <input
              id="logo-upload"
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={handleLogoChange}
            />

            <p className="text-xs text-muted-foreground mt-1">
              PNG/JPG up to 5MB (auto-compressed)
            </p>
          </div>
        </div>

        {/* Organization Name */}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization Name *</FormLabel>

              <FormControl>
                <Input placeholder="Apollo Medical Center" {...field} />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        {showParentPicker && (
          <FormField
            control={form.control}
            name="parentOrganizationId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {isSuperAdmin ? "Parent Organization (optional)" : "Parent Organization *"}
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || (isSuperAdmin ? "__none__" : undefined)}
                  disabled={parentOrgsLoading || (!isSuperAdmin && organizations.length <= 1)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        parentOrgsLoading
                          ? "Loading organizations..."
                          : isSuperAdmin
                            ? "Top-level organization (no parent)"
                            : "Select parent organization"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {isSuperAdmin && (
                      <SelectItem value="__none__">Top-level (no parent)</SelectItem>
                    )}
                    {organizations.map((org) => {
                      const id = org.id || org._id || "";
                      return (
                        <SelectItem key={id} value={id}>
                          {org.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {isSuperAdmin
                    ? "Leave empty to create a standalone organization, or select a parent to create a branch."
                    : "Branch organizations are created under your organization hierarchy."}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Type */}

        <FormField
          control={form.control}
          name="organizationType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization Type *</FormLabel>

              <Select
                onValueChange={field.onChange}
                value={field.value || undefined}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="hospital">Hospital</SelectItem>

                  <SelectItem value="clinic">Clinic</SelectItem>

                  <SelectItem value="private_practice">
                    Private Practice
                  </SelectItem>

                  <SelectItem value="diagnostic_center">
                    Diagnostic Center
                  </SelectItem>

                  <SelectItem value="telemedicine">Telemedicine</SelectItem>
                </SelectContent>
              </Select>

              <FormMessage />
            </FormItem>
          )}
        />

        {/* Admin */}

        <div className="grid md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="adminName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Admin Name *</FormLabel>

                <FormControl>
                  <Input placeholder="Dr. Kumar" {...field} />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="adminEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Admin Email *</FormLabel>

                <FormControl>
                  <Input placeholder="admin@hospital.com" {...field} />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          {!isEditing && (
            <FormField
              control={form.control}
              name="adminPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Admin Password *</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Contact */}

        <FormField
          control={form.control}
          name="contactNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Number *</FormLabel>

              <FormControl>
                <Input placeholder="+91 9876543210" {...field} />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address *</FormLabel>

              <FormControl>
                <Textarea placeholder="Hospital address" rows={3} {...field} />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        {/* Healthcare Details */}

        <div className="grid md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="speciality"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Speciality</FormLabel>

                <FormControl>
                  <Input placeholder="Cardiology, Dental..." {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="providerCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number of Providers</FormLabel>

                <Select
                  onValueChange={field.onChange}
                  value={field.value || undefined}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select count" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="1-5">1-5 Doctors</SelectItem>

                    <SelectItem value="6-20">6-20 Doctors</SelectItem>

                    <SelectItem value="21-50">21-50 Doctors</SelectItem>

                    <SelectItem value="50+">50+ Doctors</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </div>

        {/* Website */}

        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website</FormLabel>

              <FormControl>
                <Input placeholder="https://hospital.com" {...field} />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading
            ? isEditing
              ? "Updating Organization..."
              : "Creating Organization..."
            : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
