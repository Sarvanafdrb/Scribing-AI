"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Invitation } from "@/types/invitation.types";
import { InvitationStatusBadge } from "./InvitationStatusBadge";
import { useInvitationMutations } from "@/hooks/invitations/useInvitationMutations";
import { Calendar, ChevronLeft, ChevronRight, Mail, RefreshCw, XCircle } from "lucide-react";

interface InvitationTableProps {
  invitations: Invitation[];
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function InvitationTable({
  invitations,
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: InvitationTableProps) {
  const { resendInvitation, revokeInvitation } = useInvitationMutations();
  const [resendTarget, setResendTarget] = useState<Invitation | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<Invitation | null>(null);

  const formatDate = (date?: string) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString();
  };

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const handleResend = async () => {
    if (!resendTarget) return;
    try {
      await resendInvitation.mutateAsync(resendTarget.id);
      setResendTarget(null);
    } catch {
      // Toast handled in mutation hook
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    try {
      await revokeInvitation.mutateAsync(revokeTarget.id);
      setRevokeTarget(null);
    } catch {
      // Toast handled in mutation hook
    }
  };

  const isResending = (id: string) =>
    resendInvitation.isPending && resendInvitation.variables === id;
  const isRevoking = (id: string) =>
    revokeInvitation.isPending && revokeInvitation.variables === id;

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold">Name</TableHead>
                <TableHead className="font-bold">Email</TableHead>
                <TableHead className="font-bold">Role</TableHead>
                <TableHead className="font-bold">Department</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="font-bold">Expires At</TableHead>
                <TableHead className="font-bold">Created At</TableHead>
                <TableHead className="text-right font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No invitations found
                  </TableCell>
                </TableRow>
              ) : (
                invitations.map((invitation) => {
                  const showActions = invitation.status === "PENDING";

                  return (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium">
                        {invitation.firstName} {invitation.lastName}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[200px]">
                            {invitation.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{invitation.roleName || "—"}</TableCell>
                      <TableCell>{invitation.departmentName || "—"}</TableCell>
                      <TableCell>
                        <InvitationStatusBadge status={invitation.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm whitespace-nowrap">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(invitation.expiresAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm whitespace-nowrap">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(invitation.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {showActions ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isResending(invitation.id) || isRevoking(invitation.id)}
                              onClick={() => setResendTarget(invitation)}
                            >
                              <RefreshCw
                                className={`mr-1 h-3.5 w-3.5 ${isResending(invitation.id) ? "animate-spin" : ""}`}
                              />
                              Resend
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              disabled={isResending(invitation.id) || isRevoking(invitation.id)}
                              onClick={() => setRevokeTarget(invitation)}
                            >
                              <XCircle className="mr-1 h-3.5 w-3.5" />
                              Revoke
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Showing {start}–{end} of {total} invitations
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm font-medium px-2">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={Boolean(resendTarget)} onOpenChange={(open) => !open && setResendTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resend invitation?</DialogTitle>
            <DialogDescription>
              The previous invitation link will no longer be valid. A new invitation
              will be sent to{" "}
              <strong>{resendTarget?.email}</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResendTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleResend}
              disabled={resendInvitation.isPending}
            >
              {resendInvitation.isPending ? "Sending..." : "Resend Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(revokeTarget)} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke invitation?</DialogTitle>
            <DialogDescription>
              This invitation will no longer be usable.{" "}
              <strong>
                {revokeTarget?.firstName} {revokeTarget?.lastName}
              </strong>{" "}
              will not be able to accept it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={revokeInvitation.isPending}
            >
              {revokeInvitation.isPending ? "Revoking..." : "Revoke Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
