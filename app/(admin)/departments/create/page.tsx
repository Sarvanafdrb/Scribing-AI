"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Hospital } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DepartmentForm } from "../components/DepartmentForm";
import { useDepartmentMutations } from "@/hooks/departments/useDepartmentMutations";
import { useAccessControl } from "@/hooks/useAccessControl";
import {
  CreateDepartmentData,
  UpdateDepartmentData,
} from "@/types/department.types";

export default function CreateDepartmentPage() {
  const router = useRouter();
  const { createDepartment } = useDepartmentMutations();
  const { canCreateDepartment } = useAccessControl();

  useEffect(() => {
    if (!canCreateDepartment()) {
      router.replace("/departments");
    }
  }, [canCreateDepartment, router]);

  const handleSubmit = async (
    data: CreateDepartmentData | UpdateDepartmentData,
  ) => {
    await createDepartment.mutateAsync(data as CreateDepartmentData);
    router.push("/departments");
  };

  if (!canCreateDepartment()) {
    return null;
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
              <Hospital className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Add Department</CardTitle>
              <CardDescription>
                Create a department for this organization
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DepartmentForm
            onSubmit={handleSubmit}
            isLoading={createDepartment.isPending}
            submitLabel="Create Department"
            onCancel={() => router.push("/departments")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
