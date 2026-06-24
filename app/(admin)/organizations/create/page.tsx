// app/(admin)/organizations/create/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OrganizationForm } from "../components/OrganizationForm";
import { useOrganizationMutations } from "@/hooks/organizations/useOrganizationMutations";
import { useAccessControl } from "@/hooks/useAccessControl";

export default function CreateOrganizationPage() {
  const router = useRouter();
  const { createOrganization } = useOrganizationMutations();
  const { canCreateOrganization, isSuperAdmin } = useAccessControl();

  useEffect(() => {
    if (!canCreateOrganization()) {
      router.replace("/organizations");
    }
  }, [canCreateOrganization, router]);

  const handleSubmit = async (data: any) => {
    await createOrganization.mutateAsync(data);
    router.push("/organizations");
  };

  if (!canCreateOrganization()) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/organizations">
          <Button variant="ghost" className="pl-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Organizations
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>
                {isSuperAdmin ? "Create Organization" : "Create Branch Organization"}
              </CardTitle>
              <CardDescription>
                {isSuperAdmin
                  ? "Create a hospital, clinic, or healthcare organization workspace"
                  : "Create a branch under your organization hierarchy"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <OrganizationForm
            onSubmit={handleSubmit}
            isLoading={createOrganization.isPending}
            submitLabel={isSuperAdmin ? "Create Organization" : "Create Branch"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
