// app/(admin)/organizations/[id]/edit/page.tsx
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
import { OrganizationForm } from "../../components/OrganizationForm";

import { useOrganizationMutations } from "@/hooks/organizations/useOrganizationMutations";
import { useOrganization } from "@/hooks/organizations/useOrganization";

export default function EditOrganizationPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: organization, isLoading } = useOrganization(id as string);
  const { updateOrganization } = useOrganizationMutations();

  const handleSubmit = async (data: any) => {
    await updateOrganization.mutateAsync({ id: id as string, data });
    router.push(`/organizations/${id}`);
  };

  if (isLoading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  if (!organization) {
    return <div>Organization not found</div>;
  }

  const isActive = organization.isActive !== false;

  if (!isActive) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold">
              Cannot Edit Inactive Organization
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Activate this organization before making changes.
            </p>
          </div>
          <Link href="/organizations">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Organizations
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href={`/organizations/${id}`}>
          <Button variant="ghost" className="pl-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Organization
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Edit className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Edit Organization</CardTitle>
              <CardDescription>
                Update {organization.name} details
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <OrganizationForm
            key={organization.id || organization._id}
            initialData={organization}
            onSubmit={handleSubmit}
            isLoading={updateOrganization.isPending}
            submitLabel="Update Organization"
          />
        </CardContent>
      </Card>
    </div>
  );
}
