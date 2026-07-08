"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SessionStatusBadge } from "@/app/(admin)/sessions/components/SessionStatusBadge";
import { TranscriptAudioSection } from "@/components/transcript/TranscriptAudioSection";
import { TranscriptMetadataPanel } from "@/components/transcript/TranscriptMetadataPanel";
import { TranscriptSegmentList } from "@/components/transcript/TranscriptSegmentList";
import { useTranscript } from "@/hooks/transcript/useTranscript";
import { useTranscriptMutations } from "@/hooks/transcript/useTranscriptMutations";
import { transcriptService } from "@/services/transcript.service";
import { TranscriptSegment } from "@/types/transcript.types";

interface TranscriptViewerProps {
  sessionId: string;
  embedded?: boolean;
}

export function TranscriptViewer({
  sessionId,
  embedded = false,
}: TranscriptViewerProps) {
  const { session, transcript, isLoading, isProcessing, refetch } =
    useTranscript(sessionId);
  const { generateTranscript, updateTranscript, translateTranscript } =
    useTranscriptMutations(sessionId);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [editingSegment, setEditingSegment] =
    useState<TranscriptSegment | null>(null);
  const [editValue, setEditValue] = useState("");
  const [fullTextDraft, setFullTextDraft] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState("en");

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground">Session not found</p>
          <Link href="/sessions" className="mt-4 inline-block">
            <Button variant="outline">Back to Sessions</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setActiveSegmentId(null);
      return;
    }

    setIsSearching(true);
    try {
      const results = await transcriptService.search(sessionId, searchQuery);
      if (results.length > 0) {
        setActiveSegmentId(results[0].segmentId);
      } else {
        toast.message("No matches found");
        setActiveSegmentId(null);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleEditStart = (segment: TranscriptSegment) => {
    setEditingSegment(segment);
    setEditValue(segment.text);
  };

  const handleEditSave = async () => {
    if (!editingSegment || !transcript) return;

    const updatedSegments = transcript.segments.map((segment) =>
      segment.id === editingSegment.id
        ? { ...segment, text: editValue }
        : segment,
    );

    await updateTranscript.mutateAsync({
      segments: updatedSegments,
      fullText: updatedSegments.map((segment) => segment.text).join(" "),
    });

    setEditingSegment(null);
    setEditValue("");
  };

  const handleSaveFullText = async () => {
    if (!transcript) return;

    await updateTranscript.mutateAsync({
      fullText: fullTextDraft || transcript.fullText,
    });
  };

  const handleGenerate = async () => {
    await generateTranscript.mutateAsync();
    await refetch();
  };

  const handleRetry = async () => {
    await generateTranscript.mutateAsync();
    await refetch();
  };

  const isFailed =
    session.status === "failed" || transcript?.metadata.status === "failed";
  const hasRecording = Boolean(session.audioPlaybackUrl || session.audioUrl);
  const canAutoGenerate =
    hasRecording &&
    !isProcessing &&
    !transcript?.segments?.length &&
    !transcript?.fullText &&
    session.status !== "completed";

  const handleTranslate = async () => {
    await translateTranscript.mutateAsync(targetLanguage);
    setShowTranslation(true);
  };

  const currentFullText = fullTextDraft || transcript?.fullText || "";

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href={`/sessions/${sessionId}`}>
              <Button variant="ghost" className="mb-2 pl-0">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Session
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">{session.title}</h1>
            <p className="text-muted-foreground">{session.sessionCode}</p>
          </div>
          <SessionStatusBadge status={session.status} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-6">
          <TranscriptAudioSection session={session} sessionId={sessionId} />

          <Card className="border-blue-100">
            <CardHeader>
              <CardTitle>Transcript</CardTitle>
              <CardDescription>
                Whisper-generated transcript with speaker labels, timestamps,
                and confidence scores
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="flex flex-1 gap-2">
                  <Input
                    placeholder="Search transcript..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleSearch();
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={handleSearch}
                    disabled={isSearching}
                  >
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {isFailed && (
                    <Button
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={handleRetry}
                      disabled={
                        !hasRecording ||
                        generateTranscript.isPending ||
                        isProcessing
                      }
                    >
                      {generateTranscript.isPending || isProcessing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Retry Transcript
                    </Button>
                  )}
                  {!isFailed && (
                    <Button
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={handleGenerate}
                      disabled={
                        !hasRecording ||
                        generateTranscript.isPending ||
                        isProcessing ||
                        session.status === "completed"
                      }
                    >
                      {generateTranscript.isPending || isProcessing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Wand2 className="mr-2 h-4 w-4" />
                      )}
                      {isProcessing ? "Processing..." : "Generate Transcript"}
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => refetch()}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </div>

              {isProcessing && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {session.status === "uploading"
                    ? "Uploading audio..."
                    : "Generating transcript..."}
                </div>
              )}

              {canAutoGenerate && !isProcessing && (
                <p className="text-sm text-muted-foreground">
                  Transcript generation will start automatically after recording
                  stops. You can also generate manually using the button above.
                </p>
              )}

              {transcript?.metadata.status === "failed" && (
                <p className="text-sm text-destructive">
                  Transcription failed:{" "}
                  {transcript.metadata.error || "Unknown error"}
                </p>
              )}

              {transcript && transcript.segments.length > 0 ? (
                <TranscriptSegmentList
                  segments={transcript.segments}
                  searchQuery={searchQuery}
                  activeSegmentId={activeSegmentId}
                  editingSegmentId={editingSegment?.id || null}
                  editValue={editValue}
                  onEditStart={handleEditStart}
                  onEditChange={setEditValue}
                  onEditSave={handleEditSave}
                  onEditCancel={() => {
                    setEditingSegment(null);
                    setEditValue("");
                  }}
                  showTranslation={showTranslation}
                />
              ) : transcript?.fullText ? (
                <div className="rounded-lg border bg-muted/30 p-4 text-sm whitespace-pre-wrap">
                  {transcript.fullText}
                </div>
              ) : (
                !isProcessing && (
                  <p className="text-sm text-muted-foreground">
                    Generate a transcript to see speaker segments and
                    timestamps.
                  </p>
                )
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Edit Full Transcript</CardTitle>
              <CardDescription>
                Manually update the complete transcript text
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                className="min-h-40 w-full rounded-md border p-3 text-sm"
                value={currentFullText}
                onChange={(event) => setFullTextDraft(event.target.value)}
                placeholder="Full transcript text..."
              />
              <Button
                onClick={handleSaveFullText}
                disabled={updateTranscript.isPending}
              >
                {updateTranscript.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Transcript
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {transcript && <TranscriptMetadataPanel transcript={transcript} />}

          <Card>
            <CardHeader>
              <CardTitle>Translation</CardTitle>
              <CardDescription>
                Optional translation for mixed-language sessions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Target language code (en, ta, hi...)"
                value={targetLanguage}
                onChange={(event) => setTargetLanguage(event.target.value)}
              />
              <Button
                variant="outline"
                onClick={handleTranslate}
                disabled={
                  !transcript?.segments.length || translateTranscript.isPending
                }
              >
                {translateTranscript.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Translate Transcript
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
