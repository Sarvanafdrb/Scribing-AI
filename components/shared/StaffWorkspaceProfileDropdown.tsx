"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, KeyRound, LogOut, User } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import type { AuthUser } from "@/types/auth.types";
import { useAccessControl } from "@/hooks/useAccessControl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { resolveUploadUrl } from "@/utils/media-url.utils";
import { cn } from "@/lib/utils";

const getDisplayName = (user: AuthUser) =>
  `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User";

const getInitials = (user: AuthUser) =>
  `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || ""}`.toUpperCase() ||
  "U";

export function StaffWorkspaceProfileDropdown({ className }: { className?: string }) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { canEditAvailability } = useAccessControl();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const displayName = getDisplayName(user);
  const profilePicture = resolveUploadUrl(user.profilePicture);
  const roleLabel =
    user.roleName ||
    (typeof user.role === "object" && user.role?.name ? user.role.name : "Staff");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open profile menu"
          className={cn(
            "rounded-full outline-none ring-offset-2 transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary",
            className,
          )}
        >
          <Avatar className="h-8 w-8 border border-border bg-primary text-primary-foreground">
            {profilePicture ? (
              <AvatarImage src={profilePicture} alt={displayName} />
            ) : null}
            <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
              {getInitials(user)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-60 p-1.5">
        <DropdownMenuLabel className="px-2.5 py-2.5 font-normal">
          <p className="truncate text-sm font-semibold">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <p className="truncate text-xs font-medium text-primary">{roleLabel}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {canEditAvailability() ? (
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/my-availability">
              <CalendarClock className="h-4 w-4" />
              My Availability
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/settings">
            <User className="h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/settings">
            <KeyRound className="h-4 w-4" />
            Change Password
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={handleLogout}
          className="cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}