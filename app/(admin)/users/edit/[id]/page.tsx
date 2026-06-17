"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit } from "lucide-react";
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
import { CreateUserData, UpdateUserData } from "@/types/user.types";

export default function EditUserPage() {
  const { id } = useParams();
  const router = useRouter();
  const userId = id as string;
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
