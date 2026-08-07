"use client";

import { useParams } from "next/navigation";
import { useSession } from "@/hooks/sessions/useSession";
import { useSessionMutations } from "@/hooks/sessions/useSessionMutations";
import { SessionDetailsTab } from "../components/SessionDetailsTab";
import type { UpdateSessionData } from "@/types/session.types";

export default function SessionDetailsPage() {
  const { id } = useParams();
  const sessionId = id as string;
  const { data: session } = useSession(sessionId);
  const { updateSession, updateSessionStatus } = useSessionMutations();

  if (!session) {
    return null;
  }

  const recordId = String(session.id || session._id || sessionId);
  const canEdit = session.isActive !== false;

  const handleInlineUpdate = async (data: UpdateSessionData) => {
    if (data.status && Object.keys(data).length === 1) {
      await updateSessionStatus.mutateAsync({
        id: recordId,
        status: data.status,
      });
      return;
    }
    await updateSession.mutateAsync({ id: recordId, data });
  };

  return (
    <SessionDetailsTab
      session={session}
      sessionId={recordId}
      canEdit={canEdit}
      onUpdateField={handleInlineUpdate}
    />
  );
}
