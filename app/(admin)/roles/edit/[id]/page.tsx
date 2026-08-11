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
import { RoleForm } from "../../components/RoleForm";
import { useRoleMutations } from "@/hooks/roles/useRoleMutations";
import { useRole } from "@/hooks/roles/useRole";
import { CreateRoleData, UpdateRoleData } from "@/types/role.types";

export default function EditRolePage() {
  const { id } = useParams();
  const router = useRouter();
  const roleId = id as string;
  const { data: role, isLoading } = useRole(roleId);
  const { updateRole } = useRoleMutations();

  const handleSubmit = async (data: CreateRoleData | UpdateRoleData) => {
    try {
      await updateRole.mutateAsync({ id: roleId, data: data as UpdateRoleData });
      const orgId =
        typeof role?.organizationId === "string" ? role.organizationId : "";
      router.push(
        orgId ? `/roles?organizationId=${encodeURIComponent(orgId)}` : "/roles",
      );
    } catch {
      // Error toast handled in mutation hook
    }
  };

  if (isLoading) {
    return <div className="animate-pulse p-6">Loading role...</div>;
  }

  if (!role) {
    return <div className="p-6">Role not found</div>;
  }

  const isActive = role.isActive !== false;

  if (!isActive) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold">Cannot Edit Inactive Role</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Activate this role before making changes.
            </p>
          </div>
          <Link href="/roles">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Roles
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/roles">
          <Button variant="ghost" className="pl-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Roles
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
              <CardTitle>Edit Role</CardTitle>
              <CardDescription>Update {role.name}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <RoleForm
            key={role.id || role._id}
            mode="edit"
            initialData={role}
            onSubmit={handleSubmit}
            isLoading={updateRole.isPending}
            submitLabel="Update Role"
            onCancel={() => {
              const orgId =
                typeof role.organizationId === "string"
                  ? role.organizationId
                  : "";
              router.push(
                orgId
                  ? `/roles?organizationId=${encodeURIComponent(orgId)}`
                  : "/roles",
              );
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
