import { useMutation, useQueryClient } from "@tanstack/react-query";
import { medicineService } from "@/services/medicine.service";
import { medicineKeys } from "@/services/medicine.queries";
import type {
  CreateMedicineData,
  UpdateMedicineData,
} from "@/types/medicine.types";
import { toast } from "sonner";

export const useMedicineMutations = () => {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: medicineKeys.all });
  };

  const createMedicine = useMutation({
    mutationFn: (data: CreateMedicineData) => medicineService.create(data),
    onSuccess: () => {
      invalidate();
      toast.success("Medicine added to organization formulary");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to create medicine");
    },
  });

  const updateMedicine = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMedicineData }) =>
      medicineService.update(id, data),
    onSuccess: () => {
      invalidate();
      toast.success("Medicine updated");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to update medicine");
    },
  });

  const deactivateMedicine = useMutation({
    mutationFn: (id: string) => medicineService.deactivate(id),
    onSuccess: () => {
      invalidate();
      toast.success("Medicine deactivated");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to deactivate medicine",
      );
    },
  });

  const activateMedicine = useMutation({
    mutationFn: (id: string) => medicineService.activate(id),
    onSuccess: () => {
      invalidate();
      toast.success("Medicine activated");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to activate medicine",
      );
    },
  });

  return {
    createMedicine,
    updateMedicine,
    deactivateMedicine,
    activateMedicine,
  };
};
