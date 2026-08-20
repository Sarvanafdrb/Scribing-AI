"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { sessionService } from "@/services/session.service";
import { sessionKeys } from "@/services/session.queries";
import { useTenantScope } from "@/hooks/useTenantScope";
import { invalidateDoctorWorkspaceQueries } from "@/lib/invalidate-doctor-workspace";

export function useStartConsultation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, organizationId } = useTenantScope();
  const [isStarting, setIsStarting] = useState(false);

  const startConsultation = useCallback(
    async (patientId: string) => {
      const userId = String(user?._id || user?.id || "");
      if (!patientId || !userId || !organizationId) {
        throw new Error(
          "Unable to start consultation. Missing doctor or organization.",
        );
      }

      setIsStarting(true);
      try {
        const session = await sessionService.create({
          organizationId,
          patientId,
          userId,
          sessionType: "consultation",
        });

        const sessionId = String(session.id || session._id || "");
        if (!sessionId) {
          throw new Error("Consultation was created but no session ID was returned.");
        }

        await queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
        await queryClient.invalidateQueries({ queryKey: sessionKeys.stats() });
        invalidateDoctorWorkspaceQueries(queryClient);

        router.push(`/doctor/workspace/${sessionId}`);
        return session;
      } finally {
        setIsStarting(false);
      }
    },
    [organizationId, queryClient, router, user?._id, user?.id],
  );

  return { startConsultation, isStarting };
}
