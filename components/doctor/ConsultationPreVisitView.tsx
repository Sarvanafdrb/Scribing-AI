"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Play,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/hooks/sessions/useSession";
import { usePatient } from "@/hooks/patients/usePatients";
import {
  formatPatientDateOfBirth,
  getPatientAge,
  getPatientFullName,
  getHomeMedications,
} from "@/utils/patient.utils";
import { getDoctorWorkspaceHref } from "@/lib/doctor-consultation-navigation";
import { SessionVitalsSection } from "@/components/doctor/SessionVitalsSection";
import type { Patient } from "@/types/patient.types";
import type { PreviousHistoryItem } from "@/types/session.types";

interface ConsultationPreVisitViewProps {
  sessionId?: string;
  patientId?: string;
  appointmentReason?: string;
}

const formatVisitDate = (value?: string | null) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

const splitBullets = (text?: string) =>
  (text || "")
    .split(/\n+/)
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);

const buildWhatChanged = (
  history: PreviousHistoryItem[],
  patient: Patient | null,
) => {
  const bullets: string[] = [];
  const latest = history[0];

  if (latest?.aiNotes?.assessment?.trim()) {
    bullets.push(...splitBullets(latest.aiNotes.assessment).slice(0, 2));
  }
  if (latest?.aiNotes?.summary?.trim()) {
    bullets.push(latest.aiNotes.summary.trim());
  }
  if (patient?.allergies?.length) {
    bullets.push(
      `Allergies documented: ${patient.allergies.slice(0, 3).join(", ")}`,
    );
  }
  if (history.length > 0) {
    bullets.push(
      `${history.length} prior completed visit${history.length === 1 ? "" : "s"} on record`,
    );
  }
  if (!bullets.length) {
    bullets.push("No prior visit summary available for this patient yet.");
  }

  return bullets.slice(0, 4);
};

const buildSuggestedAgenda = (history: PreviousHistoryItem[]) => {
  const planItems = splitBullets(history[0]?.aiNotes?.plan);
  if (planItems.length) return planItems.slice(0, 3);
  return [
    "Confirm chief complaint",
    "Review home medications and allergies",
    "Update vitals before consultation",
  ];
};

const buildActiveProblems = (history: PreviousHistoryItem[]) => {
  const assessment = history[0]?.aiNotes?.assessment;
  const items = splitBullets(assessment);
  if (items.length) return items.slice(0, 4);
  return ["No active problems documented from prior visits."];
};

