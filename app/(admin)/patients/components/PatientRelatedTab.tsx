"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Calendar,
  ExternalLink,
  FileText,
  Loader2,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LinkCell } from "@/components/shared/LinkCell";
import { sessionService } from "@/services/session.service";
import { sessionKeys } from "@/services/session.queries";
import type { Patient } from "@/types/patient.types";
import type { Session, SessionUser } from "@/types/session.types";
import { getPatientFullName } from "@/utils/patient.utils";

interface PatientRelatedTabProps {
  patient: Patient;
  patientId: string;
}

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "—";
  }
};

const formatStatus = (status?: string) => {
  if (!status) return "—";
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const getDoctorName = (session: Session) => {
  const doctor =
    typeof session.userId === "object"
      ? (session.userId as SessionUser)
      : null;
  if (!doctor) return "—";
  return (
    `${doctor.firstName || ""} ${doctor.lastName || ""}`.trim() ||
    doctor.email ||
    "—"
  );
};

const RelatedCard = ({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="glass rounded-2xl border border-border/60 p-4 sm:p-5 shadow-sm">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
    {children}
  </section>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
    {message}
  </div>
);

const LoadingState = () => (
  <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
    <Loader2 className="h-4 w-4 animate-spin" />
    Loading…
  </div>
);

export function PatientRelatedTab({
  patient,
  patientId,
}: PatientRelatedTabProps) {
  const org =
    typeof patient.organizationId === "object" ? patient.organizationId : null;
  const orgId = org?.id || org?._id || "";
  const orgName = org?.name || "—";

  const sessionsQuery = useQuery({
    queryKey: sessionKeys.list({ patientId, page: 1, limit: 50 }),
    queryFn: () =>
      sessionService.getAll({
        patientId,
        page: 1,
        limit: 50,
      }),
    staleTime: 30 * 1000,
  });

  const sessions = sessionsQuery.data?.sessions || [];
  const totalSessions = sessionsQuery.data?.total || sessions.length;

  const activityItems = useMemo(() => {
    const items: Array<{
      id: string;
      icon: React.ReactNode;
      title: string;
      description: string;
      when: string;
      at: number;
    }> = [];

    if (patient.createdAt) {
      items.push({
        id: "created",
        icon: <UserRound className="h-3.5 w-3.5" />,
        title: "Patient created",
        description: `${getPatientFullName(patient)} was added to the registry`,
        when: formatDateTime(patient.createdAt),
        at: new Date(patient.createdAt).getTime(),
      });
    }

    if (patient.updatedAt && patient.updatedAt !== patient.createdAt) {
      items.push({
        id: "updated",
        icon: <FileText className="h-3.5 w-3.5" />,
        title: "Patient updated",
        description: "Patient record details were updated",
        when: formatDateTime(patient.updatedAt),
        at: new Date(patient.updatedAt).getTime(),
      });
    }

    for (const session of sessions.slice(0, 8)) {
      const sessionId = String(session.id || session._id || "");
      const when =
        session.completedAt ||
        session.startedAt ||
        session.createdAt ||
        session.updatedAt;
      items.push({
        id: `session-${sessionId}`,
        icon: <Stethoscope className="h-3.5 w-3.5" />,
        title: session.title || "Consultation session",
        description: `${formatStatus(session.status)} · ${getDoctorName(session)}`,
        when: formatDateTime(when),
        at: when ? new Date(when).getTime() : 0,
      });
    }

    return items.sort((a, b) => b.at - a.at);
  }, [patient, sessions]);

  return (
    <div className="space-y-4">
      <RelatedCard
        title="Sessions"
        description={`${totalSessions} consultation session${totalSessions === 1 ? "" : "s"} linked to this patient`}
        action={
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href={`/sessions?patientId=${patientId}`}>
              View all
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        }
      >
        {sessionsQuery.isLoading ? (
          <LoadingState />
        ) : sessions.length === 0 ? (
          <EmptyState message="No sessions found for this patient." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => {
                  const sessionId = String(session.id || session._id || "");
                  return (
                    <TableRow key={sessionId}>
                      <TableCell>
                        <LinkCell href={`/sessions/${sessionId}`}>
                          {session.title || sessionId}
                        </LinkCell>
                      </TableCell>
                      <TableCell className="text-sm">
                        {getDoctorName(session)}
                      </TableCell>
                      <TableCell className="text-sm capitalize">
                        {(session.sessionType || "—").replace(/_/g, " ")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {formatStatus(session.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDateTime(
                          session.completedAt ||
                            session.startedAt ||
                            session.createdAt,
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </RelatedCard>

      <RelatedCard
        title="Organization Membership"
        description="Organization this patient belongs to"
      >
        {!orgId ? (
          <EmptyState message="No organization linked to this patient." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <LinkCell href={`/organizations/${orgId}`}>
                        {orgName}
                      </LinkCell>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {org?.organizationCode || "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="rounded-full"
                    >
                      <Link href={`/organizations/${orgId}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </RelatedCard>

      <RelatedCard
        title="Activity Timeline"
        description="Recent record and consultation activity"
      >
        {activityItems.length === 0 ? (
          <EmptyState message="No activity to show yet." />
        ) : (
          <ol className="relative space-y-4 border-l border-border/70 pl-5">
            {activityItems.map((item) => (
              <li key={item.id} className="relative">
                <span className="absolute -left-[1.55rem] flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-background text-muted-foreground">
                  {item.icon}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {item.title}
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {item.when}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </RelatedCard>
    </div>
  );
}
