"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Edit, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser } from "@/hooks/users/useUser";
import { useUserMutations } from "@/hooks/users/useUserMutations";
import { useAccessControl } from "@/hooks/useAccessControl";
import { UserDetailsTab } from "../components/UserDetailsTab";
import { UserRelatedTab } from "../components/UserRelatedTab";
import type { UpdateUserData } from "@/types/user.types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type UserTab = "details" | "related";

export default function UserDetailsPage() {
  const { id } = useParams();
  const userId = id as string;
  const [activeTab, setActiveTab] = useState<UserTab>("details");
  const { data: user, isLoading } = useUser(userId);
  const { updateUser, activateUser, deactivateUser } = useUserMutations();
  const { canEditUser } = useAccessControl();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-80 w-full rounded-3xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-4 text-center">
        <h2 className="text-lg font-semibold">User not found</h2>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Link>
        </Button>
      </div>
    );
  }

  const recordId = String(user.id || user._id || userId);
  const isActive = user.isActive !== false;
  const canEdit = canEditUser(recordId) && isActive;
  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();

  const handleInlineUpdate = async (data: UpdateUserData) => {
    if (typeof data.isActive === "boolean" && Object.keys(data).length === 1) {
      if (data.isActive) {
        await activateUser.mutateAsync(recordId);
      } else {
        await deactivateUser.mutateAsync(recordId);
      }
      return;
    }
    await updateUser.mutateAsync({ id: recordId, data });
  };

  const handleRemoveRole = async () => {
    try {
      await updateUser.mutateAsync({
        id: recordId,
        data: { roleId: "" },
      });
    } catch {
      toast.error("Unable to remove role. Try Edit User instead.");
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <Link
        href="/users"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Users
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {fullName || "User"}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <Badge
              variant={isActive ? "default" : "secondary"}
              className={isActive ? "bg-primary" : undefined}
            >
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEditUser(recordId) && isActive ? (
            <Button asChild className="rounded-full">
              <Link href={`/users/edit/${userId}`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit User
              </Link>
            </Button>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl">
              <DropdownMenuItem asChild>
                <Link href={`/users/edit/${userId}`}>Open full edit</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/users">Back to list</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="border-b border-border/60">
        <nav className="flex gap-1" aria-label="User sections">
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
                "-mb-px border-b px-4 py-2.5 text-sm font-medium transition-colors",
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
        <UserDetailsTab
          user={user}
          userId={recordId}
          canEdit={canEdit}
          onUpdateField={handleInlineUpdate}
        />
      ) : (
        <UserRelatedTab
          user={user}
          userId={recordId}
          canEdit={canEdit}
          onRemoveRole={handleRemoveRole}
        />
      )}
    </div>
  );
}
