import { useQuery } from "@tanstack/react-query";
import { medicineService } from "@/services/medicine.service";
import { medicineKeys } from "@/services/medicine.queries";

export const useMedicines = (filters: {
  organizationId?: string;
  search?: string;
  isActive?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}) => {
  const { enabled = true, ...params } = filters;
  return useQuery({
    queryKey: medicineKeys.list(params),
    queryFn: () => medicineService.getAll(params),
    enabled: enabled && Boolean(params.organizationId || true),
    staleTime: 30 * 1000,
  });
};

export const useMedicineSearch = (
  query: string,
  organizationId?: string,
  enabled = true,
) => {
  const trimmed = query.trim();
  return useQuery({
    queryKey: medicineKeys.search(trimmed, organizationId),
    queryFn: () => medicineService.search(trimmed, organizationId),
    enabled: enabled && trimmed.length >= 1,
    staleTime: 15 * 1000,
  });
};

export const useMedicine = (id: string) =>
  useQuery({
    queryKey: medicineKeys.detail(id),
    queryFn: () => medicineService.getById(id),
    enabled: Boolean(id),
  });
