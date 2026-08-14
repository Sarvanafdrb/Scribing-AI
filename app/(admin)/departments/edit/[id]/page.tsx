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
import { DepartmentForm } from "../../components/DepartmentForm";
import { useDepartmentMutations } from "@/hooks/departments/useDepartmentMutations";
import { useDepartment } from "@/hooks/departments/useDepartment";
import { useAccessControl } from "@/hooks/useAccessControl";
import {
  CreateDepartmentData,
  UpdateDepartmentData,
} from "@/types/department.types";

export default function EditDepartmentPage() {
  const { id } = useParams();
  const router = useRouter();
  const departmentId = id as string;
  const { canEditDepartment } = useAccessControl();
  const { data: department, isLoading } = useDepartment(departmentId);
  const { updateDepartment } = useDepartmentMutations();

  const handleSubmit = async (
    data: CreateDepartmentData | UpdateDepartmentData,
  ) => {
    await updateDepartment.mutateAsync({
      id: departmentId,
      data: data as UpdateDepartmentData,
    });
    router.push("/departments");
  };

  if (isLoading) {
    return <div className="animate-pulse p-6">Loading department...</div>;
  }

  if (!department) {
    return <div className="p-6">Department not found</div>;
  }

  if (!canEditDepartment()) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <AlertCircle className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Access Denied</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You do not have permission to edit this department.
        </p>
        <Link href="/departments" className="mt-4 inline-block">
          <Button variant="outline">Back to Departments</Button>
        </Link>
      </div>
    );
  }

  const isActive = department.isActive !== false;

  if (!isActive) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold">
              Cannot Edit Inactive Department
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Activate this department before making changes.
            </p>
          </div>
          <Link href="/departments">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Departments
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/departments">
          <Button variant="ghost" className="pl-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Departments
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
              <CardTitle>Edit Department</CardTitle>
              <CardDescription>Update {department.name}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DepartmentForm
            key={department.id || department._id}
            initialData={department}
            onSubmit={handleSubmit}
            isLoading={updateDepartment.isPending}
            submitLabel="Update Department"
            onCancel={() => router.push("/departments")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
