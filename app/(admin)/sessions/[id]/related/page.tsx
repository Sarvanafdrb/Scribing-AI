"use client";

import { useParams } from "next/navigation";
import { useSession } from "@/hooks/sessions/useSession";
import { SessionRelatedTab } from "../../components/SessionRelatedTab";

export default function SessionRelatedPage() {
  const { id } = useParams();
  const sessionId = id as string;
  const { data: session } = useSession(sessionId);

  if (!session) {
    return null;
  }

  const recordId = String(session.id || session._id || sessionId);

  return <SessionRelatedTab session={session} sessionId={recordId} />;
}
