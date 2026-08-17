"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MailPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UsersSubNav } from "../../components/UsersSubNav";
import { InviteUserForm } from "../components/InviteUserForm";
import { useInvitationMutations } from "@/hooks/invitations/useInvitationMutations";
import { useAccessControl } from "@/hooks/useAccessControl";
import { CreateInvitationData } from "@/types/invitation.types";

export default function InviteUserPage() {
  const router = useRouter();
  const { createInvitation } = useInvitationMutations();
  const { canCreateUser } = useAccessControl();

  if (!canCreateUser()) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Access Denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to invite users.
        </p>
        <Link href="/users/invitations" className="mt-4 inline-block">
          <Button variant="outline">Back to Invitations</Button>
        </Link>
      </div>
    );
  }

  const handleSubmit = async (data: CreateInvitationData) => {
    await createInvitation.mutateAsync(data);
    router.push("/users/invitations");
  };

  return (
    <div className="space-y-6">
      <UsersSubNav active="invitations" />

      <div>
        <Link href="/users/invitations">
          <Button variant="ghost" size="sm" className="mb-4 pl-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Invitations
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Invite User</h1>
        <p className="text-muted-foreground">
          Send an invitation email to onboard a new user.
        </p>
      </div>

      <Card className="max-w-2xl border-blue-100">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <MailPlus className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Invite User</CardTitle>
              <CardDescription>
                Create a pending invitation and send the onboarding email
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <InviteUserForm
            onSubmit={handleSubmit}
            isLoading={createInvitation.isPending}
            onCancel={() => router.push("/users/invitations")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
