"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth.store";
import { resolveAuthenticatedHomePath } from "@/utils/authRedirect";

interface AccessDeniedProps {
  title?: string;
  message?: string;
  showHomeLink?: boolean;
}

export function AccessDenied({
  title = "Access Denied",
  message = "You do not have permission to access this page.",
  showHomeLink = true,
}: AccessDeniedProps) {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const home = resolveAuthenticatedHomePath(user, token);

  return (
    <div className="glass mx-auto max-w-xl rounded-3xl p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldAlert className="h-6 w-6" />
      </div>
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      {showHomeLink && home ? (
        <Button asChild className="mt-6" variant="outline">
          <Link href={home}>Go to home</Link>
        </Button>
      ) : null}
    </div>
  );
}