export function ConsultationPreVisitView({
  sessionId,
  patientId: patientIdProp,
  appointmentReason,
}: ConsultationPreVisitViewProps) {
  const router = useRouter();
  const { data: session, isLoading: sessionLoading } = useSession(
    sessionId || "",
  );

  const sessionPatient =
    session && typeof session.patientId === "object"
      ? (session.patientId as Patient)
      : null;
  const resolvedPatientId =
    patientIdProp ||
    String(sessionPatient?._id || sessionPatient?.id || "");

  const { data: fetchedPatient, isLoading: patientLoading } = usePatient(
    sessionPatient ? undefined : resolvedPatientId,
  );

  const patient = sessionPatient || fetchedPatient || null;
  const history = session?.previousHistory || [];
  const isLoading =
    (sessionId && sessionLoading) ||
    (!sessionPatient && patientIdProp && patientLoading);

  const workspaceHref = sessionId ? getDoctorWorkspaceHref(sessionId) : null;
  const fullName = getPatientFullName(patient) || "Patient";
  const age = getPatientAge(patient);
  const medications = getHomeMedications(patient);
  const allergies = patient?.allergies?.filter(Boolean) || [];
  const whatChanged = buildWhatChanged(history, patient);
  const suggestedAgenda = buildSuggestedAgenda(history);
  const activeProblems = buildActiveProblems(history);

  const metaParts = [
    age !== null ? `${age} y` : null,
    patient?.gender && patient.gender !== "unknown"
      ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)
      : null,
    patient?.patientCode,
  ].filter(Boolean);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="glass rounded-3xl p-8 text-center">
        <p className="text-muted-foreground">Patient details not found.</p>
        <Button asChild variant="outline" className="mt-4 rounded-full">
          <Link href="/doctor/consultations">Back to consultations</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <Button
          asChild
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-xl"
        >
          <Link href="/doctor/consultations" aria-label="Back to consultations">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {fullName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {metaParts.join(" · ")}
          </p>
        </div>
      </div>

      <section className="glass overflow-hidden rounded-3xl border border-primary/10">
        <div className="border-b border-primary/10 bg-primary/5 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-foreground">Pre-visit brief</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Built from {history.length} past visit
              {history.length === 1 ? "" : "s"}
              {appointmentReason ? ` · ${appointmentReason}` : ""}
            </p>
          </div>
        </div>
        <div className="grid gap-5 p-5 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              What changed since last visit
            </h3>
            <ul className="space-y-2 text-sm text-foreground">
              {whatChanged.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Suggested agenda
            </h3>
            <div className="flex flex-wrap gap-2">
              {suggestedAgenda.map((item) => (
                <Badge
                  key={item}
                  variant="secondary"
                  className="rounded-full bg-primary/10 text-primary"
                >
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[280px_1fr_300px]">
        <div className="space-y-4">
          <section className="glass rounded-3xl p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                {getInitials(patient.firstName, patient.lastName)}
              </div>
              <div>
                <p className="font-semibold text-foreground">{fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {metaParts.join(" · ")}
                </p>
              </div>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Phone</dt>
                <dd className="font-medium">{patient.phoneNumber || "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">DOB</dt>
                <dd className="font-medium">
                  {formatPatientDateOfBirth(patient.dateOfBirth)}
                </dd>
              </div>
              {session?.vitals?.weight ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Weight</dt>
                  <dd className="font-medium">{session.vitals.weight} kg</dd>
                </div>
              ) : null}
            </dl>
            {workspaceHref ? (
              <Button
                className="mt-5 w-full rounded-full"
                onClick={() => router.push(workspaceHref)}
              >
                <Play className="mr-2 h-4 w-4 fill-current" />
                Start consultation
              </Button>
            ) : null}
          </section>

          <section className="glass rounded-3xl p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Allergies
            </h3>
            {allergies.length ? (
              <ul className="space-y-1.5 text-sm">
                {allergies.map((allergy) => (
                  <li
                    key={allergy}
                    className="rounded-xl bg-destructive/5 px-3 py-2 text-destructive"
                  >
                    {allergy}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No allergies recorded.
              </p>
            )}
          </section>

          <section className="glass rounded-3xl p-5">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Active problems
            </h3>
            <ul className="space-y-2 text-sm">
              {activeProblems.map((problem) => (
                <li
                  key={problem}
                  className="rounded-xl border border-border/60 px-3 py-2"
                >
                  {problem}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="glass rounded-3xl p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              Visit history
            </h3>
            <Badge variant="secondary" className="rounded-full">
              {history.length} visit{history.length === 1 ? "" : "s"}
            </Badge>
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No completed visit history yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {history.map((visit) => (
                <li
                  key={visit.sessionId}
                  className="rounded-2xl border border-border/60 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {formatVisitDate(visit.completedAt)}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {visit.title || "Consultation"}
                      </p>
                      {visit.aiNotes?.summary ? (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {visit.aiNotes.summary}
                        </p>
                      ) : null}
                    </div>
                    <Badge className="shrink-0 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      Signed
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-4">
          <section className="glass rounded-3xl p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Current medication
              </h3>
              <Badge className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                {medications.length} active
              </Badge>
            </div>
            {medications.length ? (
              <ul className="space-y-2 text-sm">
                {medications.map((med) => (
                  <li
                    key={med}
                    className="rounded-xl border border-border/60 px-3 py-2"
                  >
                    <span className="font-medium text-destructive">Rx</span>{" "}
                    {med}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No home medications recorded.
              </p>
            )}
          </section>

          <SessionVitalsSection
            vitals={session?.vitals}
            title="Recent vitals"
          />
        </div>
      </div>
    </div>
  );
}

function getInitials(firstName?: string, lastName?: string) {
  const first = firstName?.charAt(0) || "";
  const last = lastName?.charAt(0) || "";
  return (first + last).toUpperCase() || "?";
}
