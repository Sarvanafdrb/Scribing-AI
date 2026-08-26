import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPrescriptionApiErrorMessage,
  isPrescriptionAlreadySignedError,
  prescriptionService,
} from "@/services/prescription.service";
import { prescriptionKeys } from "@/services/prescription.queries";
import type { Prescription, SignPrescriptionRequest } from "@/types/prescription.types";

export const usePrescriptionBilling = (sessionId: string) => {
  const queryClient = useQueryClient();

  const billingQuery = useQuery({
    queryKey: prescriptionKeys.billing(sessionId),
    queryFn: () => prescriptionService.getPrescriptionBilling(sessionId),
    enabled: Boolean(sessionId),
    retry: false,
  });

  const signMutation = useMutation({
    mutationFn: (data: SignPrescriptionRequest) =>
      prescriptionService.signPrescription(sessionId, data),
    onSuccess: (prescription) => {
      queryClient.setQueryData(
        prescriptionKeys.billing(sessionId),
        prescription,
      );
    },
  });

  const signOrLoadExisting = async (
    data: SignPrescriptionRequest,
  ): Promise<{ prescription: Prescription; loadedExisting: boolean }> => {
    try {
      const prescription = await signMutation.mutateAsync(data);
      return { prescription, loadedExisting: false };
    } catch (error) {
      if (!isPrescriptionAlreadySignedError(error)) {
        throw error;
      }

      const existing = await prescriptionService.getPrescriptionBilling(sessionId);
      if (!existing) {
        throw new Error(
          getPrescriptionApiErrorMessage(
            error,
            "A signed prescription exists but could not be loaded.",
          ),
        );
      }

      queryClient.setQueryData(prescriptionKeys.billing(sessionId), existing);
      return { prescription: existing, loadedExisting: true };
    }
  };

  return {
    billing: billingQuery.data ?? null,
    isBillingLoading: billingQuery.isLoading,
    signOrLoadExisting,
    isSigning: signMutation.isPending,
    refetchBilling: billingQuery.refetch,
  };
};
