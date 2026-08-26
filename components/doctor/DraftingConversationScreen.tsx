"use client";



import { useEffect, useMemo, useState } from "react";

import { AlertCircle, RefreshCw, Sparkles } from "lucide-react";

import { toast } from "sonner";

import { useSession } from "@/hooks/sessions/useSession";

import { useAiNotes } from "@/hooks/ai-notes/useAiNotes";

import { useTranscript } from "@/hooks/transcript/useTranscript";

import { useTranscriptMutations } from "@/hooks/transcript/useTranscriptMutations";

import { useEncounterUiStore } from "@/store/encounter-ui.store";

import { sessionService } from "@/services/session.service";

import { aiNotesService } from "@/services/ai-notes.service";

import {

  getTranscriptAiError,

  getTranscriptPipelineError,

  isAiNotesContentReady,

  isReviewReady,

  isTranscriptAiUnavailable,

  isTranscriptAvailable,

  isTranscriptPipelineFailed,

} from "@/utils/session-status.utils";

import { cn } from "@/lib/utils";

import {

  formatGeminiErrorForUser,

  isGeminiQuotaError,

  isNonRetryableAiError,

} from "@/lib/gemini-error.utils";



interface DraftingConversationScreenProps {

  sessionId: string;

}



const getDraftingProgress = (

  status?: string,

  aiNotesStatus?: string,

  isGenerating = false,

  transcriptFailed = false,

): number => {

  if (isReviewReady(status)) return 100;

  if (transcriptFailed) return 0;



  if (status === "uploading") return 18;

  if (status === "processing") return 38;



  if (isTranscriptAvailable(status)) {

    if (isGenerating || aiNotesStatus === "processing") return 62;

    if (aiNotesStatus === "completed") return 88;

    return 52;

  }



  return 12;

};



const getStatusLines = (

  status?: string,

  aiNotesStatus?: string,

  isGenerating = false,

): [string, string] => {

  if (status === "uploading") {

    return [

      "Saving your recording securely",

      "Uploading audio to the consultation record",

    ];

  }

  if (status === "processing") {

    return [

      "Separating speakers · Pulling clinical facts",

      "Transcribing the full conversation",

    ];

  }

  if (isTranscriptAvailable(status)) {

    if (isGenerating || aiNotesStatus === "processing") {

      return [

        "Matching to the drug list · Checking allergies and doses",

        "Writing the note and the prescription",

      ];

    }

    return [

      "Finalising the clinical note",

      "Almost ready for your review",

    ];

  }

  return [

    "Separating speakers · Pulling clinical facts · Matching to the drug list",

    "Checking allergies and doses · Writing the note and the prescription",

  ];

};



