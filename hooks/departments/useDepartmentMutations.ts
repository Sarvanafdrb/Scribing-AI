import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { departmentService } from "@/services/department.service";
import { departmentKeys } from "@/services/department.queries";
import { userKeys } from "@/services/user.queries";
import {
  CreateDepartmentData,
  UpdateDepartmentData,
} from "@/types/department.types";

export const useDepartmentMutations = () => {
  const queryClient = useQueryClient();

  const invalidateDepartmentQueries = (id?: string) => {
    queryClient.invalidateQueries({ queryKey: departmentKeys.all });
    queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    if (id) {
      queryClient.invalidateQueries({ queryKey: departmentKeys.detail(id) });
    }
  };

  const createDepartment = useMutation({
    mutationFn: (data: CreateDepartmentData) => departmentService.create(data),
    onSuccess: () => {
      invalidateDepartmentQueries();
      toast.success("Department created successfully");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to create department",
      );
    },
  });

  const updateDepartment = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDepartmentData }) =>
      departmentService.update(id, data),
    onSuccess: (_data, variables) => {
      invalidateDepartmentQueries(variables.id);
      toast.success("Department updated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to update department",
      );
    },
  });

  const deactivateDepartment = useMutation({
    mutationFn: (id: string) => departmentService.deactivate(id),
    onSuccess: (_data, id) => {
      invalidateDepartmentQueries(id);
      toast.success("Department deactivated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to deactivate department",
      );
    },
  });

  const activateDepartment = useMutation({
    mutationFn: (id: string) => departmentService.activate(id),
    onSuccess: (_data, id) => {
      invalidateDepartmentQueries(id);
      toast.success("Department activated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to activate department",
      );
    },
  });

  return {
    createDepartment,
    updateDepartment,
    deactivateDepartment,
    activateDepartment,
  };
};
