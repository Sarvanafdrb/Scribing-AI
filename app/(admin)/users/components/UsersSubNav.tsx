"use client";

import Link from "next/link";
import { useAccessControl } from "@/hooks/useAccessControl";
import { cn } from "@/lib/utils";

interface UsersSubNavProps {
  active: "users" | "invitations";
}

export function UsersSubNav({ active }: UsersSubNavProps) {
  const { canCreateUser } = useAccessControl();

  if (!canCreateUser()) {
    return null;
  }

  const linkClass = (tab: UsersSubNavProps["active"]) =>
    cn(
      "inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
      active === tab
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  return (
    <nav className="flex flex-wrap gap-2 border-b pb-3">
      <Link href="/users" className={linkClass("users")}>
        Users
      </Link>
      <Link href="/users/invitations" className={linkClass("invitations")}>
        Invitations
      </Link>
    </nav>
  );
}
