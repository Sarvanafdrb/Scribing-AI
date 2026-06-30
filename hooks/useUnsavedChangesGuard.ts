"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type PendingAction = {
  run: () => void;
};

export function useUnsavedChangesGuard(isDirty: boolean) {
  const router = useRouter();
  const pathname = usePathname();
  const [dialogOpen, setDialogOpen] = useState(false);
  const pendingActionRef = useRef<PendingAction | null>(null);
  const isDirtyRef = useRef(isDirty);

  isDirtyRef.current = isDirty;

  const runPendingAction = useCallback(() => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    action?.run();
  }, []);

  const confirmAction = useCallback((run: () => void) => {
    if (!isDirtyRef.current) {
      run();
      return;
    }

    pendingActionRef.current = { run };
    setDialogOpen(true);
  }, []);

  const handleStay = useCallback(() => {
    setDialogOpen(false);
    pendingActionRef.current = null;
  }, []);

  const handleDiscard = useCallback(() => {
    setDialogOpen(false);
    runPendingAction();
  }, [runPendingAction]);

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        handleStay();
        return;
      }
      setDialogOpen(true);
    },
    [handleStay],
  );

  useEffect(() => {
    if (!isDirty) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === "_blank") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }

      let nextPathname: string;
      try {
        nextPathname = new URL(anchor.href, window.location.origin).pathname;
      } catch {
        return;
      }

      if (nextPathname === pathname) return;

      event.preventDefault();
      event.stopPropagation();

      pendingActionRef.current = {
        run: () => router.push(href),
      };
      setDialogOpen(true);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [isDirty, pathname, router]);

  useEffect(() => {
    if (!isDirty) return;

    const onPopState = () => {
      window.history.pushState(null, "", window.location.href);
      pendingActionRef.current = {
        run: () => window.history.go(-1),
      };
      setDialogOpen(true);
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", onPopState);

    return () => window.removeEventListener("popstate", onPopState);
  }, [isDirty]);

  return {
    dialogOpen,
    confirmAction,
    handleStay,
    handleDiscard,
    handleDialogOpenChange,
  };
}
