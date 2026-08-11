"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserForm } from "../components/UserForm";
import { useUserMutations } from "@/hooks/users/useUserMutations";
import { useAccessControl } from "@/hooks/useAccessControl";
import { CreateUserData, UpdateUserData } from "@/types/user.types";

export default function CreateUserPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetOrganizationId = searchParams.get("organizationId") || "";
  const { createUser } = useUserMutations();
  const { canCreateUser } = useAccessControl();

  if (!canCreateUser()) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <h2 className="text-lg font-semibold">Access Denied</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You do not have permission to create users.
        </p>
        <Link href="/users" className="mt-4 inline-block">
          <Button variant="outline">Back to Users</Button>
        </Link>
      </div>
    );
  }

  const handleSubmit = async (data: CreateUserData | UpdateUserData) => {
    await createUser.mutateAsync(data as unknown as CreateUserData);
    router.push("/users");
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/users">
          <Button variant="ghost" className="pl-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Button>
        </Link>
      </div>

      <Card className="border-blue-100">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Create User</CardTitle>
              <CardDescription>
                Add a new user to an organization
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <UserForm
            presetOrganizationId={presetOrganizationId}
            onSubmit={handleSubmit}
            isLoading={createUser.isPending}
            submitLabel="Create User"
            onCancel={() => router.push("/users")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
