"use client";

import { useState } from "react";
import { AxiosError } from "axios";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useAcceptInvitation,
  useInvitationAcceptPreview,
} from "@/hooks/invitations/useInvitationAccept";
import { InvitationStatusBadge } from "@/app/(admin)/users/invitations/components/InvitationStatusBadge";
import { InvitationStatus } from "@/types/invitation.types";

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof AxiosError) {
    return (error.response?.data as { message?: string } | undefined)?.message || fallback;
  }
  return fallback;
};

const acceptSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z
      .string()
      .min(6, "Password must be at least 6 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function AcceptInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const token = typeof params?.token === "string" ? params.token : "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState(false);

  const previewQuery = useInvitationAcceptPreview(token);
  const acceptMutation = useAcceptInvitation();

  const preview = previewQuery.data;
  const previewStatus = preview?.status as InvitationStatus | undefined;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");

    const parsed = acceptSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message || "Invalid form input");
      return;
    }

    try {
      await acceptMutation.mutateAsync({
        token,
        password,
        confirmPassword,
      });
      setSuccess(true);
    } catch (error: unknown) {
      setFormError(getApiErrorMessage(error, "Failed to accept invitation"));
    }
  };

  if (!token) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-destructive font-medium">
            Invalid or missing invitation link.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (previewQuery.isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Loading invitation...
        </CardContent>
      </Card>
    );
  }

  if (previewQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invitation unavailable</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            {getApiErrorMessage(
              previewQuery.error,
              "This invitation link is invalid or has expired.",
            )}
          </p>
          <Link href="/login">
            <Button variant="outline">Go to Login</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account created successfully</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your account has been created successfully. You can now sign in with
            your email and password.
          </p>
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={() => {
              logout();
              router.push("/login");
            }}
          >
            Go to Login
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (previewStatus && previewStatus !== "PENDING") {
    const messages: Record<Exclude<InvitationStatus, "PENDING">, string> = {
      ACCEPTED: "This invitation has already been accepted.",
      REVOKED: "This invitation is no longer valid.",
      EXPIRED: "This invitation has expired.",
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle>Invitation unavailable</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <InvitationStatusBadge status={previewStatus} />
          <p className="text-sm text-muted-foreground">
            {messages[previewStatus as Exclude<InvitationStatus, "PENDING">]}
          </p>
          <Link href="/login">
            <Button variant="outline">Go to Login</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accept Invitation</CardTitle>
        <p className="text-sm text-muted-foreground">
          You&apos;re invited to join{" "}
          <strong>{preview?.organizationName}</strong>
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium text-right">
              {preview?.firstName} {preview?.lastName}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium text-right">{preview?.email}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Role</span>
            <span className="font-medium text-right">{preview?.roleName}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Department</span>
            <span className="font-medium text-right">
              {preview?.departmentName || "—"}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setFormError("");
              }}
              required
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setFormError("");
              }}
              required
              minLength={6}
            />
          </div>

          {formError && (
            <p className="text-sm text-destructive">{formError}</p>
          )}

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={acceptMutation.isPending}
          >
            {acceptMutation.isPending ? "Creating account..." : "Accept Invitation"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
