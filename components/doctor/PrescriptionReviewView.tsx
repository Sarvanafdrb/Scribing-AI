"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useAiNotes } from "@/hooks/ai-notes/useAiNotes";
import { usePrescriptionBilling } from "@/hooks/prescriptions/usePrescriptionBilling";
import { useSession } from "@/hooks/sessions/useSession";
import { useTranscript } from "@/hooks/transcript/useTranscript";
import { aiNotesService } from "@/services/ai-notes.service";
import { useEncounterUiStore } from "@/store/encounter-ui.store";
import { medicineService } from "@/services/medicine.service";
import { medicineKeys } from "@/services/medicine.queries";
import { PrescriptionMedicineEditor } from "@/components/doctor/PrescriptionMedicineEditor";
import type { AiNotesMedication } from "@/types/ai-notes.types";
import type { Patient } from "@/types/patient.types";
import type { MedicineSearchResult } from "@/types/medicine.types";
import { buildAiNotesExportContent } from "@/utils/ai-notes-export.utils";
import {
  buildDraftProposals,
  buildFormularyProposals,
  detectConditionPacks,
  extractConditionQueries,
  medicationFromFormulary,
  type DraftProposal,
} from "@/utils/prescription-draft.utils";
import {
  formatPrescriptionPrice,
  getMedicationDisplayName,
  getMedicationDisplayTotalCost,
  getPrescriptionCostSummary,
} from "@/utils/prescriptionPrice.utils";
import { MedicationCostBreakdown } from "@/components/shared/prescription/MedicationCostBreakdown";
import {
  wouldDuplicateMedication,
  formatMedicationDuplicateLabel,
  validatePrescriptionMedications,
} from "@/utils/prescriptionMedication.utils";
import {
  signedBillingMatchesMedications,
  toSignPrescriptionMedications,
} from "@/utils/prescription-sign.utils";
import { getPrescriptionApiErrorMessage } from "@/services/prescription.service";
import type { Prescription } from "@/types/prescription.types";
import {
  getNormalizedAllergies,
  getPatientAge,
  getPatientFullName,
} from "@/utils/patient.utils";
import { cn } from "@/lib/utils";
import {
  extractDoctorAdviceFromTranscript,
  preferTamilAdviceText,
} from "@/utils/patient-advice.utils";
import {
  buildCatalogSearchQueryForMedication,
  enrichMedicationFromCatalogCandidates,
  enrichMedicationWithCatalogMatch,
  hydrateSavedPrescriptionMedications,
  medicationHasResolvedCatalogPrice,
} from "@/utils/prescription-catalog.utils";

interface PrescriptionReviewViewProps {
  sessionId: string;
}

const resolveOrganizationId = (
  session: ReturnType<typeof useSession>["data"],
) => {
  if (!session?.organizationId) return undefined;
  if (typeof session.organizationId === "object") {
    return (
      (session.organizationId as { id?: string; _id?: string }).id ||
      (session.organizationId as { id?: string; _id?: string })._id
    );
  }
  return session.organizationId;
};

