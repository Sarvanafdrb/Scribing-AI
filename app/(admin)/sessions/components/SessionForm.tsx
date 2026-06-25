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
  CreateSessionData,
  Session,
  UpdateSessionData,
} from "@/types/session.types";
import { organizationService } from "@/services/organization.service";
import { userService } from "@/services/user.service";
import {
  SESSION_STATUS_OPTIONS,
  SESSION_TYPE_OPTIONS,
} from "./SessionStatusBadge";
import { useTenantScope } from "@/hooks/useTenantScope";

const createSchema = z.object({
  title: z.string().trim().min(2, "Title is required"),
  description: z.string().optional(),
  organizationId: z.string().min(1, "Organization is required"),
  userId: z.string().min(1, "User is required"),
  sessionType: z.enum(["consultation", "follow_up", "diagnostic", "other"]),
});

const editSchema = z.object({
  title: z.string().trim().min(2, "Title is required"),
  description: z.string().optional(),
  sessionType: z.enum(["consultation", "follow_up", "diagnostic", "other"]),
  status: z.enum(["created", "recording", "processing", "completed", "failed"]),
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

const getUserId = (session?: Session) => {
  if (!session?.userId) return "";
  if (typeof session.userId === "object") {
    return session.userId._id || session.userId.id || "";
  }
  return session.userId;
};

export function SessionForm({
  initialData,
  onSubmit,
  isLoading = false,
  submitLabel = "Create Session",
}: SessionFormProps) {
  const isEditing = Boolean(initialData?.id || initialData?._id);
  const { organizationId: scopedOrgId } = useTenantScope();

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
          title: "",
          description: "",
          organizationId: "",
          userId: "",
          sessionType: "consultation",
        },
  });

  const selectedOrgId = !isEditing
    ? (form.watch as (name: "organizationId") => string)("organizationId")
    : "";

  const { data: orgData } = useQuery({
    queryKey: ["organizations", "session-form-options", scopedOrgId],
    queryFn: () => organizationService.getAll({ limit: 50, page: 1 }),
  });

  const { data: usersData } = useQuery({
    queryKey: ["users", "session-form-options", selectedOrgId],
    queryFn: () =>
      userService.getAll({
        organizationId: selectedOrgId,
        limit: 50,
        page: 1,
        isActive: "true",
      }),
    enabled: Boolean(selectedOrgId) && !isEditing,
  });

  useEffect(() => {
    if (initialData) {
      form.reset(
        isEditing
          ? {
              title: initialData.title || "",
              description: initialData.description || "",
              sessionType: initialData.sessionType || "consultation",
              status: initialData.status || "created",
              audioUrl: initialData.audioUrl || "",
              transcript: initialData.transcript || "",
              duration: initialData.duration || 0,
            }
          : {
              title: "",
              description: "",
              organizationId: getOrgId(initialData),
              userId: getUserId(initialData),
              sessionType: "consultation",
            },
      );
    }
  }, [initialData, form, isEditing]);

  useEffect(() => {
    if (!isEditing && scopedOrgId) {
      form.setValue("organizationId", scopedOrgId);
    }
  }, [form, isEditing, scopedOrgId]);

  useEffect(() => {
    if (!isEditing) {
      form.setValue("userId", "");
    }
  }, [selectedOrgId, form, isEditing]);

  const handleSubmit = async (data: CreateFormData | EditFormData) => {
    const payload = { ...data } as CreateSessionData | UpdateSessionData;

    if (!isEditing && scopedOrgId) {
      (payload as CreateSessionData).organizationId = scopedOrgId;
    }

    await onSubmit(payload);
  };

  const organizations = orgData?.organizations || [];

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
                <Input placeholder="Patient consultation" {...field} />
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
                <Textarea
                  placeholder="Optional session notes"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!isEditing && (
          <>
            <FormField
              control={form.control}
              name="organizationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
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

            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!selectedOrgId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(usersData?.users || []).map((user) => {
                        const userId = user.id || user._id || "";
                        return (
                          <SelectItem key={userId} value={userId}>
                            {user.firstName} {user.lastName}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <FormField
          control={form.control}
          name="sessionType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Session Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
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

        {isEditing && (
          <>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
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

            <FormField
              control={form.control}
              name="audioUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Audio URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (seconds)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      value={field.value ?? 0}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? 0 : Number(e.target.value),
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
              name="transcript"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transcript</FormLabel>
                  <FormControl>
                    <Textarea rows={5} placeholder="Session transcript" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
          {isLoading ? "Saving..." : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
