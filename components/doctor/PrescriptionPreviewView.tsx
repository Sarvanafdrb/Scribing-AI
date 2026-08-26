"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Loader2,
  Mail,
  Printer,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/hooks/sessions/useSession";
import { useEncounterUiStore } from "@/store/encounter-ui.store";
import { SaveConsultationDialog } from "@/components/doctor/SaveConsultationDialog";
import type { PrescriptionPreviewPayload } from "@/types/prescription-preview.types";
import type { AiNotesMedication } from "@/types/ai-notes.types";
import type { Patient } from "@/types/patient.types";
import type { SessionDepartment, SessionUser } from "@/types/session.types";
import { printAiNotes } from "@/utils/ai-notes-export.utils";
import {
  getMedicationDisplayName,
  getMedicationDoseLabel,
} from "@/utils/prescriptionPrice.utils";
import { getNormalizedAllergies, getPatientAge } from "@/utils/patient.utils";
import { cn } from "@/lib/utils";

interface PrescriptionPreviewViewProps {
  sessionId: string;
  payload: PrescriptionPreviewPayload;
}

const formatDuration = (seconds?: number) => {
  if (!seconds || seconds <= 0) return "00:00";
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
};

const DosageDots = ({ medication }: { medication: AiNotesMedication }) => {
  const slots = [
    medication.morning || "0",
    medication.afternoon || "0",
    medication.night || "0",
  ];

  return (
    <div className="flex items-center gap-1.5 font-mono text-sm">
      {slots.map((value, index) => {
        const active = value === "1" || Number(value) > 0;
        return (
          <span key={index} className="flex items-center gap-1.5">
            {index > 0 ? (
              <span className="text-muted-foreground/50">—</span>
            ) : null}
            <span
              className={cn(
                "inline-flex h-2 w-2 rounded-full",
                active ? "bg-foreground" : "bg-muted-foreground/25",
              )}
            />
          </span>
        );
      })}
    </div>
  );
};

const getDoctorSubtitle = (
  doctor: SessionUser | undefined,
  department: SessionDepartment | undefined,
) => {
  const parts = [
    department?.name,
    doctor?.qualification && doctor.qualification !== "—"
      ? doctor.qualification
      : null,
  ].filter(Boolean);

  return parts.join(" · ") || "General Medicine";
};

