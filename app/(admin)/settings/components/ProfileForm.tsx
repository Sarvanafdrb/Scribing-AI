"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuthStore } from "@/store/auth.store";
import { useProfileMutations } from "@/hooks/auth/useProfileMutations";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Camera, Loader2, PenLine } from "lucide-react";
import { resolveUploadUrl } from "@/utils/media-url.utils";
import { lastNameSchema } from "@/lib/validation";

const profileSchema = z.object({
  firstName: z.string().trim().min(2, "First name is required"),
  lastName: lastNameSchema,
  phone: z
    .string()
    .optional()
    .refine(
      (value) => !value || value.trim() === "" || /^[0-9]{10,15}$/.test(value),
      "Phone must be 10 to 15 digits",
    ),
  qualification: z.string().trim().max(200).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const resolveProfilePictureUrl = (profilePicture?: string) =>
  resolveUploadUrl(profilePicture);

export function ProfileForm() {
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [signaturePreviewUrl, setSignaturePreviewUrl] = useState("");
  const { updateProfile, uploadProfilePicture, uploadSignature } =
    useProfileMutations();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      phone: user?.phone || "",
      qualification: user?.qualification || "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phone: user.phone || "",
        qualification: user.qualification || "",
      });
      setPreviewUrl(resolveProfilePictureUrl(user.profilePicture));
      setSignaturePreviewUrl(resolveUploadUrl(user.signature));
    }
  }, [user, form]);

  const handleSubmit = async (data: ProfileFormData) => {
    await updateProfile.mutateAsync({
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone?.trim() || undefined,
      qualification: data.qualification?.trim() || undefined,
    });
  };

  const handleSignatureChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return;
    }

    setSignaturePreviewUrl(URL.createObjectURL(file));
    await uploadSignature.mutateAsync(file);
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    await uploadProfilePicture.mutateAsync(file);
  };

  const initials =
    `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase();
  const isSaving =
    updateProfile.isPending ||
    uploadProfilePicture.isPending ||
    uploadSignature.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="relative">
            <Avatar className="h-20 w-20">
              <AvatarImage src={previewUrl} alt="Profile picture" />
              <AvatarFallback className="text-lg">
                {initials || "U"}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 rounded-full border border-gray-200 bg-white p-2 shadow-sm hover:bg-gray-50"
              aria-label="Upload profile picture"
            >
              {uploadProfilePicture.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              ) : (
                <Camera className="h-4 w-4 text-gray-600" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        <div className="mb-6 rounded-lg border bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-900">
                Digital Signature
              </p>
              <p className="text-xs text-gray-500">
                Upload once to appear on AI Notes prescriptions and PDFs.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => signatureInputRef.current?.click()}
            >
              {uploadSignature.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PenLine className="mr-2 h-4 w-4" />
              )}
              Upload Signature
            </Button>
            <input
              ref={signatureInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleSignatureChange}
            />
          </div>
          {signaturePreviewUrl ? (
            <div className="flex justify-end">
              <img
                src={signaturePreviewUrl}
                alt="Doctor signature preview"
                className="max-h-20 max-w-[220px] object-contain"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No signature uploaded yet.
            </p>
          )}
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="First name" {...field} />
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
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Last name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="qualification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Qualification / Education</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. MBBS, MD"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <FormLabel>Email Address</FormLabel>
                <Input
                  value={user?.email || ""}
                  disabled
                  className="mt-2 bg-gray-50"
                />
              </div>
              <div>
                <FormLabel>Role</FormLabel>
                <Input
                  value={user?.roleName || user?.role?.name || "—"}
                  disabled
                  className="mt-2 bg-gray-50"
                />
              </div>
            </div>

            <div>
              <FormLabel>Organization</FormLabel>
              <Input
                value={
                  user?.isSuperAdmin
                    ? "Super Admin"
                    : user?.organizationName || user?.organization?.name || "—"
                }
                disabled
                className="mt-2 bg-gray-50"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isSaving}>
                {updateProfile.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
