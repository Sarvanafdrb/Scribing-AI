"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Edit,
  Loader2,
  Power,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDepartment } from "@/hooks/departments/useDepartment";
import { useDepartmentMutations } from "@/hooks/departments/useDepartmentMutations";
import { useAccessControl } from "@/hooks/useAccessControl";
import { DepartmentDetailsTab } from "../components/DepartmentDetailsTab";
import { DepartmentRelatedTab } from "../components/DepartmentRelatedTab";
import { getDepartmentId } from "@/types/department.types";
import type { UpdateDepartmentData } from "@/types/department.types";
import { cn } from "@/lib/utils";

type DepartmentTab = "details" | "related";

export default function DepartmentDetailsPage() {
  const { id } = useParams();
  const departmentId = id as string;
  const [activeTab, setActiveTab] = useState<DepartmentTab>("details");

  const {
    canViewDepartments,
    canEditDepartment,
    canDeactivateDepartment,
  } = useAccessControl();

  const { data: department, isLoading } = useDepartment(departmentId);
  const {
    updateDepartment,
    activateDepartment,
    deactivateDepartment,
  } = useDepartmentMutations();

  const recordId = department ? getDepartmentId(department) || departmentId : departmentId;
  const isActive = department?.isActive !== false;
  const canEdit = canEditDepartment();
  const canToggleStatus = canDeactivateDepartment() || canEdit;

  const handleStatusToggle = async () => {
    if (!department) return;
    try {
      if (isActive) {
        await deactivateDepartment.mutateAsync(recordId);
      } else {
        await activateDepartment.mutateAsync(recordId);
      }
    } catch {
      // Toast handled in mutation hook
    }
  };

  const handleInlineUpdate = async (data: UpdateDepartmentData) => {
    await updateDepartment.mutateAsync({
      id: recordId,
      data,
    });
  };

  if (!canViewDepartments()) {
    return (
      <div className="glass rounded-3xl p-8 text-center">
        <h1 className="text-xl font-semibold text-foreground">Access Denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to view departments.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-48" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-28 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-80 w-full rounded-3xl" />
      </div>
    );
  }

  if (!department) {
    return (
      <div className="glass mx-auto max-w-xl rounded-3xl p-10 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
        <h3 className="mt-4 text-lg font-semibold">Department Not Found</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          The department you&apos;re looking for doesn&apos;t exist or has been
          removed.
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link href="/departments">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Departments
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link
          href="/departments"
          className="hover:text-foreground hover:underline"
        >
          Departments
        </Link>
        <span>/</span>
        <span className="font-medium text-foreground">{department.name}</span>
      </nav>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {department.name}
            </h1>
            <Badge
              variant={isActive ? "default" : "secondary"}
              className={isActive ? "bg-primary" : undefined}
            >
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="mt-1 font-mono text-xs text-muted-foreground sm:text-sm">
            Department ID: {department.departmentCode || recordId}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canEdit ? (
            isActive ? (
              <Button asChild variant="outline" className="rounded-full">
                <Link href={`/departments/edit/${recordId}`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
            ) : (
              <Button variant="outline" className="rounded-full" disabled>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )
          ) : null}

          {canToggleStatus ? (
            <Button
              variant={isActive ? "destructive" : "default"}
              className="rounded-full"
              onClick={handleStatusToggle}
              disabled={
                activateDepartment.isPending ||
                deactivateDepartment.isPending
              }
            >
              {(activateDepartment.isPending ||
                deactivateDepartment.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Power className="mr-2 h-4 w-4" />
              {isActive ? "Deactivate" : "Activate"}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="border-b border-border/60">
        <nav className="flex gap-1" aria-label="Department sections">
          {(
            [
              { key: "details", label: "Details" },
              { key: "related", label: "Related" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "details" ? (
        <DepartmentDetailsTab
          department={department}
          departmentId={recordId}
          canEdit={canEdit && isActive}
          onUpdateField={handleInlineUpdate}
        />
      ) : (
        <DepartmentRelatedTab
          department={department}
          departmentId={recordId}
        />
      )}
    </div>
  );
}
