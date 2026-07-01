"use client";

import { useParams } from "next/navigation";
import { TranscriptViewer } from "@/components/transcript/TranscriptViewer";

export default function SessionTranscriptPage() {
  const { id } = useParams();
  const sessionId = id as string;

  return <TranscriptViewer sessionId={sessionId} embedded />;
}
