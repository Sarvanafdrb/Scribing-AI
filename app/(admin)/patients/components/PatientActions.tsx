"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { usePatientMutations } from "@/hooks/patients/usePatientMutations";
import { useAccessControl } from "@/hooks/useAccessControl";
import { Patient } from "@/types/patient.types";
import { Edit, Eye, MoreHorizontal, Power } from "lucide-react";
import { healthcareGlass } from "@/lib/healthcare-ui";
import { cn } from "@/lib/utils";

interface PatientActionsProps {
  patient: Patient;
  onStatusChange?: () => void;
}

export function PatientActions({
  patient,
  onStatusChange,
}: PatientActionsProps) {
  const router = useRouter();
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const { activatePatient, deactivatePatient } = usePatientMutations();
  const { canEditPatient, canManagePatientStatus } = useAccessControl();

  const patientId = patient.id || patient._id || "";
  const isActive = patient.isActive !== false;
  const canEdit = canEditPatient();
  const canToggleStatus = canManagePatientStatus();

  if (!canEdit && !canToggleStatus) {
    return null;
  }

  const handleStatusToggle = async () => {
    try {
      if (isActive) {
        await deactivatePatient.mutateAsync(patientId);
      } else {
        await activatePatient.mutateAsync(patientId);
      }
      onStatusChange?.();
      setShowDeactivateDialog(false);
    } catch {
      // Toast handled in mutation hook
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 rounded-xl p-0", healthcareGlass.button)}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={healthcareGlass.dialog}>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href={`/patients/${patientId}`}>
              <Eye className="mr-2 h-4 w-4" />
              View
            </Link>
          </DropdownMenuItem>
          {canEdit && (
            <DropdownMenuItem
              disabled={!isActive}
              onClick={() => {
                if (isActive) router.push(`/patients/edit/${patientId}`);
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          )}
          {canToggleStatus && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  isActive ? setShowDeactivateDialog(true) : handleStatusToggle()
                }
              >
                <Power className="mr-2 h-4 w-4" />
                {isActive ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <DialogContent className={healthcareGlass.dialog}>
          <DialogHeader>
            <DialogTitle>Deactivate Patient</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate{" "}
              <strong>
                {patient.firstName} {patient.lastName}
              </strong>
              ? They will no longer appear in session scheduling.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setShowDeactivateDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              onClick={handleStatusToggle}
            >
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
