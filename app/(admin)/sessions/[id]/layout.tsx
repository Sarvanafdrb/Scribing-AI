"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/sessions/useSession";
import { SessionStatusBadge } from "../components/SessionStatusBadge";
import { SessionDetailTabs } from "../components/SessionDetailTabs";
import { healthcareGlass, healthcareSolid } from "@/lib/healthcare-ui";
import { cn } from "@/lib/utils";

const formatDateTime = (value?: string) => {
  if (!value) return "—";
  return new Date(value).toLocaleString();
};

const formatSessionType = (type: string) =>
  type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function SessionDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { id } = useParams();
  const pathname = usePathname();
  const sessionId = id as string;
  const isPreviewPage = pathname.endsWith("/preview");
  const { data: session, isLoading } = useSession(sessionId);

  if (isLoading && !isPreviewPage) {
    return <div className="animate-pulse p-6">Loading session...</div>;
  }

  if (!session && !isPreviewPage) {
    return <div className="p-6">Session not found</div>;
  }

  if (isPreviewPage) {
    return <>{children}</>;
  }

  if (!session) {
    return <div className="p-6">Session not found</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/sessions">
          <Button
            variant="ghost"
            className={cn("rounded-xl pl-0", healthcareGlass.button)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sessions
          </Button>
        </Link>
        {/* <Link href={`/sessions/${sessionId}/edit`}>
          <Button
            variant="outline"
            className={cn("rounded-xl", healthcareGlass.button)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </Link> */}
      </div>

      <div className={cn("p-6", healthcareSolid.section)}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-sm text-blue-600">
              {session.sessionCode}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">
              {formatSessionType(session.sessionType)} Session
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDateTime(session.createdAt)}
            </p>
          </div>
          <SessionStatusBadge status={session.status} />
        </div>
      </div>

      <SessionDetailTabs sessionId={sessionId} />

      {children}
    </div>
  );
}
