"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/auth.store";
import type { AuthUser } from "@/types/auth.types";
import { resolveUploadUrl } from "@/utils/media-url.utils";
import { SettingsDetailsTab } from "./components/SettingsDetailsTab";
import { SettingsRelatedTab } from "./components/SettingsRelatedTab";
import { cn } from "@/lib/utils";

type SettingsTab = "details" | "related";

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user) as AuthUser | null;
  const [activeTab, setActiveTab] = useState<SettingsTab>("details");

  const fullName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
    : "Settings";
  const initials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase()
    : "U";
  const roleName = user?.roleName || user?.role?.name || "Account";
  const pictureUrl = resolveUploadUrl(user?.profilePicture);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar className="h-14 w-14 shrink-0">
            <AvatarImage src={pictureUrl} alt={fullName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {fullName || "Settings"}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="text-sm text-muted-foreground">
                {user?.email || "Manage your profile and security"}
              </p>
              <Badge variant="outline" className="rounded-full">
                {roleName}
              </Badge>
              {user?.isSuperAdmin ? (
                <Badge className="bg-primary">Super Admin</Badge>
              ) : null}
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-full">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">More actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {user?.id ? (
              <DropdownMenuItem asChild>
                <Link href={`/users/${user.id}`}>Open user record</Link>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem asChild>
              <Link href="/dashboard">Back to dashboard</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="border-b border-border/60">
        <nav className="flex gap-1" aria-label="Settings sections">
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
        <SettingsDetailsTab />
      ) : (
        <SettingsRelatedTab />
      )}
    </div>
  );
}
