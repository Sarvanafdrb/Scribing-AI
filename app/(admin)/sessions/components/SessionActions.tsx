"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSessionMutations } from "@/hooks/sessions/useSessionMutations";
import { Session, SessionStatus } from "@/types/session.types";
import { Edit, Eye, FileText, Mic, MoreHorizontal, Trash2, Activity } from "lucide-react";
import { SESSION_STATUS_OPTIONS } from "./SessionStatusBadge";

interface SessionActionsProps {
  session: Session;
  onStatusChange?: () => void;
}

export function SessionActions({ session, onStatusChange }: SessionActionsProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { deleteSession, updateSessionStatus } = useSessionMutations();

  const sessionId = session.id || session._id || "";

  const handleDelete = async () => {
    try {
      await deleteSession.mutateAsync(sessionId);
      onStatusChange?.();
      setShowDeleteDialog(false);
    } catch {
      // Toast handled in hook
    }
  };

  const handleStatusUpdate = async (status: SessionStatus) => {
    try {
      await updateSessionStatus.mutateAsync({ id: sessionId, status });
      onStatusChange?.();
    } catch {
      // Toast handled in hook
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => router.push(`/recording?sessionId=${sessionId}`)}
          >
            <Mic className="mr-2 h-4 w-4" />
            Record
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push(`/transcript?sessionId=${sessionId}`)}
          >
            <FileText className="mr-2 h-4 w-4" />
            View Transcript
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push(`/sessions/${sessionId}`)}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push(`/sessions/${sessionId}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Activity className="mr-2 h-4 w-4" />
              Update Status
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {SESSION_STATUS_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => handleStatusUpdate(option.value)}
                  disabled={session.status === option.value}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{session.title}</strong>?
              This will deactivate the session.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
