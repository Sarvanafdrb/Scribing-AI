"use client";

import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect, useState } from "react";
import { recordDiagEvent } from "@/hooks/recording/recordingFailureDiagnostics";
import { sessionKeys } from "@/services/session.queries";

/** Diagnostics-only: observe session / doctor-queue refetch + invalidation. */
function RecordingDiagQueryObserver() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const cache = queryClient.getQueryCache();
    const unsub = cache.subscribe((event) => {
      if (!event) return;

      const queryKey = event.query.queryKey;
      const keyStr = JSON.stringify(queryKey);
      const isSessionDetail =
        Array.isArray(queryKey) &&
        queryKey[0] === sessionKeys.all[0] &&
        queryKey[1] === "detail";
      const isDoctorQueue =
        Array.isArray(queryKey) &&
        queryKey.includes("doctor-queue");
      const isSessionRelated =
        Array.isArray(queryKey) && queryKey[0] === sessionKeys.all[0];

      if (!isSessionRelated) return;

      if (event.type === "updated") {
        const action = (
          event as {
            action?: { type?: string };
          }
        ).action;
        const actionType = action?.type;

        if (actionType === "invalidate") {
          recordDiagEvent("reactQuery.invalidate", {
            file: "app/providers/Providers.tsx",
            fn: "RecordingDiagQueryObserver",
            details: { queryKey, keyStr },
          });
        }

        if (actionType === "success" || actionType === "error") {
          if (isSessionDetail) {
            recordDiagEvent("reactQuery.session.refetch", {
              file: "app/providers/Providers.tsx",
              fn: "RecordingDiagQueryObserver",
              sessionStatus:
                (
                  event.query.state.data as
                    | { status?: string }
                    | undefined
                )?.status ?? null,
              details: {
                queryKey,
                actionType,
                fetchStatus: event.query.state.fetchStatus,
                status: event.query.state.status,
              },
            });
          }
          if (isDoctorQueue) {
            recordDiagEvent("reactQuery.doctorQueue.refetch", {
              file: "app/providers/Providers.tsx",
              fn: "RecordingDiagQueryObserver",
              details: {
                queryKey,
                actionType,
                fetchStatus: event.query.state.fetchStatus,
                status: event.query.state.status,
                sessionCount:
                  (
                    event.query.state.data as
                      | { sessions?: unknown[] }
                      | undefined
                  )?.sessions?.length ?? null,
              },
            });
          }
        }
      }
    });

    return unsub;
  }, [queryClient]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <RecordingDiagQueryObserver />
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