export function DraftingConversationScreen({

  sessionId,

}: DraftingConversationScreenProps) {

  const { data: session, refetch } = useSession(sessionId);

  const { aiNotes, isGenerating, generate } = useAiNotes(sessionId);

  const { isProcessing: isTranscriptProcessing } = useTranscript(sessionId);

  const { generateTranscript } =
    useTranscriptMutations(sessionId);

  const startDraftingPipeline = useEncounterUiStore(

    (state) => state.startDraftingPipeline,

  );

  const endDraftingPipeline = useEncounterUiStore(

    (state) => state.endDraftingPipeline,

  );

  const [displayProgress, setDisplayProgress] = useState(8);

  const [isContinuingManually, setIsContinuingManually] = useState(false);



  const transcriptFailed = isTranscriptPipelineFailed(session);

  const transcriptAiUnavailable = isTranscriptAiUnavailable(session);

  const transcriptAiError = getTranscriptAiError(session);

  const rawTranscriptError =

    getTranscriptPipelineError(session) || aiNotes?.error || null;

  const transcriptError = formatGeminiErrorForUser(

    rawTranscriptError,

    transcriptAiError || aiNotes?.aiError,

  );

  const quotaError = isGeminiQuotaError(

    rawTranscriptError,

    transcriptAiError || aiNotes?.aiError,

  );

  const nonRetryableAiError = isNonRetryableAiError(

    rawTranscriptError,

    transcriptAiError || aiNotes?.aiError,

  );

  const notesReady = isAiNotesContentReady(aiNotes);

  const sessionReviewReady = isReviewReady(session?.status);



  const targetProgress = useMemo(

    () =>

      getDraftingProgress(

        session?.status,

        aiNotes?.status,

        isGenerating || isTranscriptProcessing,

        transcriptFailed,

      ),

    [

      session?.status,

      aiNotes?.status,

      isGenerating,

      isTranscriptProcessing,

      transcriptFailed,

    ],

  );



  const [lineOne, lineTwo] = getStatusLines(

    session?.status,

    aiNotes?.status,

    isGenerating || isTranscriptProcessing,

  );



  useEffect(() => {

    const timer = window.setInterval(() => {

      setDisplayProgress((current) => {

        if (current >= targetProgress) return current;

        return Math.min(targetProgress, current + 2);

      });

    }, 120);



    return () => window.clearInterval(timer);

  }, [targetProgress]);



  useEffect(() => {

    setDisplayProgress((current) => Math.max(current, targetProgress));

  }, [targetProgress]);



  useEffect(() => {

    if (transcriptFailed || aiNotes?.status !== "failed") return;

    if (!isTranscriptAvailable(session?.status)) return;

    if (nonRetryableAiError) return;

    generate(true);

  }, [

    aiNotes?.status,

    generate,

    nonRetryableAiError,

    session?.status,

    transcriptFailed,

  ]);



  const persistManualDraftFallback = async () => {
    await aiNotesService.update(sessionId, {
      summary: "Manual draft — AI generation unavailable.",
    });

    await sessionService.updateStatus(sessionId, "ready_for_review");

    await refetch();

    endDraftingPipeline();
  };

  if (notesReady || sessionReviewReady) {

    return null;

  }



  const handleRetryTranscript = async () => {

    if (nonRetryableAiError) return;

    startDraftingPipeline();

    await generateTranscript.mutateAsync();

  };



  const handleRetryNotes = () => {

    if (nonRetryableAiError) return;

    startDraftingPipeline();

    generate(true);

  };



  const handleContinueWithoutAi = async () => {

    setIsContinuingManually(true);

    try {

      await persistManualDraftFallback();

      toast.success("Opened manual note draft.");

    } catch (error: unknown) {

      const err = error as { response?: { data?: { message?: string } } };

      toast.error(

        err?.response?.data?.message ||

          "Could not continue without AI. Try again shortly.",

      );

    } finally {

      setIsContinuingManually(false);

    }

  };



  return (

    <section className="flex min-h-[520px] flex-1 items-center justify-center rounded-3xl border border-border/60 bg-card p-8 shadow-sm">

      <div className="w-full max-w-xl text-center">

        <div className="mx-auto mb-5 flex h-10 w-10 items-center justify-center">

          {transcriptFailed ? (

            <AlertCircle className="h-8 w-8 text-destructive" />

          ) : (

            <Sparkles className="h-8 w-8 text-primary" />

          )}

        </div>



        <h2 className="font-serif text-2xl font-semibold text-foreground">

          {transcriptFailed

            ? quotaError

              ? "Gemini AI limit reached"

              : "Drafting could not finish"

            : "Drafting from the conversation"}

        </h2>



        <div className="mt-3 space-y-1 text-sm text-muted-foreground">

          {transcriptFailed ? (

            <p>{transcriptError || "Transcript generation failed."}</p>

          ) : (

            <>

              <p>{lineOne}</p>

              <p>{lineTwo}</p>

            </>

          )}

        </div>



        {transcriptFailed ? (

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">

            {!nonRetryableAiError ? (

              <button

                type="button"

                onClick={() => void handleRetryTranscript()}

                disabled={

                  generateTranscript.isPending || isContinuingManually

                }

                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"

              >

                <RefreshCw

                  className={cn(

                    "h-4 w-4",

                    generateTranscript.isPending && "animate-spin",

                  )}

                />

                Retry transcript

              </button>

            ) : null}

            <button

              type="button"

              onClick={() => void handleContinueWithoutAi()}

              disabled={isContinuingManually || generateTranscript.isPending}

              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted/50 disabled:opacity-50"

            >

              {isContinuingManually

                ? "Saving…"

                : "Continue manually"}

            </button>

            {isTranscriptAvailable(session?.status) && !nonRetryableAiError ? (

              <button

                type="button"

                onClick={handleRetryNotes}

                disabled={isGenerating || isContinuingManually}

                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted/50 disabled:opacity-50"

              >

                Retry clinical note

              </button>

            ) : null}

          </div>

        ) : (

          <div className="mx-auto mt-8 max-w-md">

            <div className="h-2 overflow-hidden rounded-full bg-muted">

              <div

                className={cn(

                  "h-full rounded-full bg-primary transition-all duration-300 ease-out",

                )}

                style={{ width: `${Math.min(displayProgress, 100)}%` }}

              />

            </div>

          </div>

        )}

      </div>

    </section>

  );

}

