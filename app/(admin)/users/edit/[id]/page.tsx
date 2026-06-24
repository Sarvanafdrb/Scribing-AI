"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserForm } from "../../components/UserForm";
import { useUserMutations } from "@/hooks/users/useUserMutations";
import { useUser } from "@/hooks/users/useUser";
import { useAccessControl } from "@/hooks/useAccessControl";
import { CreateUserData, UpdateUserData } from "@/types/user.types";

export default function EditUserPage() {
  const { id } = useParams();
  const router = useRouter();
  const userId = id as string;
  const { canEditUser } = useAccessControl();
  const { data: user, isLoading } = useUser(userId);
  const { updateUser } = useUserMutations();

  const handleSubmit = async (data: CreateUserData | UpdateUserData) => {
    await updateUser.mutateAsync({
      id: userId,
      data: data as unknown as UpdateUserData,
    });
    router.push("/users");
  };

  if (isLoading) {
    return <div className="animate-pulse p-6">Loading user...</div>;
  }

  if (!user) {
    return <div className="p-6">User not found</div>;
  }

  if (!canEditUser(userId)) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <AlertCircle className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Access Denied</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You do not have permission to edit this user.
        </p>
        <Link href="/users" className="mt-4 inline-block">
          <Button variant="outline">Back to Users</Button>
        </Link>
      </div>
    );
  }

  const isActive = user.isActive !== false;

  if (!isActive) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold">Cannot Edit Inactive User</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Activate this user before making changes.
            </p>
          </div>
          <Link href="/users">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Users
            </Button>
          </Link>
        </div>
      </div>
    );
  }

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
              <Edit className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Edit User</CardTitle>
              <CardDescription>
                Update {user.firstName} {user.lastName}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <UserForm
            key={user.id || user._id}
            initialData={user}
            onSubmit={handleSubmit}
            isLoading={updateUser.isPending}
            submitLabel="Update User"
          />
        </CardContent>
      </Card>
    </div>
  );
}
