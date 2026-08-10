"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Loader2, PenLine } from "lucide-react";
import { OrganizationInlineField } from "@/app/(admin)/organizations/components/OrganizationInlineField";
import { LinkCell } from "@/components/shared/LinkCell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProfileMutations } from "@/hooks/auth/useProfileMutations";
import { useAuthStore } from "@/store/auth.store";
import type { AuthUser } from "@/types/auth.types";
import { resolveUploadUrl } from "@/utils/media-url.utils";

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="glass rounded-2xl border border-border/60 p-4 sm:p-6">
    <h3 className="mb-3 text-base font-semibold text-foreground">{title}</h3>
    {children}
  </section>
);

export function SettingsDetailsTab() {
  const user = useAuthStore((state) => state.user) as AuthUser | null;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [signaturePreviewUrl, setSignaturePreviewUrl] = useState("");
  const [savingField, setSavingField] = useState<string | null>(null);
  const { updateProfile, uploadProfilePicture, uploadSignature } =
    useProfileMutations();

  useEffect(() => {
    if (!user) return;
    setPreviewUrl(resolveUploadUrl(user.profilePicture));
    const nextSignatureUrl = resolveUploadUrl(user.signature);
    if (nextSignatureUrl) {
      setSignaturePreviewUrl(nextSignatureUrl);
    }
  }, [user]);

  if (!user) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
        Sign in to manage your profile settings.
      </div>
    );
  }

  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  const initials =
    `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();
  const roleName = user.roleName || user.role?.name || "—";
  const roleId = user.role?.id || user.role?._id || "";
  const orgId =
    user.organizationId ||
    user.organization?.id ||
    user.organization?._id ||
    "";
  const orgName = user.isSuperAdmin
    ? "Super Admin"
    : user.organizationName || user.organization?.name || "—";

  const saveProfilePatch = async (
    fieldKey: string,
    patch: Partial<{
      firstName: string;
      lastName: string;
      phone?: string;
      qualification?: string;
    }>,
  ) => {
    setSavingField(fieldKey);
    try {
      await updateProfile.mutateAsync({
        firstName: patch.firstName ?? user.firstName,
        lastName: patch.lastName ?? user.lastName,
        phone: patch.phone !== undefined ? patch.phone : user.phone || undefined,
        qualification:
          patch.qualification !== undefined
            ? patch.qualification
            : user.qualification || undefined,
      });
    } finally {
      setSavingField(null);
    }
  };

  const handlePictureChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
    await uploadProfilePicture.mutateAsync(file);
  };

  const handleSignatureChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    setSignaturePreviewUrl(URL.createObjectURL(file));
    await uploadSignature.mutateAsync(file);
  };

  return (
    <div className="space-y-4">
      <Section title="Profile Photo & Signature">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-4">
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
                className="absolute -bottom-1 -right-1 rounded-full border border-border bg-background p-2 shadow-sm hover:bg-muted"
                aria-label="Upload profile picture"
              >
                {uploadProfilePicture.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <Camera className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePictureChange}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {fullName || "User"}
              </p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="min-w-0 flex-1 rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Digital Signature
                </p>
                <p className="text-xs text-muted-foreground">
                  Used on AI Notes prescriptions and PDF exports.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => signatureInputRef.current?.click()}
                disabled={uploadSignature.isPending}
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
                <div className="rounded-lg border border-border/60 bg-white px-4 py-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={signaturePreviewUrl}
                    alt="Signature preview"
                    className="max-h-24 max-w-[240px] object-contain"
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No signature uploaded yet.
              </p>
            )}
          </div>
        </div>
      </Section>

      <Section title="Personal Information">
        <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-2">
          <div className="space-y-0">
            <OrganizationInlineField
              label="First Name"
              value={user.firstName || ""}
              editable
              type="text"
              isSaving={savingField === "firstName"}
              onSave={async (value) => {
                if (value.trim().length < 2) {
                  toast.error("First name is required.");
                  return;
                }
                await saveProfilePatch("firstName", {
                  firstName: value.trim(),
                });
              }}
            />
            <OrganizationInlineField
              label="Last Name"
              value={user.lastName || ""}
              editable
              type="text"
              isSaving={savingField === "lastName"}
              onSave={async (value) => {
                if (!value.trim()) {
                  toast.error("Last name is required.");
                  return;
                }
                await saveProfilePatch("lastName", { lastName: value.trim() });
              }}
            />
            <OrganizationInlineField
              label="Email"
              value={user.email || ""}
              editable={false}
              displayValue={
                user.email ? (
                  <a
                    href={`mailto:${user.email}`}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    {user.email}
                  </a>
                ) : (
                  "—"
                )
              }
            />
          </div>

          <div className="space-y-0">
            <OrganizationInlineField
              label="Phone"
              value={user.phone || ""}
              editable
              type="text"
              isSaving={savingField === "phone"}
              onSave={async (value) => {
                const next = value.trim();
                if (next && !/^[0-9]{10,15}$/.test(next)) {
                  toast.error("Phone must be 10 to 15 digits.");
                  return;
                }
                await saveProfilePatch("phone", {
                  phone: next || undefined,
                });
              }}
              displayValue={user.phone || "—"}
            />
            <OrganizationInlineField
              label="Qualification"
              value={user.qualification || ""}
              editable
              type="text"
              isSaving={savingField === "qualification"}
              onSave={async (value) => {
                await saveProfilePatch("qualification", {
                  qualification: value.trim() || undefined,
                });
              }}
              displayValue={user.qualification || "—"}
            />
            <OrganizationInlineField
              label="User ID"
              value={user.id || user._id || ""}
              editable={false}
              displayValue={
                <span className="font-mono text-xs">
                  {user.id || user._id || "—"}
                </span>
              }
            />
          </div>
        </div>
      </Section>

      <Section title="Access & Organization">
        <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-2">
          <div className="space-y-0">
            <OrganizationInlineField
              label="Role"
              value={roleName}
              editable={false}
              displayValue={
                roleId ? (
                  <LinkCell href={`/roles/${roleId}`}>{roleName}</LinkCell>
                ) : (
                  <Badge variant="outline" className="rounded-full">
                    {roleName}
                  </Badge>
                )
              }
            />
            <OrganizationInlineField
              label="Account Type"
              value={user.isSuperAdmin ? "Super Admin" : "Organization User"}
              editable={false}
              displayValue={
                <Badge
                  variant={user.isSuperAdmin ? "default" : "secondary"}
                  className={user.isSuperAdmin ? "bg-primary" : undefined}
                >
                  {user.isSuperAdmin ? "Super Admin" : "Organization User"}
                </Badge>
              }
            />
          </div>
          <div className="space-y-0">
            <OrganizationInlineField
              label="Organization"
              value={orgName}
              editable={false}
              displayValue={
                orgId && !user.isSuperAdmin ? (
                  <LinkCell href={`/organizations/${orgId}`}>{orgName}</LinkCell>
                ) : (
                  orgName
                )
              }
            />
            <OrganizationInlineField
              label="Organization Code"
              value={user.organization?.organizationCode || ""}
              editable={false}
              displayValue={
                <span className="font-mono text-xs">
                  {user.organization?.organizationCode || "—"}
                </span>
              }
            />
          </div>
        </div>
      </Section>
    </div>
  );
}