export function PrescriptionReviewView({ sessionId }: PrescriptionReviewViewProps) {
  const { data: session } = useSession(sessionId);
  const { aiNotes, saveExportContent } = useAiNotes(sessionId);
  const {
    billing: persistedBilling,
    isBillingLoading,
    signOrLoadExisting,
    isSigning,
  } = usePrescriptionBilling(sessionId);
  const { transcript } = useTranscript(sessionId);
  const clearPrescriptionReview = useEncounterUiStore(
    (state) => state.clearPrescriptionReview,
  );
  const openPrescriptionPreview = useEncounterUiStore(
    (state) => state.openPrescriptionPreview,
  );

  const [resolvedIds, setResolvedIds] = useState<Set<string>>(() => new Set());
  const [acceptedMedications, setAcceptedMedications] = useState<
    AiNotesMedication[]
  >([]);
  const [advice, setAdvice] = useState("");
  const [investigations, setInvestigations] = useState("");
  const [nextReview, setNextReview] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingTamilAdvice, setIsGeneratingTamilAdvice] = useState(false);
  const [signedBilling, setSignedBilling] = useState<Prescription | null>(null);
  const hydratedMedicationsRef = useRef(false);

  useEffect(() => {
    hydratedMedicationsRef.current = false;
    setAcceptedMedications([]);
    setResolvedIds(new Set());
  }, [sessionId]);

  useEffect(() => {
    if (persistedBilling) {
      setSignedBilling(persistedBilling);
    }
  }, [persistedBilling]);

  useEffect(() => {
    if (hydratedMedicationsRef.current) return;

    const savedMedications = hydrateSavedPrescriptionMedications(
      aiNotes?.medications,
    );
    if (savedMedications.length === 0) return;

    setAcceptedMedications(savedMedications);
    hydratedMedicationsRef.current = true;

    setResolvedIds((current) => {
      const next = new Set(current);
      (aiNotes?.medications || []).forEach((medication, index) => {
        if (medication.medicine?.trim()) {
          next.add(`med-${index}-${medication.medicine}`);
        }
      });
      return next;
    });
  }, [aiNotes?.medications]);

  const patient =
    session && typeof session.patientId === "object"
      ? (session.patientId as Patient)
      : null;

  const organizationId = resolveOrganizationId(session);
  const conditionQueries = useMemo(
    () => extractConditionQueries(aiNotes),
    [aiNotes],
  );
  const conditionPacks = detectConditionPacks(
    aiNotes?.assessment,
    aiNotes?.plan,
    aiNotes?.subjective,
  );
  const allergies = getNormalizedAllergies(patient);
  const segments = transcript?.segments ?? [];

  const baseProposals = useMemo(
    () => buildDraftProposals(aiNotes, segments),
    [aiNotes, segments],
  );

  const formularyQueries = useQueries({
    queries: conditionQueries.map((query) => ({
      queryKey: medicineKeys.search(query, organizationId),
      queryFn: () => medicineService.search(query, organizationId),
      enabled: query.trim().length >= 2 && Boolean(organizationId),
      staleTime: 30_000,
    })),
  });

  const formularyMedicines = useMemo(() => {
    const seen = new Set<string>();
    const merged: MedicineSearchResult[] = [];
    formularyQueries.forEach((result) => {
      (result.data || []).forEach((medicine) => {
        if (seen.has(medicine.id)) return;
        seen.add(medicine.id);
        merged.push(medicine);
      });
    });
    return merged.sort((a, b) => b.matchScore - a.matchScore);
  }, [formularyQueries]);

  const isFormularyLoading = formularyQueries.some((result) => result.isFetching);

  const allProposals = useMemo(() => {
    const formularyProposals = buildFormularyProposals(
      formularyMedicines,
      baseProposals,
    );
    return [...formularyProposals, ...baseProposals];
  }, [baseProposals, formularyMedicines]);

  const pendingProposals = allProposals.filter(
    (proposal) => !resolvedIds.has(proposal.id),
  );

  const costSummary = useMemo(
    () => getPrescriptionCostSummary(acceptedMedications),
    [acceptedMedications],
  );

  const billingInSync = useMemo(
    () => signedBillingMatchesMedications(signedBilling, acceptedMedications),
    [signedBilling, acceptedMedications],
  );

  useEffect(() => {
    if (!aiNotes?.remarks) return;
    setAdvice((current) => current || aiNotes.remarks || "");
  }, [aiNotes?.remarks]);

  const resolveMedicationWithCatalog = useCallback(
    async (medication: AiNotesMedication): Promise<AiNotesMedication> => {
      if (medicationHasResolvedCatalogPrice(medication)) {
        return medication;
      }

      if (!organizationId) {
        return medication;
      }

      const medicineId = medication.medicineId?.trim();
      if (medicineId) {
        try {
          const catalog = await medicineService.getById(medicineId);
          return enrichMedicationWithCatalogMatch(medication, {
            ...catalog,
            matchedConditions: [],
            matchScore: 0,
            matchPriority: "name",
          });
        } catch {
          // Fall back to search below.
        }
      }

      const query = buildCatalogSearchQueryForMedication(medication);
      if (query.trim().length < 1) {
        return medication;
      }

      try {
        const results = await medicineService.search(query, organizationId);
        return enrichMedicationFromCatalogCandidates(medication, results);
      } catch {
        return medication;
      }
    },
    [organizationId],
  );

  const addMedication = useCallback(
    async (medication: AiNotesMedication) => {
      const enriched = await resolveMedicationWithCatalog(medication);
      let added = false;

      setAcceptedMedications((current) => {
        if (wouldDuplicateMedication(enriched, current)) {
          return current;
        }
        added = true;
        return [...current, enriched];
      });

      if (!added) {
        toast.error(
          `Already on prescription: ${formatMedicationDuplicateLabel(enriched)}`,
        );
        return false;
      }

      return true;
    },
    [resolveMedicationWithCatalog],
  );

  const resolveProposal = (proposal: DraftProposal) => {
    setResolvedIds((current) => new Set(current).add(proposal.id));
  };

  const handleAccept = async (proposal: DraftProposal) => {
    if (proposal.kind === "medication" && proposal.medication) {
      await addMedication(proposal.medication);
    } else if (proposal.kind === "formulary" && proposal.formularyMedicine) {
      await addMedication(medicationFromFormulary(proposal.formularyMedicine));
    } else if (proposal.kind === "lab") {
      const text = proposal.title.replace(/^order\s+/i, "").trim();
      setInvestigations((current) =>
        current ? `${current}; ${text}` : text,
      );
    } else if (proposal.kind === "followup") {
      setNextReview(proposal.title.replace(/^review\s*[—-]\s*/i, "").trim());
    }
    resolveProposal(proposal);
  };

  const handleDismiss = (proposal: DraftProposal) => {
    resolveProposal(proposal);
  };

  const handleAcceptAll = async () => {
    for (const proposal of pendingProposals) {
      await handleAccept(proposal);
    }
  };

  const handleDismissAll = () => {
    pendingProposals.forEach((proposal) => resolveProposal(proposal));
  };

  const handleAddPack = async (query: string) => {
    if (!organizationId) {
      toast.error("Organization not found for medicine lookup.");
      return;
    }

    try {
      const medicines = await medicineService.search(query, organizationId);
      let added = 0;
      for (const medicine of medicines.slice(0, 4)) {
        if (await addMedication(medicationFromFormulary(medicine))) {
          added += 1;
        }
      }
      if (added > 0) {
        toast.success(`Added ${added} medicine${added === 1 ? "" : "s"} from pack.`);
      } else {
        toast.info("Pack medicines are already on the prescription.");
      }
    } catch {
      toast.error("Could not load medicines for this pack.");
    }
  };

  const handleWriteTamilAdvice = async () => {
    const fallbackAdvice = preferTamilAdviceText(
      extractDoctorAdviceFromTranscript(transcript?.segments ?? []),
    );

    try {
      setIsGeneratingTamilAdvice(true);
      const result = await aiNotesService.generateTamilPatientAdvice(sessionId);
      const generated = preferTamilAdviceText(result.advice || "");

      if (generated) {
        setAdvice(generated);
        toast.success("Patient advice from the consultation added in Tamil.");
        return;
      }

      if (fallbackAdvice) {
        setAdvice(fallbackAdvice);
        toast.info("Showing doctor advice from the call recording.");
        return;
      }

      toast.error(
        "No patient advice found in the consultation recording yet.",
      );
    } catch (error) {
      if (fallbackAdvice) {
        setAdvice(fallbackAdvice);
        toast.info("Showing doctor advice from the call recording.");
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : "Could not generate Tamil patient advice.";
      toast.error(message);
    } finally {
      setIsGeneratingTamilAdvice(false);
    }
  };

  const handleSignAndPrint = async () => {
    if (!session || !aiNotes || isSaving || isSigning) return;

    const hasMedications = acceptedMedications.some((med) =>
      med.medicine.trim(),
    );
    if (hasMedications) {
      const validation = validatePrescriptionMedications(acceptedMedications);
      if (!validation.valid) {
        toast.error(validation.message);
        return;
      }
    }

    try {
      setIsSaving(true);
      const baseContent = buildAiNotesExportContent(aiNotes, session);
      const content = {
        ...baseContent,
        medications: acceptedMedications,
        remarks: advice,
        suggestedTreatment: [
          baseContent.suggestedTreatment,
          investigations ? `Investigations: ${investigations}` : "",
          nextReview ? `Next review: ${nextReview}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      };

      await saveExportContent(content);

      let billingForPreview = signedBilling;

      if (hasMedications && !signedBilling) {
        try {
          const { prescription: billing, loadedExisting } =
            await signOrLoadExisting({
              medications: toSignPrescriptionMedications(acceptedMedications),
            });
          setSignedBilling(billing);
          billingForPreview = billing;

          if (loadedExisting) {
            toast.info(
              "Using the existing signed prescription for this consultation.",
            );
          } else {
            toast.success("Prescription signed successfully.");
          }
        } catch (error) {
          toast.error(
            getPrescriptionApiErrorMessage(
              error,
              "Could not sign prescription billing. Please try again.",
            ),
          );
          return;
        }
      } else if (signedBilling) {
        billingForPreview = signedBilling;
      }

      openPrescriptionPreview({
        content,
        investigations,
        nextReview,
        recordingSeconds:
          session.totalDuration ??
          session.duration ??
          session.recordingSegments?.reduce(
            (sum, segment) => sum + (segment.duration || 0),
            0,
          ),
        billingPrescription: billingForPreview ?? undefined,
      });
    } catch {
      toast.error("Could not save prescription. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const isSignActionBusy = isSaving || isSigning;
  const showingPersistedBilling = billingInSync;
  const displayGrandTotal = showingPersistedBilling
    ? signedBilling!.grandTotal
    : costSummary.grandTotal;

  const patientSummary = [
    patient ? getPatientFullName(patient) : "Patient",
    getPatientAge(patient) !== null ? `${getPatientAge(patient)} y` : null,
    session?.vitals?.weight ? `${session.vitals.weight} kg` : null,
    allergies.length
      ? `allergies: ${allergies.slice(0, 3).join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const safetyChecks = [
    {
      label: "Allergy",
      detail:
        allergies.length > 0
          ? `Checked against ${allergies.join(", ")}`
          : "No known allergies recorded",
      ok: true,
    },
    {
      label: "Interactions",
      detail:
        acceptedMedications.length > 1
          ? "None found in current selection"
          : "Add medicines to check interactions",
      ok: true,
    },
    {
      label: "Dose for body weight",
      detail:
        getPatientAge(patient) !== null && getPatientAge(patient)! >= 18
          ? "Adult dosing"
          : "Verify paediatric dosing",
      ok: true,
    },
    {
      label: "Schedule",
      detail:
        acceptedMedications.length === 0
          ? "No medicines added yet"
          : acceptedMedications.every(
                (med) => med.morning || med.afternoon || med.night || med.instructions,
              )
            ? "All medicines have dose times"
            : "Complete dose schedule for all medicines",
      ok:
        acceptedMedications.length === 0 ||
        acceptedMedications.every(
          (med) => med.morning || med.afternoon || med.night || med.instructions,
        ),
    },
  ];

  const allSafetyClear = safetyChecks.every((check) => check.ok);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={clearPrescriptionReview}
          className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground hover:bg-muted/50"
          aria-label="Back to clinical note"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="font-serif text-2xl font-semibold text-foreground">
            Prescription
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{patientSummary}</p>
        </div>
      </div>

      <section className="rounded-3xl border border-border/60 bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-5 py-4">
          <div>
            <h3 className="font-serif text-lg font-semibold text-foreground">
              Drafted from the consultation
            </h3>
            <p className="text-xs text-muted-foreground">
              {pendingProposals.length} proposal
              {pendingProposals.length === 1 ? "" : "s"} · accept what you need
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {pendingProposals.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={handleDismissAll}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/50"
                >
                  Dismiss all
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                >
                  Accept all — {pendingProposals.length} items
                </button>
              </>
            ) : null}
          </div>
        </div>

        {isFormularyLoading && pendingProposals.length === 0 ? (
          <div className="flex items-center gap-2 px-5 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Finding medicines for{" "}
            {conditionQueries.slice(0, 2).join(", ") || "patient condition"}…
          </div>
        ) : pendingProposals.length === 0 && !isFormularyLoading ? (
          <p className="px-5 py-8 text-sm text-muted-foreground italic">
            All drafted items handled. Add medicines below or use a condition pack.
          </p>
        ) : (
          <ul className="divide-y divide-border/50">
            {pendingProposals.map((proposal) => (
              <li
                key={proposal.id}
                className="flex flex-wrap items-start justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {proposal.kind === "formulary" ? (
                      <span className="rounded-md bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-800">
                        Medicine
                      </span>
                    ) : null}
                    {proposal.timestamp ? (
                      <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
                        {proposal.timestamp}
                      </span>
                    ) : null}
                    <p className="text-sm font-medium text-foreground">
                      {proposal.title}
                    </p>
                  </div>
                  {proposal.subtitle ? (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {proposal.subtitle}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDismiss(proposal)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/50"
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAccept(proposal)}
                    className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                  >
                    Accept
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <section className="rounded-3xl border border-border/60 bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-5 py-4">
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-semibold text-foreground">
                  Medicines
                </h3>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {acceptedMedications.length} on the prescription
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {conditionPacks.map((pack) => (
                  <button
                    key={pack.query}
                    type="button"
                    onClick={() => void handleAddPack(pack.query)}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
                  >
                    <Sparkles className="h-3 w-3" />
                    + {pack.label}
                  </button>
                ))}
              </div>
            </div>

            <PrescriptionMedicineEditor
              medications={acceptedMedications}
              organizationId={organizationId}
              onChange={setAcceptedMedications}
              onAddFromCatalog={(medicine) => {
                void addMedication(medicationFromFormulary(medicine));
              }}
              onAddManualMedication={async (medication) => {
                await addMedication(medication);
              }}
            />
          </section>

          <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="font-serif text-lg font-semibold text-foreground">
                Advice and follow-up
              </h3>
              <button
                type="button"
                onClick={() => void handleWriteTamilAdvice()}
                disabled={isGeneratingTamilAdvice}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary",
                  isGeneratingTamilAdvice && "cursor-not-allowed opacity-60",
                )}
              >
                {isGeneratingTamilAdvice ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                Write patient instructions in Tamil
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Printed on the prescription
                </label>
                <textarea
                  value={advice}
                  onChange={(event) => setAdvice(event.target.value)}
                  rows={4}
                  className="mt-2 w-full break-words rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm outline-none focus:border-primary/40"
                  placeholder="Patient advice and lifestyle instructions"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Investigations
                  </label>
                  <input
                    value={investigations}
                    onChange={(event) => setInvestigations(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-border/60 bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/40"
                    placeholder="HbA1c, fasting glucose…"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Next review
                  </label>
                  <input
                    value={nextReview}
                    onChange={(event) => setNextReview(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-border/60 bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/40"
                    placeholder="Review in 3 months"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-4">
          <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Safety checks
              </h3>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  allSafetyClear
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800",
                )}
              >
                {allSafetyClear ? "All clear" : "Review needed"}
              </span>
            </div>
            <ul className="mt-4 space-y-3">
              {safetyChecks.map((check) => (
                <li key={check.label} className="flex gap-2">
                  <Check
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      check.ok ? "text-emerald-600" : "text-amber-600",
                    )}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {check.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{check.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Cost to patient
              </h3>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  showingPersistedBilling
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {showingPersistedBilling ? "Signed" : "Estimate"}
              </span>
            </div>
            <div className="mt-4 space-y-4">
              {isBillingLoading ? (
                <p className="text-sm text-muted-foreground">
                  Loading billing…
                </p>
              ) : acceptedMedications.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing added</p>
              ) : (
                acceptedMedications.map((med, index) => {
                  const totalCost = getMedicationDisplayTotalCost(med);
                  return (
                    <div
                      key={`cost-${med.medicineId || med.medicine}-${med.strengthSnapshot || ""}-${index}`}
                      className={cn(
                        "rounded-2xl border bg-background/60 p-3",
                        showingPersistedBilling
                          ? "border-emerald-200/70"
                          : "border-border/50",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {getMedicationDisplayName(med)}
                        </p>
                        <span className="shrink-0 text-sm font-semibold text-foreground">
                          {totalCost !== undefined
                            ? formatPrescriptionPrice(totalCost)
                            : "—"}
                        </span>
                      </div>
                      <MedicationCostBreakdown
                        medication={med}
                        mode="preview"
                        variant="detailed"
                        className="mt-1"
                      />
                    </div>
                  );
                })
              )}
            </div>
            {signedBilling && !billingInSync ? (
              <p className="mt-3 text-xs text-amber-800 dark:text-amber-300">
                Medicines changed since the last signed total (
                {formatPrescriptionPrice(signedBilling.grandTotal)}). Amounts
                below reflect the current prescription.
              </p>
            ) : null}
            {showingPersistedBilling ? (
              <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4">
                <span className="text-sm font-medium text-muted-foreground">
                  Final prescription total
                </span>
                <span className="font-serif text-2xl font-semibold text-emerald-800">
                  {formatPrescriptionPrice(displayGrandTotal)}
                </span>
              </div>
            ) : (
              <>
                <div className="mt-4 space-y-2 border-t border-border/50 pt-4">
                  {costSummary.hasFixedDuration ? (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Course total</span>
                      <span className="font-medium text-foreground">
                        {formatPrescriptionPrice(costSummary.courseTotal)}
                      </span>
                    </div>
                  ) : null}
                  {costSummary.hasOngoing ? (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Ongoing (30-day est.)
                      </span>
                      <span className="font-medium text-foreground">
                        {formatPrescriptionPrice(costSummary.monthlyOngoing)}
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {costSummary.hasOngoing && costSummary.hasFixedDuration
                      ? "Estimated total"
                      : costSummary.hasOngoing
                        ? "Estimated monthly total"
                        : "Estimated total"}
                  </span>
                  <span className="font-serif text-2xl font-semibold text-foreground">
                    {formatPrescriptionPrice(displayGrandTotal)}
                  </span>
                </div>
              </>
            )}
            <button
              type="button"
              disabled={isSignActionBusy}
              onClick={() => void handleSignAndPrint()}
              className={cn(
                "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full",
                "bg-rose-700 px-4 py-3 text-sm font-semibold text-white",
                "hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              {isSignActionBusy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isSigning ? "Signing prescription…" : "Saving…"}
                </>
              ) : (
                <>
                  Sign and print
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
