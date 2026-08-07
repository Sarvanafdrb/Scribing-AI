"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { ArrowLeft, Edit, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/hooks/sessions/useSession";
import { SessionStatusBadge } from "../components/SessionStatusBadge";
import { SessionDetailTabs } from "../components/SessionDetailTabs";
import type { Patient } from "@/types/patient.types";
import { getPatientFullName } from "@/utils/patient.utils";

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

  if (isPreviewPage) {
    return <>{children}</>;
  }

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

  if (!session) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-4 text-center">
        <h2 className="text-lg font-semibold">Consultation not found</h2>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/sessions">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sessions
          </Link>
        </Button>
      </div>
    );
  }

  const patient =
    typeof session.patientId === "object"
      ? (session.patientId as Patient)
      : null;
  const title =
    session.title?.trim() ||
    `${formatSessionType(session.sessionType)} Consultation`;

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <Link
        href="/sessions"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Sessions
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="font-mono text-sm text-muted-foreground">
              {session.sessionCode}
            </p>
            {patient ? (
              <p className="text-sm text-muted-foreground">
                · {getPatientFullName(patient)}
              </p>
            ) : null}
            <SessionStatusBadge status={session.status} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild className="rounded-full">
            <Link href={`/sessions/edit/${sessionId}`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Consultation
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/sessions/edit/${sessionId}`}>Open full edit</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/sessions/${sessionId}/recording`}>
                  Open recording
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/sessions/${sessionId}/transcript`}>
                  Open transcript
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/sessions/${sessionId}/notes`}>Open AI notes</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/sessions">Back to list</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <SessionDetailTabs sessionId={sessionId} />

      {children}
    </div>
  );
}