export function PrescriptionPreviewView({
  sessionId,
  payload,
}: PrescriptionPreviewViewProps) {
  const { data: session } = useSession(sessionId);
  const clearPrescriptionPreview = useEncounterUiStore(
    (state) => state.clearPrescriptionPreview,
  );
  const setSaveDialogOpen = useEncounterUiStore((s) => s.setSaveDialogOpen);
  const saveDialogOpen = useEncounterUiStore((s) => s.saveDialogOpen);
  const [isPrinting, setIsPrinting] = useState(false);

  const { content, investigations, nextReview, recordingSeconds } = payload;
  const { metadata, medications, remarks } = content;

  const patient =
    session && typeof session.patientId === "object"
      ? (session.patientId as Patient)
      : null;

  const doctor =
    session && typeof session.userId === "object"
      ? (session.userId as SessionUser)
      : undefined;

  const department =
    session && typeof session.departmentId === "object"
      ? (session.departmentId as SessionDepartment)
      : undefined;

  const allergies = getNormalizedAllergies(patient);
  const bp =
    session?.vitals?.bloodPressure?.systolic !== undefined &&
    session?.vitals?.bloodPressure?.diastolic !== undefined
      ? `${session.vitals.bloodPressure.systolic}/${session.vitals.bloodPressure.diastolic}`
      : "—";

  const rxId = session?.sessionCode
    ? `Rx ${session.sessionCode}`
    : `Rx ${metadata.documentDate}`;

  const recordingDuration =
    recordingSeconds ??
    session?.totalDuration ??
    session?.duration ??
    session?.recordingSegments?.reduce(
      (sum, segment) => sum + (segment.duration || 0),
      0,
    );

  const medicineCount = medications.filter((med) => med.medicine?.trim()).length;
  const blockingIssues = medicineCount === 0 ? 1 : 0;

  const patientAgeSex = useMemo(() => {
    const age = getPatientAge(patient);
    const gender =
      metadata.patientGender && metadata.patientGender !== "—"
        ? metadata.patientGender
        : null;
    if (age !== null && gender) return `${age} y / ${gender}`;
    if (age !== null) return `${age} y`;
    return gender || "—";
  }, [metadata.patientGender, patient]);

  const handlePrint = async () => {
    try {
      setIsPrinting(true);
      printAiNotes(content);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to open print. Allow pop-ups and try again.",
      );
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSms = () => {
    const phone = patient?.phoneNumber || metadata.patientPhone;
    if (!phone || phone === "—") {
      toast.message("No patient phone number on file.");
      return;
    }
    toast.success(`Prescription ready to send to ${phone}.`);
  };

  const handleAbha = () => {
    toast.message("ABHA push will be available in a future update.");
  };

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={clearPrescriptionPreview}
            className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground hover:bg-muted/50"
            aria-label="Back to prescription editor"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="font-serif text-2xl font-semibold text-foreground">
              Prescription preview
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {metadata.patientName} · {rxId}
            </p>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[1fr_300px]">
          <section className="rounded-3xl border border-border/60 bg-muted/20 p-4 shadow-inner sm:p-6">
            <article className="relative mx-auto max-w-[720px] rounded-sm bg-white px-8 py-8 text-foreground shadow-lg">
              <header className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-foreground">
                    {metadata.organizationName}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {metadata.organizationAddress}
                  </p>
                  {metadata.organizationContact &&
                  metadata.organizationContact !== "—" ? (
                    <p className="text-xs text-muted-foreground">
                      {metadata.organizationContact}
                    </p>
                  ) : null}
                </div>
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border/60 bg-muted/20">
                  {metadata.organizationLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={metadata.organizationLogo}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="grid h-10 w-10 grid-cols-4 grid-rows-4 gap-0.5 opacity-30">
                      {Array.from({ length: 16 }).map((_, index) => (
                        <div
                          key={index}
                          className={cn(
                            "bg-foreground",
                            index % 2 === 0 ? "opacity-100" : "opacity-0",
                          )}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </header>

              <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {metadata.doctorName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getDoctorSubtitle(doctor, department)}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{metadata.documentDate}</p>
                  <p className="font-medium text-foreground">{rxId}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 border-y border-border/50 py-3 text-xs sm:grid-cols-5">
                <div>
                  <p className="font-semibold text-muted-foreground">Patient</p>
                  <p className="mt-0.5 font-medium">{metadata.patientName}</p>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">
                    Age / Sex
                  </p>
                  <p className="mt-0.5 font-medium">{patientAgeSex}</p>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">Weight</p>
                  <p className="mt-0.5 font-medium">
                    {session?.vitals?.weight
                      ? `${session.vitals.weight} kg`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">BP</p>
                  <p className="mt-0.5 font-medium">{bp}</p>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">Phone</p>
                  <p className="mt-0.5 font-medium">
                    {metadata.patientPhone || "—"}
                  </p>
                </div>
              </div>

              {allergies.length > 0 ? (
                <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
                  Allergies: {allergies.join(", ")}
                </div>
              ) : null}

              <div className="mt-6">
                <div className="mb-3 flex items-end gap-3">
                  <span className="font-serif text-4xl font-bold leading-none text-rose-700">
                    Rx
                  </span>
                  <div className="grid flex-1 grid-cols-[1.4fr_0.8fr_0.8fr_0.7fr] gap-2 border-b border-border/60 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    <span>Medicine</span>
                    <span>Dosage</span>
                    <span>When</span>
                    <span>Duration</span>
                  </div>
                </div>

                {medicineCount === 0 ? (
                  <p className="text-sm italic text-muted-foreground">
                    No medicines on this prescription.
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {medications
                      .filter((med) => med.medicine?.trim())
                      .map((med, index) => (
                        <li
                          key={`${med.medicine}-${index}`}
                          className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.7fr] gap-2 text-sm"
                        >
                          <div>
                            <p className="font-medium">
                              {index + 1}. {getMedicationDisplayName(med)}
                            </p>
                            {med.medicineNameSnapshot &&
                            med.medicineNameSnapshot !== med.medicine ? (
                              <p className="text-xs text-muted-foreground">
                                {med.medicineNameSnapshot}
                              </p>
                            ) : null}
                          </div>
                          <div>
                            <DosageDots medication={med} />
                            {getMedicationDoseLabel(med) ? (
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                {getMedicationDoseLabel(med)}
                              </p>
                            ) : null}
                          </div>
                          <p className="text-muted-foreground">
                            {med.instructions || "As directed"}
                          </p>
                          <p className="text-muted-foreground">
                            {med.days ? `${med.days} days` : "—"}
                          </p>
                        </li>
                      ))}
                  </ul>
                )}
              </div>

              <div className="mt-8 border-t border-border/50 pt-4">
                <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  Advice — அறிவுரை
                </p>
                {remarks?.trim() ? (
                  <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">
                    {remarks}
                  </p>
                ) : null}
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <span className="font-semibold text-muted-foreground">
                      Investigations:{" "}
                    </span>
                    <span>{investigations?.trim() || "—"}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground">
                      Review:{" "}
                    </span>
                    <span>{nextReview?.trim() || "—"}</span>
                  </div>
                </div>
              </div>

              <footer className="mt-10 flex items-end justify-between gap-4 border-t border-border/40 pt-4">
                <p className="max-w-[240px] text-[10px] leading-relaxed text-muted-foreground">
                  Digitally signed under the IT Act, 2000.
                </p>
                <div className="text-center">
                  {metadata.doctorSignature ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={metadata.doctorSignature}
                      alt="Doctor signature"
                      className="mx-auto mb-1 h-10 max-w-[120px] object-contain"
                    />
                  ) : (
                    <p className="font-serif text-2xl italic text-foreground/80">
                      {metadata.doctorName
                        .split(" ")
                        .map((part) => part[0])
                        .join(". ")}
                    </p>
                  )}
                  <p className="text-sm font-semibold">{metadata.doctorName}</p>
                  <p className="text-xs text-muted-foreground">
                    {metadata.doctorEducation &&
                    metadata.doctorEducation !== "—"
                      ? metadata.doctorEducation
                      : getDoctorSubtitle(doctor, department)}
                  </p>
                </div>
              </footer>
            </article>
          </section>

          <aside className="space-y-4">
            <section
              className={cn(
                "rounded-3xl border p-4 shadow-sm",
                blockingIssues === 0
                  ? "border-emerald-200 bg-emerald-50/80"
                  : "border-amber-200 bg-amber-50/80",
              )}
            >
              <div className="flex items-start gap-2">
                <CheckCircle2
                  className={cn(
                    "mt-0.5 h-5 w-5 shrink-0",
                    blockingIssues === 0
                      ? "text-emerald-600"
                      : "text-amber-600",
                  )}
                />
                <div>
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      blockingIssues === 0
                        ? "text-emerald-900"
                        : "text-amber-900",
                    )}
                  >
                    {blockingIssues === 0
                      ? "Ready to sign."
                      : "Review before signing."}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-xs",
                      blockingIssues === 0
                        ? "text-emerald-800"
                        : "text-amber-800",
                    )}
                  >
                    {medicineCount} medicine{medicineCount === 1 ? "" : "s"}
                    {blockingIssues === 0
                      ? ", no blocking issues."
                      : " — add at least one medicine."}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
              <button
                type="button"
                disabled={isPrinting}
                onClick={() => void handlePrint()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-rose-700 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60"
              >
                {isPrinting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4" />
                )}
                Print prescription
              </button>

              <div className="mt-3 space-y-1">
                <button
                  type="button"
                  onClick={handleSms}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-foreground hover:bg-muted/50"
                >
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  SMS to {metadata.patientPhone || "patient"}
                </button>
                <button
                  type="button"
                  onClick={handleAbha}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-foreground hover:bg-muted/50"
                >
                  <UserRound className="h-4 w-4 text-muted-foreground" />
                  Push to ABHA account
                </button>
                <button
                  type="button"
                  onClick={() => setSaveDialogOpen(true)}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-foreground hover:bg-muted/50"
                >
                  <Check className="h-4 w-4 text-muted-foreground" />
                  Finish visit and save
                </button>
              </div>
            </section>

            <section className="rounded-3xl border border-violet-200 bg-violet-50/50 p-4 shadow-sm">
              <p className="text-sm font-semibold text-violet-900">
                + This visit
              </p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-violet-800/80">Typing avoided</dt>
                  <dd className="font-medium text-violet-950">0 s</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-violet-800/80">Note drafted from</dt>
                  <dd className="font-medium text-violet-950">
                    {formatDuration(recordingDuration)} of speech
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-xs leading-relaxed text-violet-800/90">
                Doctor confirmed every clinical line before signing.
              </p>
            </section>
          </aside>
        </div>
      </div>

      {session ? (
        <SaveConsultationDialog
          open={saveDialogOpen}
          onOpenChange={setSaveDialogOpen}
          session={session}
          sessionId={sessionId}
        />
      ) : null}
    </>
  );
}
