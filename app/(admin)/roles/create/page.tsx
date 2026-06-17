"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RoleForm } from "../components/RoleForm";
import { useRoleMutations } from "@/hooks/roles/useRoleMutations";
import { CreateRoleData, UpdateRoleData } from "@/types/role.types";

export default function CreateRolePage() {
  const router = useRouter();
  const { createRole } = useRoleMutations();

  const handleSubmit = async (data: CreateRoleData | UpdateRoleData) => {
    await createRole.mutateAsync(data as unknown as CreateRoleData);
    router.push("/roles");
  };

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
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Create Role</CardTitle>
              <CardDescription>Create a role for an organization</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <RoleForm
            onSubmit={handleSubmit}
            isLoading={createRole.isPending}
            submitLabel="Create Role"
          />
        </CardContent>
      </Card>
    </div>
  );
}
