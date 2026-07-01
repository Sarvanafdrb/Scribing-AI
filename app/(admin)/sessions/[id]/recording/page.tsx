"use client";

import { useParams } from "next/navigation";
import { RecordingStudio } from "@/components/recording/RecordingStudio";

export default function SessionRecordingPage() {
  const { id } = useParams();
  const sessionId = id as string;

  return <RecordingStudio sessionId={sessionId} embedded />;
}
