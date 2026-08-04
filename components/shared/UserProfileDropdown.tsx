"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut, User } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import type { AuthUser } from "@/types/auth.types";
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
  `Dr. ${user.firstName} ${user.lastName}`.trim();

const getInitials = (user: AuthUser) =>
  `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || ""}`.toUpperCase() ||
  "DR";

const getRoleLabel = (user: AuthUser) => {
  if (user.isSuperAdmin) return "Administrator";

  const role = user.roleName || user.role?.name || "";
  if (!role) return "User";

  return role
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

interface UserProfileDropdownProps {
  profileHref?: string;
  changePasswordHref?: string;
  className?: string;
  avatarClassName?: string;
}

export function UserProfileDropdown({
  profileHref = "/doctor/profile",
  changePasswordHref = "/doctor/change-password",
  className,
  avatarClassName,
}: UserProfileDropdownProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const displayName = getDisplayName(user);
  const roleLabel = getRoleLabel(user);
  const profilePicture = resolveUploadUrl(user.profilePicture);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open user menu"
          className={cn(
            "rounded-full outline-none ring-offset-2 transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-teal-500",
            className,
          )}
        >
          <Avatar
            className={cn(
              "h-8 w-8 border border-teal-700/20 bg-teal-600 text-white",
              avatarClassName,
            )}
          >
            {profilePicture ? (
              <AvatarImage src={profilePicture} alt={displayName} />
            ) : null}
            <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
              {getInitials(user)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="glass-strong w-64 rounded-2xl border-border/50 p-1.5"
      >
        <DropdownMenuLabel className="px-2.5 py-2.5 font-normal">
          <div className="space-y-0.5">
            <p className="truncate text-sm font-semibold text-foreground">
              {displayName}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            <p className="truncate text-xs font-medium text-primary">
              {roleLabel}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="my-1.5 bg-border" />

        <DropdownMenuItem
          asChild
          className="cursor-pointer rounded-xl px-2.5 py-2 text-foreground focus:bg-muted focus:text-foreground"
        >
          <Link href={profileHref}>
            <User className="h-4 w-4 text-muted-foreground" />
            My Profile
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem
          asChild
          className="cursor-pointer rounded-xl px-2.5 py-2 text-foreground focus:bg-muted focus:text-foreground"
        >
          <Link href={changePasswordHref}>
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            Change Password
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1.5 bg-border" />

        <DropdownMenuItem
          variant="destructive"
          onSelect={handleLogout}
          className="cursor-pointer rounded-lg px-2.5 py-2"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
